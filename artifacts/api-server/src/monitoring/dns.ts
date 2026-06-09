import { Resolver } from "node:dns/promises";
import { asc } from "drizzle-orm";
import { db, dnsResolversTable, type DnsResolver } from "@workspace/db";
import { getCachedSettings } from "../services/settings";

export interface DnsResolverResult {
  resolver: string;
  ok: boolean;
  responseTimeMs: number | null;
  addresses: string[];
  error: string | null;
}

export interface DnsHealthReport {
  host: string;
  healthScore: number;
  status: "healthy" | "degraded" | "failed";
  propagationConsistent: boolean;
  avgResponseTimeMs: number | null;
  resolvers: DnsResolverResult[];
}

export interface ResolverEntry {
  id: number | null;
  name: string;
  address: string;
  builtIn: boolean;
}

// Built-in defaults are always present and cannot be removed.
export const BUILT_IN_RESOLVERS: ResolverEntry[] = [
  { id: null, name: "Cloudflare (1.1.1.1)", address: "1.1.1.1", builtIn: true },
  { id: null, name: "Google (8.8.8.8)", address: "8.8.8.8", builtIn: true },
  { id: null, name: "Quad9 (9.9.9.9)", address: "9.9.9.9", builtIn: true },
  {
    id: null,
    name: "OpenDNS (208.67.222.222)",
    address: "208.67.222.222",
    builtIn: true,
  },
];

const DNS_TIMEOUT_MS = 5000;

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

export function isValidResolverAddress(addr: string): boolean {
  const a = addr.trim();
  if (!a) return false;
  if (IPV4_RE.test(a)) return true;
  // very loose IPv6 check
  if (a.includes(":") && IPV6_RE.test(a) && a.length >= 3) return true;
  return false;
}

/** Returns the merged resolver list (built-in + user custom from DB), respecting enabled flags and strategy. */
export async function getAllResolvers(): Promise<ResolverEntry[]> {
  let custom: DnsResolver[] = [];
  try {
    custom = await db
      .select()
      .from(dnsResolversTable)
      .orderBy(asc(dnsResolversTable.priority), asc(dnsResolversTable.createdAt));
  } catch {
    custom = [];
  }

  const settings = getCachedSettings();
  const disabledBuiltIns = new Set(settings.disabledBuiltInResolvers ?? []);
  const strategy = settings.dnsResolverStrategy ?? "race";

  const enabledBuiltIns = BUILT_IN_RESOLVERS.filter((r) => !disabledBuiltIns.has(r.address));
  const enabledCustom: ResolverEntry[] = custom
    .filter((r) => r.enabled)
    .map((r) => ({ id: r.id, name: r.name, address: r.address, builtIn: false }));

  // Dedupe helper
  const seen = new Set<string>();
  const deduped = (list: ResolverEntry[]): ResolverEntry[] =>
    list.filter((e) => { if (seen.has(e.address)) return false; seen.add(e.address); return true; });

  if (strategy === "custom_first") {
    return deduped([...enabledCustom, ...enabledBuiltIns]);
  } else if (strategy === "builtin_first") {
    return deduped([...enabledBuiltIns, ...enabledCustom]);
  }
  // "race" — built-in first (most reliable by default), custom appended
  return deduped([...enabledBuiltIns, ...enabledCustom]);
}

async function resolveWith(
  serverName: string,
  servers: string[],
  host: string,
): Promise<DnsResolverResult> {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });
  resolver.setServers(servers);
  const start = Date.now();
  try {
    const addresses = await resolver.resolve4(host);
    return {
      resolver: serverName,
      ok: addresses.length > 0,
      responseTimeMs: Date.now() - start,
      addresses,
      error: null,
    };
  } catch (err) {
    return {
      resolver: serverName,
      ok: false,
      responseTimeMs: Date.now() - start,
      addresses: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkDnsHealth(host: string): Promise<DnsHealthReport> {
  const all = await getAllResolvers();
  const results = await Promise.all(
    all.map((r) => resolveWith(r.name, [r.address], host)),
  );

  const successful = results.filter((r) => r.ok);
  const healthScore = Math.round((successful.length / results.length) * 100);

  // Propagation consistency: all successful resolvers should return overlapping addresses
  let propagationConsistent = true;
  if (successful.length >= 2) {
    const firstSet = new Set(successful[0]!.addresses);
    for (let i = 1; i < successful.length; i++) {
      const overlap = successful[i]!.addresses.some((a) => firstSet.has(a));
      if (!overlap) {
        propagationConsistent = false;
        break;
      }
    }
  }

  const okTimes = successful
    .map((r) => r.responseTimeMs)
    .filter((v): v is number => v !== null);
  const avgResponseTimeMs =
    okTimes.length > 0
      ? okTimes.reduce((a, b) => a + b, 0) / okTimes.length
      : null;

  let status: "healthy" | "degraded" | "failed";
  if (healthScore >= 75 && propagationConsistent) status = "healthy";
  else if (healthScore >= 25) status = "degraded";
  else status = "failed";

  return {
    host,
    healthScore,
    status,
    propagationConsistent,
    avgResponseTimeMs,
    resolvers: results,
  };
}

export interface QuickDnsResult {
  ok: boolean;
  resolveMs: number | null;
  status: string;
  error: string | null;
  addresses: string[];
  resolverUsed: string | null;
  resolverAddress: string | null;
}

/**
 * Resolves the host using the first available built-in OR custom resolver.
 * Returns full data so it can be persisted on every check (no separate
 * "global check" needed).
 */
/**
 * Resolves the host using ALL resolvers in parallel and returns the fastest
 * successful result (race pattern). This eliminates the sequential timeout
 * penalty (previously up to 4 × 5s = 20s in worst case on Iranian networks).
 *
 * Each resolver races independently — the first one to succeed wins.
 * If all fail, we return the aggregated error.
 */
export async function quickDnsCheck(host: string): Promise<QuickDnsResult> {
  const all = await getAllResolvers();

  const raceResult = await new Promise<{
    ok: true;
    resolveMs: number;
    addresses: string[];
    resolverUsed: string;
    resolverAddress: string;
  } | null>((resolve) => {
    let settled = false;
    let remaining = all.length;

    if (remaining === 0) {
      resolve(null);
      return;
    }

    for (const entry of all) {
      const start = Date.now();
      const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });
      resolver.setServers([entry.address]);

      resolver.resolve4(host).then((addresses) => {
        if (settled) return;
        if (addresses.length === 0) {
          remaining--;
          if (remaining === 0) resolve(null);
          return;
        }
        settled = true;
        resolve({
          ok: true,
          resolveMs: Date.now() - start,
          addresses,
          resolverUsed: entry.name,
          resolverAddress: entry.address,
        });
      }).catch(() => {
        if (settled) return;
        remaining--;
        if (remaining === 0) resolve(null);
      });
    }
  });

  if (raceResult) {
    const status = raceResult.resolveMs > 2000 ? "slow" : "ok";
    return {
      ok: true,
      resolveMs: raceResult.resolveMs,
      status,
      error: null,
      addresses: raceResult.addresses,
      resolverUsed: raceResult.resolverUsed,
      resolverAddress: raceResult.resolverAddress,
    };
  }

  return {
    ok: false,
    resolveMs: null,
    status: "failed",
    error: "All resolvers failed",
    addresses: [],
    resolverUsed: null,
    resolverAddress: null,
  };
}
