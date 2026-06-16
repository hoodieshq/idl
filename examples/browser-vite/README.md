# idl-example-browser-vite

`@solana/idl` in the browser via **Vite** — the bundler behind most Solana web apps.

```bash
pnpm --filter @solana/idl run build        # build the package (once, from repo root)
pnpm --filter idl-example-browser-vite run build   # vite build → dist/
pnpm --filter idl-example-browser-vite run serve   # http://localhost:8772
# or: pnpm --filter idl-example-browser-vite run dev
```

**Recipe** (see [`vite.config.ts`](./vite.config.ts)): `@solana/kit` ships a
browser build, so the only Node bits come from `@solana-program/program-metadata`'s
TOML/YAML parsers (`@iarna/toml` → `node:stream`), which IDLs never use:

- `resolve.alias` `@iarna/toml` (and `yaml`) → [`stub.js`](./stub.js).
- `define: { global: 'globalThis' }`.

This is plugin-free and mirrors the esbuild recipe.
[`vite-plugin-node-polyfills`](https://github.com/davidmyersdev/vite-plugin-node-polyfills)
also works if you prefer a general polyfill layer. See the
[`@solana/idl` README → Browser usage](../../packages/idl/README.md#browser-usage).
