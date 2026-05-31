import { resolveMapsPlacesBatchParallel } from "@wander-tale/hotel-booking-agent";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import { env } from "../lib/env.js";
import { buildGoogleMapsSearchUrl } from "../lib/mapsLinks.js";
import { getDayActivities, iterateDaySlots } from "./tripAgendaActivities.js";
import {
  applySlotImagesToRecord,
  getInstantSlotImages,
  inferSlotCategory,
  resolveAllSlotImages,
  resolveSlotImages,
  type SlotMediaProgressCallback,
} from "./slotMediaResolver.js";
import type { ItinerarySlot } from "./openaiItinerary.js";

const HOTEL_PHOTOS = 3;

export type PlaceMedia = {
  maps_url: string;
  image_preview_url?: string;
  image_preview_urls?: string[];
};

function enrichSlotRecord(
  slot: Record<string, unknown>,
  media: PlaceMedia
): Record<string, unknown> {
  const urls =
    media.image_preview_urls ??
    (media.image_preview_url ? [media.image_preview_url] : undefined) ??
    (Array.isArray(slot.image_preview_urls) ? (slot.image_preview_urls as string[]) : undefined);

  return {
    ...slot,
    maps_url: media.maps_url ?? slot.maps_url,
    image_preview_url: media.image_preview_url ?? urls?.[0] ?? slot.image_preview_url,
    image_preview_urls: urls,
  };
}

async function resolveHotelMediaQueries(
  queries: Array<{ query: string; maxPhotos: number }>
): Promise<Map<string, PlaceMedia>> {
  const out = new Map<string, PlaceMedia>();
  for (const { query } of queries) {
    out.set(query, { maps_url: buildGoogleMapsSearchUrl(query) });
  }
  if (queries.length === 0) return out;

  try {
    const browserMap = await resolveMapsPlacesBatchParallel(
      queries.map(({ query, maxPhotos }) => ({ query, maxPhotos })),
      Math.min(2, env.TRIP_MAPS_BROWSER_CONCURRENCY)
    );
    for (const { query, maxPhotos } of queries) {
      const b = browserMap.get(query);
      if (!b) continue;
      out.set(query, {
        maps_url: b.maps_url ?? buildGoogleMapsSearchUrl(query),
        image_preview_url: b.image_preview_url,
        image_preview_urls: b.image_preview_urls?.slice(0, maxPhotos),
      });
    }
  } catch (e) {
    console.warn("[placeMedia] hotel browser failed:", e);
  }
  return out;
}

/** Gắn link Google Maps search ngay (không cần API / Playwright). */
export function enrichItineraryWithSearchMaps<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string
): T {
  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) =>
      enrichSlotRecord(
        slot as Record<string, unknown>,
        { maps_url: buildGoogleMapsSearchUrl(`${String(slot.title ?? "")} ${destination}`) }
      ) as typeof slot
    )
  );

  const hotel_suggestions = itinerary.hotel_suggestions.map((h) => ({
    ...h,
    maps_url: h.maps_url ?? buildGoogleMapsSearchUrl(`${h.name} ${destination}`),
  }));

  const pricingMeta = itinerary.pricing_meta as { suggested_places?: Array<{ name: string; maps_url?: string }> } | undefined;
  let pricing_meta = itinerary.pricing_meta;
  if (pricingMeta?.suggested_places) {
    pricing_meta = {
      ...itinerary.pricing_meta,
      suggested_places: pricingMeta.suggested_places.map((p) => ({
        ...p,
        maps_url: p.maps_url ?? buildGoogleMapsSearchUrl(`${p.name} ${destination}`),
      })),
    };
  }

  return { ...itinerary, days, hotel_suggestions, pricing_meta: pricing_meta ?? itinerary.pricing_meta } as T;
}

