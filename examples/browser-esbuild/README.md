# idl-example-browser-esbuild

`@solana/idl` in the browser via **esbuild** — the strict case (esbuild does not
auto-polyfill Node builtins, so it surfaces the dependency issue directly).

```bash
pnpm --filter @solana/idl run build          # build the package (once, from repo root)
pnpm --filter idl-example-browser-esbuild run build  # node build.mjs
pnpm --filter idl-example-browser-esbuild run serve  # http://localhost:8771
```

**Recipe** (see [`build.mjs`](./build.mjs)):

- `alias` `@iarna/toml` (and `yaml`) → [`stub.js`](./stub.js) — these parse
  TOML/YAML metadata formats that IDLs never use, but their static imports pull
  in `node:stream`. Stubbing them keeps the bundle node-free. Without this,
  esbuild fails with `Could not resolve "stream"`.
- `define: { global: 'globalThis' }`.

See the [`@solana/idl` README → Browser usage](../../packages/idl/README.md#browser-usage).
