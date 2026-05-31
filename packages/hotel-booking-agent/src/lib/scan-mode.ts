import type { BookingSiteId } from "../state.js";

/** Tất cả OTA dùng legacy (giữ CSS) — lite chặn stylesheet khiến Booking/Agoda redirect hoặc DOM trống. */
export function usesLiteScan(_site: BookingSiteId): boolean {
  return false;
}

export function partitionScanSites(sites: BookingSiteId[]): {
  lite: BookingSiteId[];
  legacy: BookingSiteId[];
} {
  const lite: BookingSiteId[] = [];
  const legacy: BookingSiteId[] = [];
  for (const site of sites) {
    if (usesLiteScan(site)) lite.push(site);
    else legacy.push(site);
  }
  return { lite, legacy };
}
