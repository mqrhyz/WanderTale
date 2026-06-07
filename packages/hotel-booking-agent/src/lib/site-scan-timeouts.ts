import type { BookingSiteId } from "../state.js";

/** Timeout riêng từng OTA — legacy (Agoda/Vntrip) cần lâu hơn Booking lite. */
export const PER_SITE_TIMEOUT_MS: Record<BookingSiteId, number> = {
  booking: 22_000,
  agoda: 30_000,
  vntrip: 26_000,
};

export const DEFAULT_HARD_DEADLINE_MS = 90_000;

export function perSiteTimeoutMs(site: BookingSiteId): number {
  return PER_SITE_TIMEOUT_MS[site] ?? 15_000;
}
