import { getSupabase } from "./supabase.js";
import { encodeGeohash } from "./geohash.js";

export type ImageCacheContext = {
  title: string;
  destination: string;
  lat?: number;
  lng?: number;
  category?: string;
  sourceEntityId?: string;
};

export function buildLegacyCacheKey(title: string, destination: string): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
  return `${slug(title)}__${slug(destination)}`;
}

/** @deprecated Alias — dùng buildLegacyCacheKey */
export function buildCacheKey(title: string, destination: string): string {
  return buildLegacyCacheKey(title, destination);
}

export function buildGeohashCacheKey(ctx: ImageCacheContext, precision = 8): string | null {
  const { lat, lng, category, sourceEntityId } = ctx;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const gh = encodeGeohash(lat, lng, precision);
  const cat = (category ?? "any").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20) || "any";
  const id = sourceEntityId?.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 40);
  return id ? `gh:${gh}:${cat}:${id}` : `gh:${gh}:${cat}`;
}

function cacheKeysForLookup(ctx: ImageCacheContext): string[] {
  const keys: string[] = [];
  const geo = buildGeohashCacheKey(ctx);
  if (geo) keys.push(geo);
  keys.push(buildLegacyCacheKey(ctx.title, ctx.destination));
  return [...new Set(keys)];
}

function cacheKeysForWrite(ctx: ImageCacheContext): string[] {
  return cacheKeysForLookup(ctx);
}

function ttlDaysForCategory(category?: string | null): number {
  const c = (category ?? "").toLowerCase();
  if (c === "landmark" || c === "nature") return 30;
  if (c === "hotel") return 7;
  if (c === "restaurant" || c === "cafe" || c === "activity") return 14;
  return 14;
}

async function readCacheRow(
  cacheKey: string,
  opts?: { skipPlaceholder?: boolean }
): Promise<string[] | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("place_image_cache")
    .select("urls, expires_at, source")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at as string) <= new Date()) return null;

  const source = String(data.source ?? "");
  if (opts?.skipPlaceholder && (source === "placeholder" || source === "picsum")) return null;

  incrementHitCount(cacheKey);
  const urls = data.urls as string[] | null;
  if (opts?.skipPlaceholder && urls?.some((u) => u.includes("picsum.photos"))) return null;
  return urls?.length ? urls : null;
}

export async function getCachedImagesForSlot(
  ctx: ImageCacheContext,
  opts?: { skipPlaceholder?: boolean }
): Promise<string[] | null> {
  for (const key of cacheKeysForLookup(ctx)) {
    const urls = await readCacheRow(key, opts);
    if (urls?.length) return urls;
  }
  return null;
}

/** @deprecated — dùng getCachedImagesForSlot */
export async function getCachedImages(
  title: string,
  destination: string,
  opts?: { skipPlaceholder?: boolean }
): Promise<string[] | null> {
  return getCachedImagesForSlot({ title, destination }, opts);
}

export async function setCachedImagesForSlot(
  ctx: ImageCacheContext,
  urls: string[],
  source: string,
  ttlDays?: number
): Promise<void> {
  if (urls.length === 0) return;
  const days = ttlDays ?? ttlDaysForCategory(ctx.category);
  const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const cached_at = new Date().toISOString();

  const sb = getSupabase();
  for (const cache_key of cacheKeysForWrite(ctx)) {
    const { error } = await sb.from("place_image_cache").upsert(
      {
        cache_key,
        urls,
        source,
        category: ctx.category ?? null,
        cached_at,
        expires_at,
      },
      { onConflict: "cache_key" }
    );
    if (error) console.warn("[imageCache] set failed:", cache_key, error.message);
  }
}

/** @deprecated — dùng setCachedImagesForSlot */
export async function setCachedImages(
  title: string,
  destination: string,
  urls: string[],
  source: string,
  category?: string,
  ttlDays?: number
): Promise<void> {
  return setCachedImagesForSlot({ title, destination, category }, urls, source, ttlDays);
}

export function incrementHitCount(cacheKey: string): void {
  void (async () => {
    const sb = getSupabase();
    const { data } = await sb.from("place_image_cache").select("hit_count").eq("cache_key", cacheKey).maybeSingle();
    if (!data) return;
    await sb
      .from("place_image_cache")
      .update({ hit_count: ((data.hit_count as number) ?? 0) + 1 })
      .eq("cache_key", cacheKey);
  })().catch(() => undefined);
}