/** Gắn placeholder ảnh ngay — chỉ quán ăn/cafe; địa danh chờ Wikimedia/Maps. */
export function enrichItineraryWithInstantPlaceholders<T extends GeneratedItinerary>(
  itinerary: T
): T {
  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) => {
      const s = slot as ItinerarySlot;
      const title = String(s.title ?? "").trim();
      if (!title || title === "—") return slot;
      const existing = (s as Record<string, unknown>).image_preview_url;
      if (typeof existing === "string" && existing.trim()) return slot;
      const category = inferSlotCategory(s);
      if (!["restaurant", "cafe"].includes(category)) return slot;
      const urls = getInstantSlotImages({ ...s, category: category as ItinerarySlot["category"] });
      if (urls.length === 0) return slot;
      return applySlotImagesToRecord(slot as Record<string, unknown>, urls) as typeof slot;
    })
  );

  return { ...itinerary, days } as T;
}

export type AgendaImagesOptions = {
  onProgress?: SlotMediaProgressCallback;
};

/** Gắn ảnh vào mọi slot có cùng title trong lịch trình. */
export function applySlotImagesToItineraryByTitle<T extends GeneratedItinerary>(
  itinerary: T,
  title: string,
  urls: string[]
): T {
  if (urls.length === 0) return itinerary;
  const key = title.trim();
  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) => {
      if (String(slot.title ?? "").trim() !== key) return slot;
      return applySlotImagesToRecord(slot as Record<string, unknown>, urls) as typeof slot;
    })
  );
  return { ...itinerary, days } as T;
}

/** Agenda: Wikimedia batch + placeholder fallback (không Playwright). */
export async function enrichItineraryWithAgendaImages<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string,
  options?: AgendaImagesOptions
): Promise<T> {
  const slots: ItinerarySlot[] = [];
  for (const d of itinerary.days) {
    for (const slot of getDayActivities(d)) {
      if (slot.title?.trim() && slot.title !== "—") slots.push(slot as ItinerarySlot);
    }
  }

  const imageByTitle = await resolveAllSlotImages(slots, destination, 8, options?.onProgress);

  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) => {
      const title = String(slot.title ?? "").trim();
      const urls = imageByTitle.get(title);
      if (!urls?.length) return slot;
      return applySlotImagesToRecord(slot as Record<string, unknown>, urls) as typeof slot;
    })
  );

  const pricingMeta = itinerary.pricing_meta as { suggested_places?: Array<{ name: string }> } | undefined;
  let pricing_meta = itinerary.pricing_meta;
  if (pricingMeta?.suggested_places) {
    pricing_meta = {
      ...itinerary.pricing_meta,
      suggested_places: await Promise.all(
        pricingMeta.suggested_places.map(async (p) => {
          const urls = await resolveSlotImages(
            { title: p.name, category: "landmark" } as ItinerarySlot,
            destination
          );
          return applySlotImagesToRecord(p as Record<string, unknown>, urls) as typeof p;
        })
      ),
    };
  }

  return { ...itinerary, days, pricing_meta: pricing_meta ?? itinerary.pricing_meta } as T;
}

/** Khách sạn: gallery qua Playwright (Job B). */
export async function enrichItineraryWithHotelImages<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string
): Promise<T> {
  const queryItems: Array<{ query: string; maxPhotos: number }> = [];
  for (const h of itinerary.hotel_suggestions) {
    const name = h.name.trim();
    if (!name) continue;
    queryItems.push({
      query: `${name} ${destination} hotel`.trim(),
      maxPhotos: HOTEL_PHOTOS,
    });
  }

  const mediaByQuery = await resolveHotelMediaQueries(queryItems);

  const hotel_suggestions = itinerary.hotel_suggestions.map((h) => {
    const q = `${h.name.trim()} ${destination} hotel`.trim();
    const media = mediaByQuery.get(q) ?? { maps_url: buildGoogleMapsSearchUrl(`${h.name} ${destination}`) };
    return {
      ...h,
      maps_url: media.maps_url ?? h.maps_url,
      image_preview_url: media.image_preview_url ?? h.image_preview_url,
      image_preview_urls: media.image_preview_urls ?? h.image_preview_urls,
    };
  });

  return { ...itinerary, hotel_suggestions } as T;
}
