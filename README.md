# IDL

**`IDL`** is an npm-oriented toolkit for **requesting and inspecting Solana program IDLs** on-chain. It is built so you can **request the latest IDL easily** (Program Metadata first, Anchor when needed), including a **side-by-side readout of both live sources** when that helps. **Additionally**, you can walk **every historical IDL revision**, each **reconstructed directly from the relevant on-chain transactions**. **Anchor IDL accounts** and **Program Metadata (PMP)** are supported end to end.

| Surface | Use case |
|--------|----------|
| **npm package** `@solana/idl` | Import in Node or ship in your own services: `fetchCurrentIdlPreferPmp`, full history reconstruction, PDA helpers |
| **CLI** | Same logic from the terminal: bare IDL by default, `--latest` for the side-by-side payload with slot/time, `--history` for the full replay |
| **Web + HTTP API** | Hosted UI and JSON endpoints for current, latest, and history |

Live demo (mainnet): https://idl-explorer.vercel.app/

## Setup

```bash
npm install
```

From the repository root you can run the CLI with `npx tsx src/cli.ts …` or, after `npm run build`, via the **`idl`** binary from the published package. For local development from this repo:

```bash
npm start -- <program-address> [options]
```

(`npm start` runs `tsx src/cli.ts` as defined in `package.json`.)

## CLI Usage

The CLI is published as the **`idl`** binary and mirrors the library. It has three modes, each backed by the same core function the API route uses:

| Mode | Flag | Output | Backing function | API parity |
|------|------|--------|------------------|------------|
| **Bare IDL** *(default)* | *(none)* | Just the IDL body on stdout — pretty JSON if parsable, otherwise the raw string | `fetchCurrentIdlPreferPmp` | the `idl` field of `GET /api/idl` |
| **Latest side-by-side** | `--latest` | `{programId, pmpAddress, anchorAddress, pmp[], anchor[]}` with version/slot/time/activeFrom for each source | `fetchLatestIdls` | `GET /api/latest` |
| **Full history** | `--history` | Pretty timeline of every revision (and optional `--output` / `--dump-idls`) | `reconstructPmpHistory` / `reconstructAnchorHistory` | `POST /api/history` |

Live IDL resolution (default and `--latest`) always follows the same order: **canonical PMP → fndn fallback PMP → Anchor**. History replay (`--history`) auto-detects unless you pin `--type`.

> **Parsed vs. raw IDL.** Bare mode emits the IDL **parsed** as pretty JSON — best when you want to *use* the IDL (codegen, jq, inspection). `--latest` and `--history` emit the IDL **as a raw string** inside their wrapper — best when you want to *record* or *compare* it (hashing, diffing, byte-stable storage). `JSON.parse` ↔ `JSON.stringify` is not guaranteed to be a byte-for-byte round trip, so the indexer-flavored modes preserve the on-chain bytes verbatim.

Run from the **repository root** (the directory with `src/cli.ts`). If your shell is inside `web/`, either `cd ..` or invoke the entrypoint explicitly:

```bash
npx tsx ../src/cli.ts <program-address> [options]
```

From the repo root:

```bash
npx tsx src/cli.ts <program-address> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-r, --rpc <url>` | Solana RPC URL (or set `RPC_URL` env var) |
| `-s, --seed <seed>` | Metadata seed, PMP only (default: `idl`) |
| `-a, --authority <address>` | Authority address for non-canonical PMP metadata |
| `--latest` | Print the `{programId, pmpAddress, anchorAddress, pmp[], anchor[]}` payload with version/slot/time (same shape as `GET /api/latest`) |
| `--history` | Replay the full IDL version history from on-chain transactions |
| `-t, --type <type>` | **`--history` only.** IDL type: `pmp`, `anchor`, or `both` (auto-detected if omitted) |
| `-o, --output <dir>` | **`--history` only.** Save full state snapshots to directory |
| `--dump-idls <dir>` | **`--history` only.** Write each distinct IDL version as JSON + an `index.json` timeline |

