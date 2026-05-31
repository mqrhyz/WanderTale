import type { BookingSiteId } from "../state.js";

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60_000;

type SiteHealth = { failures: number; openUntil: number };

const health = new Map<BookingSiteId, SiteHealth>();

function getHealth(site: BookingSiteId): SiteHealth {
  let h = health.get(site);
  if (!h) {
    h = { failures: 0, openUntil: 0 };
    health.set(site, h);
  }
  return h;
}

export function isSiteCircuitOpen(site: BookingSiteId): boolean {
  const h = getHealth(site);
  if (Date.now() < h.openUntil) return true;
  if (h.openUntil > 0 && Date.now() >= h.openUntil) {
    h.openUntil = 0;
    h.failures = 0;
  }
  return false;
}

export function recordSiteScanSuccess(site: BookingSiteId): void {
  const h = getHealth(site);
  h.failures = 0;
  h.openUntil = 0;
}

export function recordSiteScanFailure(site: BookingSiteId): void {
  const h = getHealth(site);
  h.failures += 1;
  if (h.failures >= FAILURE_THRESHOLD) {
    h.openUntil = Date.now() + COOLDOWN_MS;
  }
}

/** Bỏ site đang circuit-open khỏi danh sách quét. */
export function filterSitesByCircuit(sites: BookingSiteId[]): BookingSiteId[] {
  return sites.filter((s) => !isSiteCircuitOpen(s));
}

/** Reset circuit trước trip gen — tránh site bị khóa vĩnh viễn sau vài lần timeout. */
export function resetSiteCircuits(sites: BookingSiteId[]): void {
  for (const site of sites) {
    health.set(site, { failures: 0, openUntil: 0 });
  }
}
