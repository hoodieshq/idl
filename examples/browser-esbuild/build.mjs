import { copyFileSync, mkdirSync } from 'node:fs';

import { build } from 'esbuild';

// Recipe (esbuild — no auto-polyfill, the strict case):
//   1. alias the unused TOML/YAML parsers to an empty stub so node:stream is
//      never pulled in (otherwise esbuild errors: Could not resolve "stream"),
//   2. define Node's `global` as `globalThis`.
// With those two, @solana/idl bundles for the browser with no node:* and no
// runtime shims.
await build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: 'dist/main.js',
    define: { global: 'globalThis' },
    alias: { '@iarna/toml': './stub.js', yaml: './stub.js' },
    logLevel: 'info',
});

mkdirSync('dist', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
console.log('built dist/main.js + dist/index.html');