`--latest` and `--history` are mutually exclusive. The `--type` / `--output` / `--dump-idls` flags are rejected outside `--history`.

### Examples

Bare IDL (default — just the JSON body, ready to pipe):

```bash
npx tsx src/cli.ts BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya \
  --rpc https://api.mainnet-beta.solana.com > idl.json
```

Side-by-side current view with slot + time for each source (same shape as `GET /api/latest`):

```bash
npx tsx src/cli.ts BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya \
  --rpc https://api.mainnet-beta.solana.com \
  --latest
```

Auto-detected full history (timeline on stdout):

```bash
npx tsx src/cli.ts BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya \
  --rpc https://api.mainnet-beta.solana.com \
  --history
```

Dump all distinct Anchor IDL versions to a directory:

```bash
npx tsx src/cli.ts BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya \
  --rpc https://api.mainnet-beta.solana.com \
  --history --type anchor --dump-idls ./idls
```

Reconstruct both PMP and Anchor IDL history at once:

```bash
npx tsx src/cli.ts BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya \
  --rpc https://api.mainnet-beta.solana.com \
  --history --type both --dump-idls ./idls
```

When using `--history --type both`, paths for **both** `--output` and `--dump-idls` are automatically split into `<dir>/pmp/` and `<dir>/anchor/` (for example `./out/pmp` and `./out/anchor` if you pass `--output ./out`).

### Using an environment variable for RPC

```bash
export RPC_URL=https://api.mainnet-beta.solana.com
npx tsx src/cli.ts <program-address> --dump-idls ./idls
```

## Web App

A Next.js UI and HTTP API live under `web/`. The UI exposes the same three capabilities as the API: **current IDL** (`GET /api/idl`), **latest PMP + Anchor** (`GET /api/latest`), and **full history** (`POST /api/history`). A cluster switcher (mainnet/devnet) sits in the header and is threaded through every API request. Testnet is intentionally not supported since the Program Metadata program isn't deployed there.

```bash
cd web
cp .env.example .env.local   # set RPC_MAINNET / RPC_DEVNET
npm install
npm run dev                   # http://localhost:3000
```

The IDL **CLI** (`src/cli.ts`) lives at the **repository root**, not inside `web/`. After `cd web`, run the CLI from the parent directory (`cd ..`) or use `npx tsx ../src/cli.ts …` so the path resolves correctly.

Deploy the app to Vercel by setting the project **root directory** to `web` and adding `RPC_MAINNET` and/or `RPC_DEVNET` in the environment. A legacy `RPC_URL` is still honored as a fallback for `mainnet-beta` only.

IDL resolution order (per program): **canonical PMP** (seed `idl`) → **non-canonical PMP** with `IDL_FALLBACK_PMP_AUTHORITY` (`fndnu15…`, set to the `UPLOAD_KEYPAIR` pubkey in `src/pmp-idl.ts`) → **Anchor**.

### API Endpoints

All routes accept a **`cluster`** parameter (`mainnet-beta` (default) or `devnet`). For `GET` routes pass it as a query parameter; for `POST /api/history` include it in the JSON body. A request to a cluster whose env var is unset returns `500` naming the missing variable.

**`GET /api/idl?programId=<address>&cluster=<cluster>`** — Returns the **current** IDL (canonical PMP, then non-canonical PMP via the fallback authority, then Anchor). Response shape:

```json
{
  "programId": "BUYux…",
  "type": "pmp",
  "idl": { }
}
```

`type` is `"pmp"` or `"anchor"`. The `idl` field is **JSON-parsed when possible**; if parsing fails, it is returned as a **string** (raw IDL text). Returns `400` for a missing or invalid `programId` or `cluster`, `404` when neither source has an IDL, `500` when the cluster's RPC env var is unset on the server, or `500` on unexpected errors.

