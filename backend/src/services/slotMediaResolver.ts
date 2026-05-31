import { resolveMapsPlacesBatchParallel } from "@wander-tale/hotel-booking-agent";
import type { ItinerarySlot } from "./openaiItinerary.js";
import { env } from "../lib/env.js";
import {
  getCachedImagesForSlot,
  setCachedImagesForSlot,
  type ImageCacheContext,
} from "../lib/imageCache.js";
import { fuzzyPlaceNameScore } from "../lib/placeNameMatch.js";
import { filterValidImageUrls, normalizeAgendaImageUrl } from "../lib/agendaImageUrl.js";
import { getPlaceholderImage } from "../lib/placeholders.js";
import { fetchWikidataImagesForSlots } from "./placeMediaWikidata.js";
import {
  fetchWikimediaForSlots,
  normalizePlaceTitle,
} from "./placeMediaWikimedia.js";
import { fetchGooglePlacesImagesForSlots } from "./placeMediaGooglePlaces.js";
import { isGoogleMapsConfigured } from "./googleMaps.js";

const WIKI_CATEGORIES = new Set(["landmark", "nature", "activity"]);
const PLAYWRIGHT_CATEGORIES = new Set(["restaurant", "cafe", "landmark", "nature", "activity"]);
const FOOD_PLACEHOLDER_CATEGORIES = new Set(["restaurant", "cafe"]);

const WIKI_TEXT_MIN_SCORE = 0.35;
const WIKIDATA_MIN_SCORE = 0.45;
const PLAYWRIGHT_FOOD_MIN_SCORE = 0.55;
const PLAYWRIGHT_LANDMARK_MIN_SCORE = 0.35;

/** Đoán category khi Gemini không trả về. */
export function inferSlotCategory(slot: ItinerarySlot): string {
  const raw = (slot.category ?? "").trim().toLowerCase();
  if (raw) return raw;

  const text = `${slot.title ?? ""} ${slot.summary ?? ""}`.toLowerCase();
  if (/thác|hồ |hồ$|đồi|vườn|núi|rừng|biển|đèo|suối|hoang sơ|valley|lake|waterfall/.test(text)) return "nature";
  if (/bún|phở|quán|nhà hàng|ăn|buffet|lẩu|restaurant|bánh/.test(text)) return "restaurant";
  if (/cafe|coffee|cà phê/.test(text)) return "cafe";
  if (/khách sạn|resort|homestay|hotel/.test(text)) return "hotel";
  if (/nhà thờ|chùa|dinh |di tích|bảo tàng|chợ|mua sắm|night market|trek|tham quan|quảng trường/.test(text)) {
    return "landmark";
  }
  return "landmark";
}

/** Placeholder tức thì — chỉ dùng cho quán ăn/cafe (tránh ảnh random cho địa danh). */
export function getInstantSlotImages(slot: ItinerarySlot): string[] {
  const title = slot.title?.trim() ?? "";
  if (!title || title === "—") return [];
  const category = inferSlotCategory(slot);
  if (category === "hotel") return [];
  if (!FOOD_PLACEHOLDER_CATEGORIES.has(category)) return [];
  return [getPlaceholderImage(category, slot.cuisine_type)];
}

function isWeakImageUrl(url: string): boolean {
  return url.includes("picsum.photos");
}

