/**
 * Cluster selection and RPC URL resolution shared by all API routes.
 *
 * Per-cluster env vars (preferred):
 *   RPC_MAINNET, RPC_DEVNET
 *
 * Legacy fallback: `RPC_URL` is still honored for `mainnet-beta` so existing
 * single-cluster deployments keep working without changes.
 *
 * Testnet is intentionally not supported — the Program Metadata program isn't
 * deployed there, so neither PMP lookups nor PMP history reconstruction work.
 */

export type Cluster = 'mainnet-beta' | 'devnet';

export const CLUSTERS: readonly Cluster[] = ['mainnet-beta', 'devnet'] as const;

export const DEFAULT_CLUSTER: Cluster = 'mainnet-beta';

/** Returns a {@link Cluster} for known values, `null` for invalid input, or the default for empty input. */
export function parseCluster(
  value: string | null | undefined,
): Cluster | null {
  if (value == null || value === '') return DEFAULT_CLUSTER;
  return (CLUSTERS as readonly string[]).includes(value)
    ? (value as Cluster)
    : null;
}

export function envVarForCluster(cluster: Cluster): string {
  switch (cluster) {
    case 'mainnet-beta':
      return 'RPC_MAINNET';
    case 'devnet':
      return 'RPC_DEVNET';
  }
}

export function rpcUrlForCluster(cluster: Cluster): string | null {
  switch (cluster) {
    case 'mainnet-beta':
      return process.env.RPC_MAINNET ?? process.env.RPC_URL ?? null;
    case 'devnet':
      return process.env.RPC_DEVNET ?? null;
  }
}
