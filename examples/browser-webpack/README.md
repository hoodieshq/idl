# idl-example-browser-webpack

`@solana/idl` in the browser via **webpack 5** (heaviest setup; webpack 5 dropped
automatic Node polyfills, so the recipe is the most explicit).

```bash
pnpm --filter @solana/idl run build           # build the package (once, from repo root)
pnpm --filter idl-example-browser-webpack run build   # webpack --mode production
pnpm --filter idl-example-browser-webpack run serve   # http://localhost:8773
```

**Recipe** (see [`webpack.config.js`](./webpack.config.js)):

- `resolve.fallback: { stream: false }` — `@solana-program/program-metadata` →
  `@iarna/toml` does `require('stream')` (only inside the unused TOML path), so
  resolve it to nothing.
- `ProvidePlugin({ Buffer: ['buffer', 'Buffer'], process: 'process/browser' })`
  — supply browser `Buffer`/`process` (the `buffer` and `process` packages).
  webpack 5 already provides `global`.

See the [`@solana/idl` README → Browser usage](../../packages/idl/README.md#browser-usage).
