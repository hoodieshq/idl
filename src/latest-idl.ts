import { findMetadataPda, type Seed } from '@solana-program/program-metadata';
/**
 * "Latest" view: PMP and Anchor IDLs surfaced side-by-side with their last
 * on-chain write slot and parsed version. This is the single source of truth
 * shared by `GET /api/latest` and the `idl <program> --latest` CLI mode.
 *
 * Resolution rules are the same as the lean {@link fetchCurrentIdlPreferPmp}:
 *   - PMP: canonical first, then non-canonical via `IDL_FALLBACK_PMP_AUTHORITY`.
 *   - Anchor: PDA derived from the program id.
 *
 * Cost vs. the lean path: one extra `getSignaturesForAddress(_, { limit: 1 })`
 * per present source (so 0–2 extra RPC calls).
 *
 * Design note — IDL is intentionally a **raw string** here, not parsed JSON.
 * This mode is built for indexers / diff tools / monitors that need byte-exact
 * preservation (hashing, change detection, stable storage). `JSON.parse` →
 * `JSON.stringify` does not guarantee a byte-for-byte round trip (whitespace,
 * key order, number formatting, escape style can all shift), so we keep what
 * was on chain. Callers that want a parsed view should use
 * {@link fetchCurrentIdlPreferPmp} (or the CLI's bare default mode).
 */
import type { Address } from '@solana/kit';

import { findAnchorIdlAddress } from './anchor.js';
import { fetchCurrentAnchorIdlString, type SolanaRpcClient } from './current-idl.js';
import { fetchPmpIdlContentResolved } from './pmp-idl.js';

export type IdlSource = 'pmp' | 'anchor';

export type LatestIdlVersion = {
    type: IdlSource;
    /** Parsed `version` (or `metadata.version`) from the IDL JSON, when present. */
    version: string | null;
    slot: string | null;
    /** `YYYY-MM-DD HH:MM:SS` (UTC). */
    time: string | null;
    activeFrom: { slot: string; time: string | null } | null;
    activeTo: 'current';
    /**
     * IDL content **exactly as stored on-chain** — a JSON string for Anchor and
     * for JSON-encoded PMP, opaque text for any other PMP encoding. Kept as a
     * raw string (not parsed) so hashes and diffs are byte-stable; see the
     * module-level "Design note" comment. To work with the parsed object, run
     * `JSON.parse(content)` or use the bare `idl <program>` CLI mode.
     */
    content: string;
};

export type LatestIdls = {
    programId: string;
    pmpAddress: string;
    anchorAddress: string;
    /** Either empty (no PMP IDL on-chain) or a single-element array. */
    pmp: LatestIdlVersion[];
    /** Either empty (no Anchor IDL on-chain) or a single-element array. */
    anchor: LatestIdlVersion[];
};

function extractVersion(content: string): string | null {
    try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const v = parsed['version'] ?? (parsed['metadata'] as Record<string, unknown> | undefined)?.['version'];
        if (typeof v === 'string') return v;
    } catch {
        /* not JSON */
    }
    return null;
}

function fmtTime(blockTime: bigint | number | null | undefined): string | null {
    if (blockTime === null || blockTime === undefined) return null;
    return new Date(Number(blockTime) * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

async function getLastWriteSlot(
    rpc: SolanaRpcClient,
    account: Address,
): Promise<{ slot: string; time: string | null } | null> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sigs = await (rpc as any).getSignaturesForAddress(account, { limit: 1 }).send();
        if (!sigs || sigs.length === 0) return null;
        return { slot: sigs[0].slot.toString(), time: fmtTime(sigs[0].blockTime) };
    } catch {
        return null;
    }
}

function buildVersion(
    type: IdlSource,
    content: string,
    lastWrite: { slot: string; time: string | null } | null,
): LatestIdlVersion {
    return {
        activeFrom: lastWrite ? { slot: lastWrite.slot, time: lastWrite.time } : null,
        activeTo: 'current',
        content,
        slot: lastWrite?.slot ?? null,
        time: lastWrite?.time ?? null,
        type,
        version: extractVersion(content),
    };
}

export async function fetchLatestIdls(
    rpc: SolanaRpcClient,
    programId: Address,
    options?: { seed?: Seed; authority?: Address | null },
): Promise<LatestIdls> {
    const seed: Seed = options?.seed ?? 'idl';

    const [canonicalPmpPda] = await findMetadataPda({
        authority: null,
        program: programId,
        seed,
    });
    const anchorAddr = await findAnchorIdlAddress(programId);

    const [pmpResolved, anchorContent] = await Promise.all([
        fetchPmpIdlContentResolved(rpc, programId, seed, options?.authority),
        fetchCurrentAnchorIdlString(rpc, programId),
    ]);

    const pmpMetadataAddress = pmpResolved?.metadataAddress ?? canonicalPmpPda;

    const [pmpLastWrite, anchorLastWrite] = await Promise.all([
        pmpResolved ? getLastWriteSlot(rpc, pmpMetadataAddress) : null,
        anchorContent ? getLastWriteSlot(rpc, anchorAddr) : null,
    ]);

    return {
        anchor: anchorContent ? [buildVersion('anchor', anchorContent, anchorLastWrite)] : [],
        anchorAddress: anchorAddr as string,
        pmp: pmpResolved ? [buildVersion('pmp', pmpResolved.content, pmpLastWrite)] : [],
        pmpAddress: pmpMetadataAddress as string,
        programId: programId as string,
    };
}
