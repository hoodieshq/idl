# examples

Per-bundler examples that consume `@solana/idl` in the browser. Each is a pnpm
workspace member (`@solana/idl` via `workspace:*`), so the set doubles as an
isomorphism regression guard — a `node:*` regression in `packages/idl/src` breaks
these builds. Every example runs the same self-test (`src/main.ts`): derive the
Anchor/PMP PDAs via the package's pure WebCrypto path (no network) and assert they
match Node. **All four verified PASS in a real browser.**

| Example                                 | Bundler   | Browser recipe                                                                |
| --------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| [`browser-bun`](./browser-bun)          | bun       | define `global` (HTML shim); `Buffer` auto-polyfilled                         |
| [`browser-esbuild`](./browser-esbuild)  | esbuild   | alias `@iarna/toml`/`yaml` → stub; `define: { global: 'globalThis' }`        |
| [`browser-vite`](./browser-vite)        | Vite      | alias `@iarna/toml`/`yaml` → stub; `define: { global: 'globalThis' }`        |
| [`browser-webpack`](./browser-webpack)  | webpack 5 | `resolve.fallback: { stream: false }`; `ProvidePlugin` for `Buffer`/`process` |

## Run

```bash
pnpm install                                          # repo root — links the workspace
pnpm --filter @solana/idl run build                   # build the consumed package
pnpm --filter idl-example-browser-esbuild run build   # swap esbuild → bun/vite/webpack
pnpm --filter idl-example-browser-esbuild run serve   # → http://localhost:8771
```

## Why a recipe is needed

`@solana/idl`'s own code is isomorphic (Web `crypto.subtle` + `DecompressionStream`,
no `node:*`). The recipes only satisfy a transitive dependency:
`@solana-program/program-metadata` statically imports `@iarna/toml` (and `yaml`)
for metadata formats IDLs never use, dragging in `node:stream` + a `Buffer`
polyfill that expects Node's `global`. So esbuild fails outright
(`Could not resolve "stream"`) without the stub, and bun builds but crashes on
`global` until it's defined. Full background:
[`@solana/idl` → Browser usage](../packages/idl/README.md#browser-usage).
