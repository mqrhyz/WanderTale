/** Ảnh địa điểm qua Wikipedia/Wikimedia — không cần API key. */

import { fuzzyPlaceNameScore } from "../lib/placeNameMatch.js";

function isGenericWikiLabel(label: string, destination: string): boolean {
  const norm = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  const dest = destination
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  if (!norm || norm === dest) return true;
  const generic = new Set([
    "da lat",
    "dalat",
    "vietnam",
    "viet nam",
    "vietnamese cuisine",
    "food",
    "restaurant",
  ]);
  return generic.has(norm);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]!);
    }
  }
  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Bỏ tiền tố hoạt động để search đúng tên địa điểm. */
export function normalizePlaceTitle(title: string): string {
  return title
    .normalize("NFC")
    .replace(
      /^(ăn\s+(sáng|trưa|tối|khuya)|thưởng thức|tham quan|ghé|dạo|check-in|nghỉ\s+ngơi\s+tại|tận\s+hưởng|khám\s+phá|trải\s+nghiệm)\s+/iu,
      ""
    )
    .replace(/^(tại\s+|tại\s+quán\s+|quán\s+)/iu, "")
    .trim();
}

/** Bỏ nội dung trong ngoặc — "Dinh Bảo Đại (Dinh III)" → "Dinh Bảo Đại". */
export function stripParenthetical(title: string): string {
  return title
    .normalize("NFC")
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nhiều biến thể query — tăng tỉ lệ trúng Wikipedia VN. */
export function buildWikimediaSearchQueries(title: string, destination: string): string[] {
  const raw = title.normalize("NFC").trim();
  const clean = normalizePlaceTitle(raw);
  const noParens = stripParenthetical(raw);
  const dest = destination.normalize("NFC").trim();
  const out: string[] = [];

  for (const base of [clean, noParens, raw]) {
    if (!base) continue;
    out.push(base);
    if (dest) out.push(`${base} ${dest}`);
  }

  return [...new Set(out.filter(Boolean))];
}

export type WikimediaHit = {
  imageUrl: string;
  pageTitle: string;
};

async function fetchWikipediaHit(search: string, lang: string): Promise<WikimediaHit | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: search.normalize("NFC"),
    gsrlimit: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "800",
    format: "json",
    origin: "*",
  });
  const r = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "WanderTale/1.0 (travel itinerary; contact@wandertale.local)" },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    query?: { pages?: Record<string, { title?: string; thumbnail?: { source?: string } }> };
  };
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const imageUrl = page?.thumbnail?.source;
  const pageTitle = page?.title?.trim();
  if (!imageUrl || !pageTitle) return null;
  return { imageUrl, pageTitle };
}

async function fetchCommonsHit(search: string): Promise<WikimediaHit | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: search.normalize("NFC"),
    gsrlimit: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "800",
    format: "json",
    origin: "*",
  });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "WanderTale/1.0 (travel itinerary; contact@wandertale.local)" },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    query?: { pages?: Record<string, { title?: string; thumbnail?: { source?: string } }> };
  };
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const imageUrl = page?.thumbnail?.source;
  const pageTitle = page?.title?.trim();
  if (!imageUrl || !pageTitle) return null;
  return { imageUrl, pageTitle };
}

async function fetchOneWikimediaHit(query: string): Promise<WikimediaHit | null> {
  for (const lang of ["vi", "en"]) {
    const hit = await fetchWikipediaHit(query, lang);
    if (hit) return hit;
  }
  return fetchCommonsHit(query);
}

/** Map slot title → ảnh Wikimedia (thử nhiều query / slot, kèm page title để fuzzy). */
export async function fetchWikimediaForSlots(
  slots: Array<{ title: string; destination: string }>,
  concurrency = 8,
  minNameScore = 0.35
): Promise<Map<string, WikimediaHit>> {
  const out = new Map<string, WikimediaHit>();
  if (slots.length === 0) return out;

  const t0 = Date.now();
  await mapWithConcurrency(slots, concurrency, async ({ title, destination }) => {
    const t = title.trim();
    if (!t || t === "—") return;

    let best: WikimediaHit | null = null;
    let bestScore = minNameScore;

    for (const query of buildWikimediaSearchQueries(t, destination)) {
      try {
        const hit = await fetchOneWikimediaHit(query);
        if (!hit) continue;
        if (isGenericWikiLabel(hit.pageTitle, destination)) continue;
        const score = Math.max(
          fuzzyPlaceNameScore(t, hit.pageTitle),
          fuzzyPlaceNameScore(t, query)
        );
        if (score >= minNameScore && score >= bestScore) {
          bestScore = score;
          best = hit;
        }
      } catch (e) {
        console.warn("[wikimedia] query failed:", query, e);
      }
    }

    if (best) out.set(t, best);
  });

  console.info(`[wikimedia] slots n=${slots.length} hit=${out.size} ${Date.now() - t0}ms`);
  return out;
}

/** @deprecated — dùng fetchWikimediaForSlots */
export async function fetchWikimediaPlaceMediaBatch(
  queries: string[],
  concurrency = 6
): Promise<Map<string, string>> {
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const t0 = Date.now();
  await mapWithConcurrency(unique, concurrency, async (query) => {
    try {
      const hit = await fetchOneWikimediaHit(query);
      if (hit) out.set(query, hit.imageUrl);
    } catch (e) {
      console.warn("[wikimedia] failed:", query, e);
    }
  });

  console.info(`[wikimedia] batch n=${unique.length} hit=${out.size} ${Date.now() - t0}ms`);
  return out;
}
