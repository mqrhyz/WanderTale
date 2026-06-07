import { env } from "./env.js";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = "v3";

const HOTEL_ALT_RE = /\b(hotel|resort|room|bed|lobby|suite|hostel|motel|inn)\b/i;

type CacheEntry = { urls: string[]; fetchedAt: number };

const photoCache = new Map<string, CacheEntry>();

type PexelsPhoto = {
  alt?: string;
  src?: { large?: string; landscape?: string; medium?: string };
};
type PexelsSearchResponse = { photos?: PexelsPhoto[] };

function photoUrl(photo: PexelsPhoto): string | null {
  return photo.src?.landscape || photo.src?.large || photo.src?.medium || null;
}

function isHotelPhoto(photo: PexelsPhoto): boolean {
  return HOTEL_ALT_RE.test(photo.alt ?? "");
}

/** Chọn 1 trong N ảnh — ổn định theo seed (trip id). */
export function pickStablePhotoIndex(seed: string, count: number): number {
  if (count <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % count;
}

async function fetchPexelsPhotos(query: string): Promise<string[]> {
  const key = env.PEXELS_API_KEY?.trim();
  if (!key || !query.trim()) return [];

  const cacheKey = `${CACHE_VERSION}:${query.trim().toLowerCase()}`;
  const cached = photoCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.urls;
  }

  const url = new URL(PEXELS_SEARCH);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", "5");
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    console.warn(`[pexels] search failed ${res.status} for "${query}"`);
    return cached?.urls ?? [];
  }

  const data = (await res.json()) as PexelsSearchResponse;
  const all = (data.photos ?? [])
    .map(photoUrl)
    .filter((u): u is string => Boolean(u));
  const filtered = (data.photos ?? [])
    .filter((p) => !isHotelPhoto(p))
    .map(photoUrl)
    .filter((u): u is string => Boolean(u));

  const urls = (filtered.length > 0 ? filtered : all).slice(0, 5);
  photoCache.set(cacheKey, { urls, fetchedAt: Date.now() });
  return urls;
}

/** Ảnh cover — search Pexels bằng tên điểm đến (đã clean prefix hành chính), chọn 1 trong 5 ảnh đầu. */
export async function resolvePexelsCoverUrl(
  destination: string,
  tripId: string
): Promise<string | null> {
  const raw = destination.trim();
  if (!raw) return null;

  // Bỏ prefix hành chính VN để query Pexels tìm được ảnh phong cảnh.
  const cleaned = raw
    .replace(/^(Thành Phố|Thành phố|TP\.|TP |Tỉnh|Thị xã|Quận|Huyện)\s*/i, "")
    .trim();
  const query = cleaned || raw;

  // Thử query nguyên gốc (có thể Pexels hiểu); nếu rỗng thì append " travel".
  let photos = await fetchPexelsPhotos(query);
  if (photos.length === 0 && query.length >= 2) {
    photos = await fetchPexelsPhotos(`${query} travel`);
  }
  if (photos.length === 0) return null;
  return photos[pickStablePhotoIndex(tripId, photos.length)] ?? null;
}
