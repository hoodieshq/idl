import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import type { Address } from '@solana/kit';

import {
    fetchCurrentAnchorIdlString,
    fetchCurrentIdlPreferPmp,
} from '../../src/current-idl.js';
import {
    IDL_FALLBACK_PMP_AUTHORITY,
    fetchPmpIdlContentResolved,
} from '../../src/pmp-idl.js';

import { makeFakeRpc } from '../fixtures/_helpers/fake-rpc.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const BUYUX = 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya' as Address;
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address;

const fixturesDir = (slug: string): string =>
    path.resolve(HERE, '../fixtures', slug);

describe('fetchCurrentIdlPreferPmp', () => {
    it('returns the canonical PMP IDL for BUYux on mainnet', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${BUYUX}-mainnet-beta`));

        const result = await fetchCurrentIdlPreferPmp(rpc, BUYUX);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('pmp');
        expect(result!.programId).toBe(BUYUX);
        expect(typeof result!.idl).toBe('object');
        expect(result!.idl).not.toBeNull();
    });

    it('falls back to the fndn authority for TokenkegQ on devnet', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${TOKEN}-devnet`));

        const result = await fetchCurrentIdlPreferPmp(rpc, TOKEN);

        expect(result).not.toBeNull();
        expect(result!.type).toBe('pmp');
        expect(result!.programId).toBe(TOKEN);
        // Parsed JSON object or a non-empty raw string is acceptable.
        const idl = result!.idl;
        expect(idl === null).toBe(false);
        if (typeof idl === 'string') {
            expect(idl.length).toBeGreaterThan(0);
        } else {
            expect(typeof idl).toBe('object');
        }
    });
});

describe('fetchPmpIdlContentResolved', () => {
    it('resolves canonical PMP without consulting the fndn fallback for BUYux', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${BUYUX}-mainnet-beta`));

        const resolved = await fetchPmpIdlContentResolved(rpc, BUYUX, 'idl');

        expect(resolved).not.toBeNull();
        expect(resolved!.authority).toBeNull();
        expect(resolved!.content.length).toBeGreaterThan(0);
    });

    it('resolves PMP via the fndn fallback authority for TokenkegQ', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${TOKEN}-devnet`));

        const resolved = await fetchPmpIdlContentResolved(rpc, TOKEN, 'idl');

        expect(resolved).not.toBeNull();
        expect(resolved!.authority).toBe(IDL_FALLBACK_PMP_AUTHORITY);
        expect(resolved!.content.length).toBeGreaterThan(0);
    });
});

describe('fetchCurrentAnchorIdlString', () => {
    it('returns valid JSON for BUYux on mainnet', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${BUYUX}-mainnet-beta`));

        const content = await fetchCurrentAnchorIdlString(rpc, BUYUX);

        expect(content).not.toBeNull();
        expect(typeof content).toBe('string');
        expect(() => JSON.parse(content as string)).not.toThrow();
        const parsed = JSON.parse(content as string) as Record<string, unknown>;
        expect(parsed).toBeTypeOf('object');
    });

    it('returns null when no Anchor IDL is published (Token on devnet)', async () => {
        const rpc = makeFakeRpc(fixturesDir(`${TOKEN}-devnet`));

        const content = await fetchCurrentAnchorIdlString(rpc, TOKEN);

        expect(content).toBeNull();
    });
});
