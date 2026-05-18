/**
 * End-to-end equivalence test: the `idl <program> --current` CLI and the
 * library export `fetchCurrentIdlPreferPmp` MUST produce byte-identical
 * results for the same program against the same fixture bucket.
 *
 * Strategy:
 *   1. Hoist a `vi.mock` for `@solana/kit` that replaces `createSolanaRpc`
 *      with a fake RPC bound to the BUYux mainnet fixture bucket.
 *   2. Drive the CLI in-process via `runCli(...)` (added to src/cli.ts so
 *      tests don't need to spawn a subprocess), capturing stdout.
 *   3. Call the library entrypoint directly with a fresh fake RPC.
 *   4. Assert: parsed CLI JSON ≡ library result, and pin to a file snapshot
 *      so any future drift in the BUYux fixture surfaces loudly.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address } from '@solana/kit';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUYUX = 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya' as Address;
const BUCKET = path.resolve(HERE, '../fixtures', `${BUYUX}-mainnet-beta`);

vi.mock('@solana/kit', async () => {
    const actual =
        await vi.importActual<typeof import('@solana/kit')>('@solana/kit');
    const { makeFakeRpc } = await import('../fixtures/_helpers/fake-rpc.js');
    return {
        ...actual,
        createSolanaRpc: () => makeFakeRpc(BUCKET),
    };
});

type CapturedRun = { stdout: string; stderr: string; exitCode: number };

async function runCliCaptured(argv: string[]): Promise<CapturedRun> {
    const out: string[] = [];
    const err: string[] = [];
    let exitCode = 0;

    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
        out.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        err.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
    });
    const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(((code?: number) => {
            exitCode = code ?? 0;
            throw new Error(`__test_exit_${exitCode}`);
        }) as never);

    try {
        const { runCli } = await import('../../src/cli.js');
        await runCli(argv);
    } catch (e) {
        if (!(e instanceof Error) || !e.message.startsWith('__test_exit_')) {
            throw e;
        }
    } finally {
        logSpy.mockRestore();
        errSpy.mockRestore();
        exitSpy.mockRestore();
    }

    return { stdout: out.join('\n'), stderr: err.join('\n'), exitCode };
}

describe('CLI ↔ library equivalence on BUYux', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    describe('default (bare IDL)', () => {
        it('prints just the IDL body — no {programId, type, idl} wrapper', async () => {
            const { stdout, stderr, exitCode } = await runCliCaptured([
                BUYUX,
                '--rpc',
                'http://mocked.invalid/',
            ]);

            expect(exitCode).toBe(0);
            expect(stderr).toBe('');
            const parsed = JSON.parse(stdout) as Record<string, unknown>;
            // Bare IDL → real Anchor-shaped object (no wrapper keys).
            expect(parsed).not.toHaveProperty('programId');
            expect(parsed).not.toHaveProperty('type');
            expect(parsed).toHaveProperty('metadata');
            expect(parsed).toHaveProperty('instructions');
        });

        it('matches the .idl field of the library result byte-for-byte', async () => {
            const { fetchCurrentIdlPreferPmp } = await import('../../src/index.js');
            const { makeFakeRpc } = await import(
                '../fixtures/_helpers/fake-rpc.js'
            );

            const libResult = await fetchCurrentIdlPreferPmp(
                makeFakeRpc(BUCKET),
                BUYUX,
            );
            expect(libResult).not.toBeNull();

            const { stdout } = await runCliCaptured([
                BUYUX,
                '--rpc',
                'http://mocked.invalid/',
            ]);

            // For BUYux the IDL parses as JSON, so the CLI prints
            // JSON.stringify(libResult.idl, null, 2).
            expect(stdout).toBe(JSON.stringify(libResult!.idl, null, 2));
        });

        it('matches the pinned bare-IDL snapshot', async () => {
            const { stdout } = await runCliCaptured([
                BUYUX,
                '--rpc',
                'http://mocked.invalid/',
            ]);
            await expect(`${stdout}\n`).toMatchFileSnapshot(
                path.resolve(
                    HERE,
                    '../fixtures/__snapshots__/buyux-bare-idl.json',
                ),
            );
        });
    });

    describe('--latest (side-by-side with slot/time)', () => {
        it('CLI prints the {programId, pmpAddress, anchorAddress, pmp, anchor} payload', async () => {
            const { stdout, stderr, exitCode } = await runCliCaptured([
                BUYUX,
                '--latest',
                '--rpc',
                'http://mocked.invalid/',
            ]);

            expect(exitCode).toBe(0);
            expect(stderr).toBe('');
            const parsed = JSON.parse(stdout) as {
                programId: string;
                pmpAddress: string;
                anchorAddress: string;
                pmp: Array<{
                    type: string;
                    slot: string | null;
                    time: string | null;
                    activeFrom: { slot: string; time: string | null } | null;
                    activeTo: string;
                    content: string;
                    version: string | null;
                }>;
                anchor: typeof parsed.pmp;
            };
            expect(parsed.programId).toBe(BUYUX);
            expect(parsed.pmpAddress).toBeTypeOf('string');
            expect(parsed.anchorAddress).toBeTypeOf('string');
            expect(parsed.pmp).toHaveLength(1);
            expect(parsed.anchor).toHaveLength(1);
            expect(parsed.pmp[0]!.type).toBe('pmp');
            expect(parsed.anchor[0]!.type).toBe('anchor');
            expect(parsed.pmp[0]!.activeTo).toBe('current');
            // Slot/time were captured for both sources (lastWrite signature exists).
            expect(parsed.pmp[0]!.slot).not.toBeNull();
            expect(parsed.anchor[0]!.slot).not.toBeNull();
            // Parsed IDL version field (BUYux is at v0.1.0).
            expect(parsed.pmp[0]!.version).toBe('0.1.0');
            expect(parsed.anchor[0]!.version).toBe('0.1.0');
        });

        it('library returns the exact same JSON as the CLI', async () => {
            const { fetchLatestIdls } = await import('../../src/index.js');
            const { makeFakeRpc } = await import(
                '../fixtures/_helpers/fake-rpc.js'
            );

            const libResult = await fetchLatestIdls(
                makeFakeRpc(BUCKET),
                BUYUX,
            );

            const { stdout } = await runCliCaptured([
                BUYUX,
                '--latest',
                '--rpc',
                'http://mocked.invalid/',
            ]);

            expect(JSON.parse(stdout)).toEqual(libResult);
            expect(stdout).toBe(JSON.stringify(libResult, null, 2));
        });

        it('matches the pinned --latest snapshot', async () => {
            const { stdout } = await runCliCaptured([
                BUYUX,
                '--latest',
                '--rpc',
                'http://mocked.invalid/',
            ]);
            await expect(`${stdout}\n`).toMatchFileSnapshot(
                path.resolve(
                    HERE,
                    '../fixtures/__snapshots__/buyux-latest-idl.json',
                ),
            );
        });
    });

    describe('mode flag validation', () => {
        it('rejects --latest + --history', async () => {
            const { stderr, exitCode } = await runCliCaptured([
                BUYUX,
                '--latest',
                '--history',
                '--rpc',
                'mock://x',
            ]);
            expect(exitCode).toBe(1);
            expect(stderr).toContain('cannot be combined');
        });

        it('rejects --type without --history', async () => {
            const { stderr, exitCode } = await runCliCaptured([
                BUYUX,
                '--type',
                'pmp',
                '--rpc',
                'mock://x',
            ]);
            expect(exitCode).toBe(1);
            expect(stderr).toContain('--type is only valid with --history');
        });

        it('rejects --output without --history', async () => {
            const { stderr, exitCode } = await runCliCaptured([
                BUYUX,
                '--output',
                '/tmp/x',
                '--rpc',
                'mock://x',
            ]);
            expect(exitCode).toBe(1);
            expect(stderr).toContain('only valid with --history');
        });
    });

    it('default and --latest invocations are deterministic across runs', async () => {
        const a1 = await runCliCaptured([BUYUX, '--rpc', 'mock://x']);
        const a2 = await runCliCaptured([BUYUX, '--rpc', 'mock://x']);
        const b1 = await runCliCaptured([BUYUX, '--latest', '--rpc', 'mock://x']);
        const b2 = await runCliCaptured([BUYUX, '--latest', '--rpc', 'mock://x']);
        expect(a1.stdout).toBe(a2.stdout);
        expect(b1.stdout).toBe(b2.stdout);
    });
});
