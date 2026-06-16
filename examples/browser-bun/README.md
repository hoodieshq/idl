# idl-example-browser-bun

`@solana/idl` in the browser via **bun**'s bundler — minimal, no framework.

```bash
pnpm --filter @solana/idl run build      # build the package (once, from repo root)
pnpm --filter idl-example-browser-bun run build  # bundle for the browser
pnpm --filter idl-example-browser-bun run serve  # http://localhost:8770
```

**Recipe:** bun auto-polyfills `Buffer`/`process` for `--target browser`, so the
only thing to add is Node's `global`, which that polyfill references — defined by
the one-line `<script>` in `index.html`. See the
[`@solana/idl` README → Browser usage](../../packages/idl/README.md#browser-usage).
