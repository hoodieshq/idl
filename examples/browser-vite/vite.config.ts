import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// Recipe (Vite): @solana/kit ships a browser build, so the only Node bits to
// handle come from @solana-program/program-metadata's TOML/YAML parsers
// (@iarna/toml → node:stream), which IDLs never use. Alias them to an empty stub
// and define Node's `global`. This is plugin-free and mirrors the esbuild recipe.
// (vite-plugin-node-polyfills also works, but pulls in a heavier toolchain.)
const stub = fileURLToPath(new URL('./stub.js', import.meta.url));

export default defineConfig({
    base: './',
    define: { global: 'globalThis' },
    resolve: {
        alias: {
            '@iarna/toml': stub,
            yaml: stub,
        },
    },
});
