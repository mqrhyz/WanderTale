import { getSupabase } from "../lib/supabase.js";

export type OtaCachePayload = {
  status: string;
  message?: string;
  offers: unknown[];
  comparison: unknown;
  siteScans: unknown[];
  errors: Array<{ site: string; message: string }>;
};

const memory = new Map<string, { payload: OtaCachePayload; expiresAt: number }>();

function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function otaCacheKey(
  criteria: {
    city: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    rooms: number;
  },
  sites: string[]
): string {
  const city = normalizeCityKey(criteria.city);
  const sitePart = [...sites].sort().join(",");
  return `ota:${city}:${criteria.checkIn}:${criteria.checkOut}:${criteria.adults}:${criteria.children}:${criteria.rooms}:${sitePart}`;
}

/** TTL (giây): check-in gần → cache ngắn hơn. */
export function otaCacheTtlSeconds(checkIn: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInDate = new Date(`${checkIn}T12:00:00`);
  const diffDays = Math.floor((checkInDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays <= 0) return 5 * 60;
  if (diffDays <= 7) return 15 * 60;
  return 60 * 60;
}

export async function getOtaCache(key: string): Promise<OtaCachePayload | null> {
  const mem = memory.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.payload;
  if (mem) memory.delete(key);

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("ota_price_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at as string).getTime() <= Date.now()) return null;
    const payload = data.payload as OtaCachePayload;
    memory.set(key, {
      payload,
      expiresAt: new Date(data.expires_at as string).getTime(),
    });
    return payload;
  } catch {
    return null;
  }
}

export async function setOtaCache(key: string, payload: OtaCachePayload, ttlSeconds: number): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memory.set(key, { payload, expiresAt });

  try {
    const sb = getSupabase();
    const expiresIso = new Date(expiresAt).toISOString();
    await sb.from("ota_price_cache").upsert({
      cache_key: key,
      payload,
      expires_at: expiresIso,
    });
  } catch {
    /* memory cache vẫn dùng được */
  }
}
