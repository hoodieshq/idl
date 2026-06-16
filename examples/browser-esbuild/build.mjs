import { copyFileSync, mkdirSync } from 'node:fs';

import { build } from 'esbuild';

// Recipe (esbuild — no auto-polyfill, the strict case):
//   1. alias the unused TOML/YAML parsers to an empty stub so node:stream is
//      never pulled in (otherwise esbuild errors: Could not resolve "stream"),
//   2. define Node's `global` as `globalThis`.
// With those two, @solana/idl bundles for the browser with no node:* and no
// runtime shims.
await build({
    alias: { '@iarna/toml': './stub.js', yaml: './stub.js' },
    bundle: true,
    define: { global: 'globalThis' },
    entryPoints: ['src/main.ts'],
    format: 'esm',
    logLevel: 'info',
    outfile: 'dist/main.js',
    platform: 'browser',
});

mkdirSync('dist', { recursive: true });
copyFileSync('index.html', 'dist/index.html');
console.log('built dist/main.js + dist/index.html');
