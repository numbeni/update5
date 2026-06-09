import { performance } from "node:perf_hooks";

const HOMEPAGE_TIMEOUT_MS = 12_000;
const URL_PROBE_TIMEOUT_MS = 8_000;
/** Try up to this many /product/* URLs; stop as soon as one succeeds. */
const MAX_PROBE_ATTEMPTS = 3;
const MAX_LINKS_TO_PARSE = 400;

export type ProductCheckStatus =
  | "ok"       // At least one /product/* page responded
  | "warning"  // Kept for backward-compat; not produced by current implementation
  | "failed"   // /product/* links found but none responded
  | "unknown"  // No /product/* links found on homepage
  | "error"    // Homepage unreachable / unexpected error
  | "skipped"; // Disabled for this site

export type ProductCheckSource = "homepage" | "sitemap" | "none";

export interface ProductCheckResult {
  enabled: boolean;
  url: string;
  status: ProductCheckStatus;
  productPagesFound: boolean;
  source: ProductCheckSource;
  /** URLs that were probed (up to MAX_PROBE_ATTEMPTS). */
  checkedUrls: string[];
  /** The single URL that responded successfully, if any. */
  workingUrls: string[];
  message: string;
  responseTimeMs: number;
  errorMessage: string | null;
  generatedAt: string;
}

/** Progress events emitted during runProductCheck for live console visibility. */
export type ProductCheckProgressStep =
  | { step: "fetching_homepage" }
  | { step: "discovering"; source: "homepage" }
  | { step: "probing"; url: string; index: number; total: number };

const HREF_RE = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;

function normalize(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Only real product detail pages: pathname must begin with /product/
 * (not /products/, /shop/, /store/, /category/, etc.)
 */
function isRealProductPage(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/product/");
  } catch {
    return false;
  }
}

async function fetchText(
  url: string,
  timeoutMs: number,
): Promise<{ ok: boolean; text: string; errorMessage: string | null }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: { "User-Agent": "NOC-Monitor-ProductCheck/2.0" },
    });
    if (!res.ok) return { ok: false, text: "", errorMessage: `HTTP ${res.status}` };
    const text = await res.text();
    return { ok: true, text, errorMessage: null };
  } catch (err) {
    return {
      ok: false,
      text: "",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeUrl(url: string): Promise<boolean> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), URL_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ac.signal,
      headers: { "User-Agent": "NOC-Monitor-ProductCheck/2.0" },
    });
    return res.status === 200 || res.status === 301 || res.status === 302;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Extract all /product/* links from the homepage HTML. */
function extractProductLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  let count = 0;
  let m: RegExpExecArray | null;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(html)) !== null) {
    if (++count > MAX_LINKS_TO_PARSE) break;
    const abs = normalize(m[1]!, baseUrl);
    if (abs && isRealProductPage(abs)) links.add(abs);
  }
  return Array.from(links);
}

/**
 * Run a product page check for the given site URL.
 *
 * Discovery: homepage only — scan <a href> links for /product/* paths.
 * No sitemap fallback. If none found → "unknown".
 *
 * Verification: probe up to MAX_PROBE_ATTEMPTS URLs sequentially.
 * Stop as soon as one succeeds. One working page = "ok".
 *
 * @param url       Site homepage URL.
 * @param onProgress  Optional callback for real-time console events.
 */
export async function runProductCheck(
  url: string,
  onProgress?: (event: ProductCheckProgressStep) => void,
): Promise<ProductCheckResult> {
  const start = performance.now();
  const generatedAt = new Date().toISOString();

  // 1) Fetch homepage
  onProgress?.({ step: "fetching_homepage" });
  const home = await fetchText(url, HOMEPAGE_TIMEOUT_MS);
  if (!home.ok) {
    return {
      enabled: true,
      url,
      status: "error",
      productPagesFound: false,
      source: "none",
      checkedUrls: [],
      workingUrls: [],
      message: "Homepage was unreachable — could not run product check.",
      responseTimeMs: Math.round(performance.now() - start),
      errorMessage: home.errorMessage,
      generatedAt,
    };
  }

  // 2) Extract /product/* links — homepage only, no sitemap fallback
  onProgress?.({ step: "discovering", source: "homepage" });
  const candidates = extractProductLinks(home.text, url);

  if (candidates.length === 0) {
    return {
      enabled: true,
      url,
      status: "unknown",
      productPagesFound: false,
      source: "none",
      checkedUrls: [],
      workingUrls: [],
      message: "Homepage is reachable, but no /product/* links were found.",
      responseTimeMs: Math.round(performance.now() - start),
      errorMessage: null,
      generatedAt,
    };
  }

  // 3) Probe up to MAX_PROBE_ATTEMPTS URLs; stop at first success.
  //    One working product page is sufficient.
  const toProbe = candidates.slice(0, MAX_PROBE_ATTEMPTS);
  const checkedUrls: string[] = [];
  let workingUrl: string | null = null;

  for (let i = 0; i < toProbe.length; i++) {
    const candidate = toProbe[i]!;
    onProgress?.({ step: "probing", url: candidate, index: i + 1, total: toProbe.length });
    checkedUrls.push(candidate);
    const ok = await probeUrl(candidate);
    if (ok) {
      workingUrl = candidate;
      break;
    }
  }

  if (workingUrl) {
    return {
      enabled: true,
      url,
      status: "ok",
      productPagesFound: true,
      source: "homepage",
      checkedUrls,
      workingUrls: [workingUrl],
      message: `Product page is reachable: ${workingUrl}`,
      responseTimeMs: Math.round(performance.now() - start),
      errorMessage: null,
      generatedAt,
    };
  }

  return {
    enabled: true,
    url,
    status: "failed",
    productPagesFound: true,
    source: "homepage",
    checkedUrls,
    workingUrls: [],
    message: `Homepage is reachable, but no product pages responded (${checkedUrls.length} tried).`,
    responseTimeMs: Math.round(performance.now() - start),
    errorMessage: null,
    generatedAt,
  };
}