function slotCoords(slot: ItinerarySlot): { lat: number; lng: number } | undefined {
  const rec = slot as Record<string, unknown>;
  const lat = rec.lat;
  const lng = rec.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function cacheContext(slot: ItinerarySlot, destination: string, sourceEntityId?: string): ImageCacheContext {
  const coords = slotCoords(slot);
  return {
    title: slot.title!.trim(),
    destination,
    lat: coords?.lat,
    lng: coords?.lng,
    category: inferSlotCategory(slot),
    sourceEntityId,
  };
}

function buildPlaywrightMapsQuery(slot: ItinerarySlot, destination: string): string {
  return `${normalizePlaceTitle(slot.title!.trim())} ${destination}`.trim();
}

/** Playwright — chỉ khi đã có coords (Bước A). */
function playwrightCandidate(slot: ItinerarySlot): boolean {
  if (slotCoords(slot) == null) return false;
  return PLAYWRIGHT_CATEGORIES.has(inferSlotCategory(slot));
}

function mapsResultMatchesTitle(
  slotTitle: string,
  category: string,
  mapsUrl: string | undefined,
  query: string
): boolean {
  const minScore = FOOD_PLACEHOLDER_CATEGORIES.has(category)
    ? PLAYWRIGHT_FOOD_MIN_SCORE
    : PLAYWRIGHT_LANDMARK_MIN_SCORE;

  const scoreFromQuery = fuzzyPlaceNameScore(slotTitle, query);
  if (scoreFromQuery >= minScore) return true;

  if (mapsUrl) {
    try {
      const decoded = decodeURIComponent(mapsUrl);
      const placeMatch = decoded.match(/\/maps\/place\/([^/@]+)/);
      if (placeMatch?.[1]) {
        return fuzzyPlaceNameScore(slotTitle, placeMatch[1].replace(/\+/g, " ")) >= minScore;
      }
    } catch {
      /* ignore */
    }
  }

  return scoreFromQuery >= minScore * 0.85;
}

function normalizeUrls(urls: string[]): string[] {
  return urls.map(normalizeAgendaImageUrl).filter(Boolean);
}

async function acceptUrls(urls: string[]): Promise<string[] | null> {
  const normalized = normalizeUrls(urls);
  if (normalized.length === 0) return null;
  const valid = await filterValidImageUrls(normalized);
  return valid.length > 0 ? valid : null;
}

export type SlotImageProgress = {
  title: string;
  urls: string[];
  filled: number;
  total: number;
};

export type SlotMediaProgressCallback = (progress: SlotImageProgress) => void;

function commitResolvedSlot(
  out: Map<string, string[]>,
  title: string,
  urls: string[],
  total: number,
  onProgress?: SlotMediaProgressCallback
): void {
  out.set(title, urls);
  onProgress?.({ title, urls, filled: out.size, total });
}

export async function resolveSlotImages(
  slot: ItinerarySlot,
  destination: string
): Promise<string[]> {
  const map = await resolveAllSlotImages([slot], destination, 4);
  const title = slot.title?.trim() ?? "";
  return map.get(title) ?? [];
}

/** Resolve ảnh agenda: cache → Wikipedia → Wikidata → Places Photos → Playwright → placeholder F&B. */
export async function resolveAllSlotImages(
  slots: ItinerarySlot[],
  destination: string,
  concurrency = 8,
  onProgress?: SlotMediaProgressCallback
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const unique = slots.filter((s) => {
    const t = s.title?.trim();
    return t && t !== "—";
  });
  const total = unique.length;

  const coordCount = unique.filter((s) => slotCoords(s) != null).length;
  console.info(`[slotMedia] resolve n=${total} with_coords=${coordCount}`);

  const pending: ItinerarySlot[] = [];

  for (const slot of unique) {
    const title = slot.title!.trim();

    const cached = await getCachedImagesForSlot(cacheContext(slot, destination), { skipPlaceholder: true });
    if (cached?.length && !cached.some(isWeakImageUrl)) {
      const valid = await acceptUrls(cached);
      if (valid?.length) {
        commitResolvedSlot(out, title, valid, total, onProgress);
        continue;
      }
    }
    pending.push(slot);
  }

  if (pending.length === 0) return out;

  const wikiSlots = pending.filter((s) => WIKI_CATEGORIES.has(inferSlotCategory(s)));
  const wikiCoordsPayload = wikiSlots
    .map((s) => {
      const c = slotCoords(s);
      if (!c) return null;
      return { title: s.title!.trim(), lat: c.lat, lng: c.lng };
    })
    .filter((x): x is { title: string; lat: number; lng: number } => x != null);

  const [wikiTextMap, wikidataMap] = await Promise.all([
    fetchWikimediaForSlots(
      wikiSlots.map((s) => ({ title: s.title!.trim(), destination })),
      concurrency,
      WIKI_TEXT_MIN_SCORE
    ),
    fetchWikidataImagesForSlots(wikiCoordsPayload, concurrency, WIKIDATA_MIN_SCORE),
  ]);

  const playwrightQueue: ItinerarySlot[] = [];
  const placesQueue: ItinerarySlot[] = [];

  for (const slot of pending) {
    const title = slot.title!.trim();

    const wikiHit = wikiTextMap.get(title);
    if (wikiHit) {
      const valid = await acceptUrls([wikiHit.imageUrl]);
      if (valid?.length) {
        commitResolvedSlot(out, title, valid, total, onProgress);
        void setCachedImagesForSlot(
          cacheContext(slot, destination, wikiHit.pageTitle),
          valid,
          "wikimedia",
        ).catch(console.error);
        continue;
      }
    }

    const wikidataHit = wikidataMap.get(title);
    if (wikidataHit) {
      const valid = await acceptUrls([wikidataHit.imageUrl]);
      if (valid?.length) {
        commitResolvedSlot(out, title, valid, total, onProgress);
        void setCachedImagesForSlot(
          cacheContext(slot, destination, wikidataHit.itemId),
          valid,
          "wikidata",
        ).catch(console.error);
        continue;
      }
    }

    if (isGoogleMapsConfigured() && env.TRIP_PLACES_PHOTOS_ENABLED) {
      placesQueue.push(slot);
    } else if (playwrightCandidate(slot)) {
      playwrightQueue.push(slot);
    } else {
      const instant = getInstantSlotImages(slot);
      if (instant.length > 0) commitResolvedSlot(out, title, instant, total, onProgress);
    }
  }

  if (placesQueue.length > 0) {
    const applyPlacesHit = async (slot: ItinerarySlot, imageUrl: string, placeId: string) => {
      const title = slot.title!.trim();
      if (out.has(title)) return;
      const valid = await acceptUrls([imageUrl]);
      if (!valid?.length) return;
      commitResolvedSlot(out, title, valid, total, onProgress);
      void setCachedImagesForSlot(
        cacheContext(slot, destination, placeId),
        valid,
        "google_places",
      ).catch(console.error);
    };

    await fetchGooglePlacesImagesForSlots(
      placesQueue.map((s) => {
        const coords = slotCoords(s);
        return {
          title: s.title!.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
          category: inferSlotCategory(s),
        };
      }),
      destination,
      concurrency,
      async (title, hit) => {
        const slot = placesQueue.find((s) => s.title!.trim() === title);
        if (slot) await applyPlacesHit(slot, hit.imageUrl, hit.placeId);
      }
    );

    for (const slot of placesQueue) {
      const title = slot.title!.trim();
      if (out.has(title)) continue;
      if (playwrightCandidate(slot)) playwrightQueue.push(slot);
    }
  }

  const pwMax = Math.min(playwrightQueue.length, env.TRIP_MAPS_MEDIA_MAX, 12);
  const pwBatch = playwrightQueue.slice(0, pwMax);
  if (pwBatch.length > 0) {
    const queries = pwBatch.map((s) => {
      const coords = slotCoords(s)!;
      return {
        query: buildPlaywrightMapsQuery(s, destination),
        maxPhotos: 1,
        slotTitle: s.title!.trim(),
        lat: coords.lat,
        lng: coords.lng,
      };
    });

    try {
      const pwResults = await resolveMapsPlacesBatchParallel(
        queries.map(({ query, maxPhotos, lat, lng }) => ({ query, maxPhotos, lat, lng })),
        Math.min(2, env.TRIP_MAPS_BROWSER_CONCURRENCY)
      );

      for (const { query, slotTitle } of queries) {
        const media = pwResults.get(query);
        const url = media?.image_preview_url ?? media?.image_preview_urls?.[0];
        if (!url) continue;
        const slot = pwBatch.find((s) => s.title!.trim() === slotTitle)!;
        const category = inferSlotCategory(slot);
        if (!mapsResultMatchesTitle(slotTitle, category, media?.maps_url, query)) {
          console.warn("[slotMedia] playwright name mismatch, skip:", slotTitle);
          continue;
        }
        const valid = await acceptUrls([url]);
        if (!valid?.length) continue;
        commitResolvedSlot(out, slotTitle, valid, total, onProgress);
        void setCachedImagesForSlot(cacheContext(slot, destination), valid, "playwright").catch(console.error);
      }
    } catch (e) {
      console.warn("[slotMedia] playwright batch failed:", e);
    }
  }

  for (const slot of pending) {
    const title = slot.title!.trim();
    if (out.has(title)) continue;

    const instant = getInstantSlotImages(slot);
    if (instant.length > 0) {
      commitResolvedSlot(out, title, instant, total, onProgress);
      void setCachedImagesForSlot(cacheContext(slot, destination), instant, "placeholder").catch(console.error);
    }
  }

  console.info(`[slotMedia] resolved ${out.size}/${unique.length} slots`);
  return out;
}

export function applySlotImagesToRecord(
  slot: Record<string, unknown>,
  urls: string[]
): Record<string, unknown> {
  if (urls.length === 0) return slot;
  const normalized = urls.map(normalizeAgendaImageUrl);
  return {
    ...slot,
    image_preview_url: normalized[0],
    image_preview_urls: normalized,
  };
}
