/**
 * Proxy-based fake RPC that replays previously recorded responses from disk.
 *
 * The fake matches `@solana/kit`'s `Rpc<SolanaRpcApi>` calling convention:
 * every method returns a `PendingRpcRequest`-shaped object with a `.send()`
 * coroutine. Lookups are keyed by a stable hash of `method + args`, so any
 * RPC method works as long as a fixture exists.
 */

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type { Rpc, SolanaRpcApi } from '@solana/kit';

import { jsonReplacer, parseFixture } from './serialize.js';

export function fixtureKey(method: string, args: readonly unknown[]): string {
    const json = JSON.stringify(args, jsonReplacer);
    return createHash('sha256').update(`${method}::${json}`).digest('hex').slice(0, 16);
}

export function fixtureFile(bucket: string, method: string, key: string): string {
    return path.join(bucket, `${method}--${key}.json`);
}

export type FakeRpcStats = {
    readonly calls: ReadonlyArray<{ method: string; args: unknown[] }>;
};

export type FakeRpc = Rpc<SolanaRpcApi> & { __stats(): FakeRpcStats };

/**
 * Build a fake `Rpc<SolanaRpcApi>` that resolves every `.send()` from a
 * fixture file under `bucket`. Throws a descriptive error if a fixture
 * is missing — that signals the recording step didn't cover this call.
 */
export function makeFakeRpc(bucket: string): FakeRpc {
    if (!existsSync(bucket)) {
        throw new Error(
            `[fake-rpc] fixture bucket does not exist: ${bucket}\n` +
                `Run \`npm run record:fixtures\` to generate fixtures first.`,
        );
    }

    const calls: Array<{ method: string; args: unknown[] }> = [];

    const handler: ProxyHandler<object> = {
        get(_target, prop) {
            if (prop === '__stats') {
                return (): FakeRpcStats => ({ calls });
            }
            if (typeof prop !== 'string') return undefined;
            const method = prop;
            return (...args: unknown[]) => ({
                async send() {
                    calls.push({ method, args });
                    const key = fixtureKey(method, args);
                    const file = fixtureFile(bucket, method, key);
                    if (!existsSync(file)) {
                        const sample = readdirSync(bucket)
                            .filter((name) => name.startsWith(`${method}--`))
                            .slice(0, 3);
                        throw new Error(
                            `[fake-rpc] missing fixture for ${method}\n` +
                                `args: ${JSON.stringify(args, jsonReplacer).slice(0, 400)}\n` +
                                `expected file: ${file}\n` +
                                `nearby ${method} fixtures: ${sample.join(', ') || '(none)'}`,
                        );
                    }
                    return parseFixture(readFileSync(file, 'utf8'));
                },
            });
        },
    };

    return new Proxy({}, handler) as FakeRpc;
}
