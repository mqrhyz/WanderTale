/** Ảnh agenda qua Google Places Photos API — nhanh hơn Playwright, chính xác hơn Image Search. */

import { fuzzyPlaceNameScore } from "../lib/placeNameMatch.js";
import {
  getPlacePhotoMediaUrl,
  isGoogleMapsConfigured,
  placesTextSearchPhotoCandidates,
} from "./googleMaps.js";
import { buildWikimediaSearchQueries, normalizePlaceTitle } from "./placeMediaWikimedia.js";

const FOOD_CATEGORIES = new Set(["restaurant", "cafe"]);

export type GooglePlacesImageHit = {
  imageUrl: string;
  placeId: string;
  placeName: string;
};

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx]!);
    }
  }
  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

function minScoreForCategory(category: string): number {
  return FOOD_CATEGORIES.has(category) ? 0.55 : 0.35;
}

function buildPlacesQueries(title: string, destination: string): string[] {
  const clean = normalizePlaceTitle(title);
  const wikiQueries = buildWikimediaSearchQueries(title, destination);
  const out = [clean, ...wikiQueries];
  if (destination && !clean.toLowerCase().includes(destination.toLowerCase().slice(0, 8))) {
    out.push(`${clean} ${destination}`.trim());
  }
  return [...new Set(out.filter(Boolean))].slice(0, 4);
}

async function resolveOneSlot(
  slot: { title: string; lat?: number; lng?: number; category: string },
  destination: string
): Promise<GooglePlacesImageHit | null> {
  const title = slot.title.trim();
  const minScore = minScoreForCategory(slot.category);
  let bestCandidate: Awaited<ReturnType<typeof placesTextSearchPhotoCandidates>>[number] | null = null;
  let bestScore = minScore;

  for (const query of buildPlacesQueries(title, destination)) {
    try {
      const candidates = await placesTextSearchPhotoCandidates(
        query,
        slot.lat ?? null,
        slot.lng ?? null,
        5
      );
      for (const c of candidates) {
        const score = Math.max(
          fuzzyPlaceNameScore(title, c.displayName),
          fuzzyPlaceNameScore(title, query)
        );
        if (score >= minScore && score >= bestScore) {
          bestScore = score;
          bestCandidate = c;
        }
      }
      if (bestCandidate && bestScore >= 0.75) break;
    } catch (e) {
      console.warn("[googlePlaces] search failed:", query, e);
    }
  }

  if (!bestCandidate) return null;

  const imageUrl = await getPlacePhotoMediaUrl(bestCandidate.photoResourceName);
  if (!imageUrl) return null;

  return {
    imageUrl,
    placeId: bestCandidate.placeId,
    placeName: bestCandidate.displayName,
  };
}

/** Map slot title → ảnh Places Photos (song song). */
export async function fetchGooglePlacesImagesForSlots(
  slots: Array<{ title: string; lat?: number; lng?: number; category: string }>,
  destination: string,
  concurrency = 8,
  onHit?: (title: string, hit: GooglePlacesImageHit) => void | Promise<void>
): Promise<Map<string, GooglePlacesImageHit>> {
  const out = new Map<string, GooglePlacesImageHit>();
  if (slots.length === 0 || !isGoogleMapsConfigured()) return out;

  const t0 = Date.now();
  await mapWithConcurrency(slots, concurrency, async (slot) => {
    const title = slot.title.trim();
    if (!title || title === "—" || out.has(title)) return;
    try {
      const hit = await resolveOneSlot(slot, destination);
      if (hit) {
        out.set(title, hit);
        await onHit?.(title, hit);
      }
    } catch (e) {
      console.warn("[googlePlaces] slot failed:", title, e);
    }
  });

  console.info(`[googlePlaces] slots n=${slots.length} hit=${out.size} ${Date.now() - t0}ms`);
  return out;
}
