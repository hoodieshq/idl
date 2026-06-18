/**
 * Isomorphic decompression backed by the WHATWG Compression Streams API
 * (`DecompressionStream`), available in Node >= 18, modern browsers, and Bun.
 *
 * Using this instead of `node:zlib` is what keeps the importable surface of the
 * package (everything reachable from `index.ts`) free of Node-only built-ins,
 * so `@solana/idl` bundles and runs in the browser. The CLI (`cli.ts`) is
 * Node-only and not re-exported, so it keeps using `node:*` directly.
 */

/**
 * Inflate zlib-wrapped data (RFC 1950 — the format produced by `node:zlib`'s
 * `deflate`/`deflateSync` and stored in Anchor's on-chain `IdlAccount`
 * payload). The DecompressionStream `'deflate'` format is zlib (header +
 * Adler-32 checksum); `'deflate-raw'` would be the headerless RFC 1951 stream.
 *
 * Rejects on malformed input, preserving the throw-on-bad-bytes contract that
 * the existing decoders already wrap in `try/catch`.
 */
export async function inflate(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
    const decompressed = await new Response(stream).arrayBuffer();
    return new Uint8Array(decompressed);
}