**`GET /api/latest?programId=<address>&cluster=<cluster>`** — Returns **both** current sources side by side (when present): derived `pmpAddress`, `anchorAddress`, and two arrays `pmp` and `anchor`, each with at most one entry including decoded version metadata and **full `content` string** for the live IDL. Useful when a program has migrated or you want to compare PMP vs Anchor without choosing a single winner.

> `content` is kept as the **raw on-chain string** (not parsed) on this endpoint and on `POST /api/history` below — same reasoning as the CLI's `--latest` / `--history` modes (byte-stable hashing and diffing for indexers). `GET /api/idl` is the parsed/usable view.

**`POST /api/history`** — Reconstructs **distinct** IDL versions over time. Body: `{ "programId": "<address>", "cluster": "<cluster>" }` (cluster defaults to `mainnet-beta` when omitted).

Response (200):

```json
{
  "programId": "…",
  "pmpAddress": "…",
  "anchorAddress": "…",
  "pmp": [],
  "anchor": []
}
```

Each of `pmp` and `anchor` is an array of objects with `type`, `version`, `slot`, `time`, `activeFrom`, `activeTo` (`"current"` or `{ "slot", "time" }`), and **`content`** (full IDL JSON string for that revision). Either array may be empty if that format has no on-chain history. Same status codes as above for bad input, missing RPC, or server errors.

## Library Usage

Install from npm when published (`npm install @solana/idl`), or depend on this repository and build. Exports live under `dist/` after `npm run build`.

```bash
npm run build
```

```typescript
import { createSolanaRpc } from '@solana/kit';
import {
  reconstructPmpHistory,
  reconstructAnchorHistory,
  findPmpMetadataPda,
  findAnchorIdlAddress,
  fetchCurrentIdlPreferPmp,
  fetchLatestIdls,
} from '@solana/idl';

const rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');

// Lean: just the current IDL (PMP first, then Anchor). Same as GET /api/idl.
const current = await fetchCurrentIdlPreferPmp(rpc, programAddress);
if (current) console.log(current.type, current.idl);

// Rich: PMP + Anchor side-by-side with slot/time/version. Same as GET /api/latest.
const latest = await fetchLatestIdls(rpc, programAddress);
console.log(latest.pmp[0]?.slot, latest.anchor[0]?.slot);

// Anchor IDL history
const snapshots = await reconstructAnchorHistory(rpc, programAddress);

// PMP IDL history
const pda = await findPmpMetadataPda(programAddress, 'idl');
const pmpSnapshots = await reconstructPmpHistory(rpc, pda);
```

## How history reconstruction works

When you call **history** APIs or `reconstructAnchorHistory` / `reconstructPmpHistory`, the library replays on-chain transactions that touched the program’s IDL metadata account (and related buffer accounts), reconstructing state after each relevant instruction. For **Anchor**, this includes legacy IDL instructions and Anchor 0.30+ style IDL instructions (`Create` / buffer flows, `Write`, `SetBuffer`, `SetAuthority`, `Close`, and the corresponding `idl_*` variants). For **PMP** (SPL Program Metadata), it includes instructions such as `Allocate`, `Write`, `Initialize`, `SetData`, `SetAuthority`, `SetImmutable`, `Trim`, `Close`, and `Extend`. Buffer account payloads are rebuilt by replaying writes to those accounts as well.

**Current** and **latest** paths do not replay history: they read the live chain state (and use the Program Metadata client where appropriate), so they are much cheaper than a full history scan.

## Testing

```bash
npm test
```

Tests use [Vitest](https://vitest.dev). Integration tests run against **recorded fixtures** in `tests/fixtures/<program>-<cluster>/` — every RPC response the production code paths need is serialized to disk, so the suite is hermetic and offline.

To refresh or add fixtures (requires `RPC_MAINNET` / `RPC_DEVNET` or `web/.env.local`):

```bash
npm run record:fixtures -- BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya mainnet-beta
npm run record:fixtures -- TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA  devnet
```

The recorder reuses any fixture already on disk, so reruns only fetch what's missing.
