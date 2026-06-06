import { fuzzyPlaceNameScore } from "../lib/placeNameMatch.js";
import { getCachedValue, setCachedValue } from "./externalApiCache.js";

const DDG_SEARCH_URL = "https://duckduckgo.com/";
const DDG_IMAGES_URL = "https://duckduckgo.com/i.js";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122 Safari/537.36";
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
const VQD_CACHE_TTL_MS = 30 * 60 * 1000;

type DuckDuckGoImageResult = {
  title?: string;
  image?: string;
  thumbnail?: string;
  url?: string;
};

type DuckDuckGoImagesResponse = {
  results?: DuckDuckGoImageResult[];
};

type CacheEntry = {
  urls: string[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const vqdCache = new Map<string, { token: string; fetchedAt: number }>();

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function extractVqd(html: string): string | null {
  return html.match(/vqd=['"]?([\d-]+)['"]?/i)?.[1] ?? null;
}

async function getVqdToken(query: string): Promise<string> {
  const key = cacheKey(query);
  const cached = vqdCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < VQD_CACHE_TTL_MS) return cached.token;

  const search = new URL(DDG_SEARCH_URL);
  search.searchParams.set("q", query);
  const htmlResponse = await fetch(search, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!htmlResponse.ok) throw new Error(`token HTTP ${htmlResponse.status}`);

  const token = extractVqd(await htmlResponse.text());
  if (!token) throw new Error("missing vqd token");
  vqdCache.set(key, { token, fetchedAt: Date.now() });
  return token;
}

function uniqueUrls(results: DuckDuckGoImageResult[], title: string, maxPhotos: number): string[] {
  const ranked = results
    .map((result) => ({
      result,
      score: fuzzyPlaceNameScore(title, `${result.title ?? ""} ${result.url ?? ""}`),
    }))
    .filter(({ result }) => Boolean(result.thumbnail || result.image))
    .sort((a, b) => b.score - a.score);

  const relevant = ranked.filter(({ score }) => score >= 0.25);
  const source = relevant.length > 0 ? relevant : ranked.slice(0, 2);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const { result } of source) {
    // DDG thumbnails are smaller but load consistently and avoid slow origin servers.
    const url = result.thumbnail ?? result.image;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= maxPhotos) break;
  }
  return out;
}

export async function searchDuckDuckGoImages(
  title: string,
  destination: string,
  maxPhotos = 1
): Promise<string[]> {
  const query = `${title.trim()} ${destination.trim()} Vietnam`.trim();
  if (!title.trim()) return [];

  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.urls.slice(0, maxPhotos);
  }
  const durable = await getCachedValue<{ urls: string[] }>(`ddg-images:${key}`);
  if (durable?.urls?.length) {
    cache.set(key, { urls: durable.urls, fetchedAt: Date.now() });
    return durable.urls.slice(0, maxPhotos);
  }

  try {
    const token = await getVqdToken(query);

    const images = new URL(DDG_IMAGES_URL);
    images.searchParams.set("l", "vn-vi");
    images.searchParams.set("o", "json");
    images.searchParams.set("q", query);
    images.searchParams.set("vqd", token);
    images.searchParams.set("f", ",,,");

    const imageResponse = await fetch(images, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        Referer: DDG_SEARCH_URL,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!imageResponse.ok) throw new Error(`images HTTP ${imageResponse.status}`);

    const data = (await imageResponse.json()) as DuckDuckGoImagesResponse;
    const urls = uniqueUrls(data.results ?? [], title, Math.max(1, maxPhotos));
    cache.set(key, { urls, fetchedAt: Date.now() });
    if (urls.length > 0) {
      await setCachedValue(`ddg-images:${key}`, { urls }, CACHE_TTL_SECONDS, "duckduckgo_images");
    }
    return urls;
  } catch (error) {
    console.warn(`[ddg-images] failed query="${query}":`, error);
    return cached?.urls.slice(0, maxPhotos) ?? [];
  }
}

export async function searchDuckDuckGoImagesBatch(
  items: Array<{ title: string; destination: string; maxPhotos?: number }>,
  concurrency = 6
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  let next = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);
  const t0 = Date.now();

  async function worker(): Promise<void> {
    while (next < items.length) {
      const item = items[next++]!;
      const urls = await searchDuckDuckGoImages(item.title, item.destination, item.maxPhotos ?? 1);
      if (urls.length > 0) out.set(item.title, urls);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  console.info(`[ddg-images] batch n=${items.length} hits=${out.size} workers=${workers} ${Date.now() - t0}ms`);
  return out;
}
