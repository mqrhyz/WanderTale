import { getSupabase } from "./supabase.js";
import { buildCacheKey } from "./imageCache.js";

const COORDS_TTL_DAYS = 90;

export async function getCachedCoords(
  title: string,
  destination: string
): Promise<{ lat: number; lng: number; display_name?: string } | null> {
  const cache_key = buildCacheKey(title, destination);
  const sb = getSupabase();
  const { data, error } = await sb
    .from("place_coords_cache")
    .select("lat, lng, display_name, expires_at")
    .eq("cache_key", cache_key)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at as string) <= new Date()) return null;

  return {
    lat: data.lat as number,
    lng: data.lng as number,
    display_name: (data.display_name as string | null) ?? undefined,
  };
}

export async function setCachedCoords(
  title: string,
  destination: string,
  coords: { lat: number; lng: number; display_name?: string }
): Promise<void> {
  const cache_key = buildCacheKey(title, destination);
  const expires_at = new Date(Date.now() + COORDS_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sb = getSupabase();
  const { error } = await sb.from("place_coords_cache").upsert(
    {
      cache_key,
      lat: coords.lat,
      lng: coords.lng,
      display_name: coords.display_name ?? null,
      cached_at: new Date().toISOString(),
      expires_at,
    },
    { onConflict: "cache_key" }
  );
  if (error) console.warn("[placeCoordsCache] set failed:", error.message);
}
