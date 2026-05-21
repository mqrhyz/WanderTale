import type { TripRow } from "@/lib/dashboard";

const KEY = "wt-trips-cache-v1";
const TTL_MS = 45_000;

type CachePayload = { at: number; trips: TripRow[] };

export function readTripsCache(): TripRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.trips;
  } catch {
    return null;
  }
}

export function writeTripsCache(trips: TripRow[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachePayload = { at: Date.now(), trips };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
