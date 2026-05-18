/**
 * BigInt + Uint8Array aware JSON (de)serialization used by the fixture
 * record/replay layer. Solana RPC responses include `bigint` slot/lamports
 * fields and raw byte arrays that would otherwise be lossy as JSON.
 */

import { Buffer } from 'node:buffer';

type EncodedBigInt = { __bigint: string };
type EncodedBytes = { __bytes_b64: string };

export function jsonReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') {
        return { __bigint: value.toString() } satisfies EncodedBigInt;
    }
    if (value instanceof Uint8Array) {
        return { __bytes_b64: Buffer.from(value).toString('base64') } satisfies EncodedBytes;
    }
    return value;
}

export function jsonReviver(_key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('__bigint' in value && typeof (value as EncodedBigInt).__bigint === 'string') {
            return BigInt((value as EncodedBigInt).__bigint);
        }
        if (
            '__bytes_b64' in value &&
            typeof (value as EncodedBytes).__bytes_b64 === 'string'
        ) {
            return new Uint8Array(Buffer.from((value as EncodedBytes).__bytes_b64, 'base64'));
        }
    }
    return value;
}

export function stringifyFixture(value: unknown): string {
    return JSON.stringify(value, jsonReplacer, 2);
}

export function parseFixture<T = unknown>(json: string): T {
    return JSON.parse(json, jsonReviver) as T;
}
