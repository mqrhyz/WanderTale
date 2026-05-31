/** Ảnh địa điểm qua Wikidata SPARQL (coordinate-first) — không cần API key. */

import { fuzzyPlaceNameScore } from "../lib/placeNameMatch.js";

export type WikidataPlaceImage = {
  imageUrl: string;
  itemId: string;
  itemLabel: string;
};

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "WanderTale/1.0 (travel itinerary; contact@wandertale.local)";

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

function buildAroundQuery(lat: number, lng: number, radiusKm = 0.3, limit = 8): string {
  return `
SELECT ?item ?itemLabel ?image WHERE {
  ?item wdt:P18 ?image .
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en". }
}
LIMIT ${limit}
`.trim();
}

function parseWikidataImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    if (value.includes("Special:FilePath/")) {
      const filePart = value.split("Special:FilePath/")[1]?.split("?")[0];
      if (filePart) {
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${filePart}?width=800`;
      }
    }
    return value.replace(/^http:\/\//i, "https://");
  }
  const fileName = value.startsWith("File:") ? value.slice(5) : value;
  if (!fileName) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName.replace(/ /g, "_"))}?width=800`;
}

async function fetchWikidataImagesNearCoords(
  lat: number,
  lng: number,
  slotTitle: string,
  minNameScore = 0.7
): Promise<WikidataPlaceImage | null> {
  const params = new URLSearchParams({
    query: buildAroundQuery(lat, lng),
    format: "json",
  });

  const r = await fetch(`${WIKIDATA_SPARQL}?${params}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
  });
  if (!r.ok) return null;

  const data = (await r.json()) as {
    results?: {
      bindings?: Array<{
        item?: { value?: string };
        itemLabel?: { value?: string };
        image?: { value?: string };
      }>;
    };
  };

  const bindings = data.results?.bindings ?? [];
  let best: WikidataPlaceImage | null = null;
  let bestScore = -1;

  for (const row of bindings) {
    const itemUri = row.item?.value ?? "";
    const itemId = itemUri.split("/").pop() ?? "";
    const itemLabel = row.itemLabel?.value?.trim() ?? "";
    const imageUrl = parseWikidataImageUrl(row.image?.value);
    if (!imageUrl || !itemLabel) continue;

    const score = fuzzyPlaceNameScore(slotTitle, itemLabel);
    if (score >= minNameScore && score >= bestScore) {
      bestScore = score;
      best = { imageUrl, itemId, itemLabel };
    }
  }

  return best;
}

/** Map slot title → ảnh Wikidata (chỉ slot có lat/lng). */
export async function fetchWikidataImagesForSlots(
  slots: Array<{ title: string; lat: number; lng: number }>,
  concurrency = 6,
  minNameScore = 0.7
): Promise<Map<string, WikidataPlaceImage>> {
  const out = new Map<string, WikidataPlaceImage>();
  if (slots.length === 0) return out;

  const t0 = Date.now();
  await mapWithConcurrency(slots, concurrency, async ({ title, lat, lng }) => {
    try {
      const hit = await fetchWikidataImagesNearCoords(lat, lng, title, minNameScore);
      if (hit) out.set(title.trim(), hit);
    } catch (e) {
      console.warn("[wikidata] failed:", title, e);
    }
  });

  console.info(`[wikidata] batch n=${slots.length} hit=${out.size} ${Date.now() - t0}ms`);
  return out;
}
