import type { GeneratedItinerary } from "./openaiItinerary.js";
import { buildGoogleMapsCoordUrl, buildGoogleMapsSearchUrl, buildMapsUrl } from "../lib/mapsLinks.js";
import { resolveCoordinates } from "../lib/nominatim.js";
import { resolveCityFocus } from "@wander-tale/hotel-booking-agent";
import { resolveDestinationCoords } from "./weatherService.js";
import { getDayActivities, iterateDaySlots } from "./tripAgendaActivities.js";
import type { TripRouteOptimization } from "./tripHotelLocationService.js";
import { hotelNameMatches } from "./tripHotelLocationService.js";
import { getFoodPlaceSeed, normalizePlaceKey } from "./placePlacesService.js";

type CoordSeedValue = { lat: number; lng: number; address?: string };
type CoordSeed = Map<string, CoordSeedValue>;

export function buildCoordSeedFromRoute(
  route?: TripRouteOptimization
): CoordSeed {
  const seed = new Map<string, CoordSeedValue>();
  for (const p of route?.places ?? []) {
    seed.set(normalizePlaceKey(p.name), { lat: p.lat, lng: p.lng });
  }
  for (const h of route?.hotel_candidates ?? []) {
    const coords = { lat: h.lat, lng: h.lng };
    seed.set(normalizePlaceKey(h.name), coords);
    if (h.ota_hotel_name) seed.set(normalizePlaceKey(h.ota_hotel_name), coords);
  }
  return seed;
}

function lookupCoords(name: string, seed: CoordSeed): CoordSeedValue | null {
  const key = normalizePlaceKey(name);
  if (!key) return null;
  const direct = seed.get(key);
  if (direct) return direct;
  for (const [k, coords] of seed) {
    if (key.includes(k) || k.includes(key)) return coords;
  }
  return null;
}

function mapsFields(
  name: string,
  destination: string,
  seed: CoordSeed
): { maps_url: string; lat?: number; lng?: number; address?: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "—") {
    return { maps_url: buildGoogleMapsSearchUrl(trimmed) };
  }
  const coords = lookupCoords(trimmed, seed);
  if (coords) {
    // Ưu tiên địa chỉ từ DB (food pool) để Maps button mở đúng địa chỉ thực.
    if (coords.address) {
      return {
        maps_url: buildGoogleMapsCoordUrl(coords.lat, coords.lng, coords.address),
        lat: coords.lat,
        lng: coords.lng,
        address: coords.address,
      };
    }
    return {
      maps_url: buildGoogleMapsCoordUrl(coords.lat, coords.lng, trimmed),
      lat: coords.lat,
      lng: coords.lng,
    };
  }
  return { maps_url: buildGoogleMapsSearchUrl(`${trimmed} ${destination}`) };
}

function collectPlaceNames(itinerary: GeneratedItinerary): string[] {
  const names = new Set<string>();
  for (const d of itinerary.days) {
    for (const slot of getDayActivities(d)) {
      const t = slot.title?.trim();
      if (t && t !== "—") names.add(t);
    }
  }
  const pricingMeta = itinerary.pricing_meta as { suggested_places?: Array<{ name: string }> } | undefined;
  for (const p of pricingMeta?.suggested_places ?? []) {
    if (p.name?.trim()) names.add(p.name.trim());
  }
  for (const h of itinerary.hotel_suggestions) {
    if (h.name?.trim()) names.add(h.name.trim());
  }
  return [...names];
}

function applyCoordMapsFromSeed<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string,
  seed: CoordSeed,
  routeOptimization?: TripRouteOptimization
): T {
  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) => {
      const title = String(slot.title ?? "").trim();
      if (!title || title === "—") return slot;
      const { maps_url, lat, lng, address } = mapsFields(title, destination, seed);
      const updates: Record<string, unknown> = { maps_url };
      if (lat != null) { updates.lat = lat; updates.lng = lng; }
      if (address) updates.address = address;
      return { ...slot, ...updates } as typeof slot;
    })
  );

  const hotel_suggestions = itinerary.hotel_suggestions.map((h) => {
    let coords = lookupCoords(h.name, seed);
    if (!coords && routeOptimization?.hotel_candidates.length) {
      const cand = routeOptimization.hotel_candidates.find((c) => hotelNameMatches(c.name, h.name));
      if (cand) coords = { lat: cand.lat, lng: cand.lng };
    }
    if (coords) {
      return {
        ...h,
        maps_url: buildMapsUrl(h.name, coords),
        lat: coords.lat,
        lng: coords.lng,
      };
    }
    const fallback = mapsFields(h.name, destination, seed);
    return { ...h, maps_url: fallback.maps_url, ...(fallback.lat != null ? { lat: fallback.lat, lng: fallback.lng } : {}) };
  });

  const pricingMeta = itinerary.pricing_meta as
    | { suggested_places?: Array<{ name: string; maps_url?: string }> }
    | undefined;
  let pricing_meta = itinerary.pricing_meta;
  if (pricingMeta?.suggested_places?.length) {
    pricing_meta = {
      ...itinerary.pricing_meta,
      suggested_places: pricingMeta.suggested_places.map((p) => {
        const { maps_url, lat, lng } = mapsFields(p.name, destination, seed);
        return { ...p, maps_url, ...(lat != null ? { lat, lng } : {}) };
      }),
    };
  }

  return { ...itinerary, days, hotel_suggestions, pricing_meta: pricing_meta ?? itinerary.pricing_meta } as T;
}

/** Gắn maps_url từ tọa độ VietMap đã có (route matrix) — không gọi API. */
export async function applyCoordMapsToItinerary<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string,
  routeOptimization?: TripRouteOptimization
): Promise<T> {
  const seed = await buildCoordSeed(destination, routeOptimization);
  if (seed.size === 0) return itinerary;
  return applyCoordMapsFromSeed(itinerary, destination, seed, routeOptimization);
}

/** Gắn lat/lng lên slot trước resolve ảnh agenda — dùng seed routeOptimization + food pool rồi geocode phần thiếu. */
export async function prepareItineraryCoordsForMedia<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string,
  routeOptimization?: TripRouteOptimization
): Promise<T> {
  let prepared = await applyCoordMapsToItinerary(itinerary, destination, routeOptimization);
  prepared = await enrichItineraryWithCoordinates(prepared, destination, routeOptimization);
  return prepared;
}

/** VietMap geocode (Nominatim fallback) → Google Maps URL theo tọa độ. */
export async function enrichItineraryWithCoordinates<T extends GeneratedItinerary>(
  itinerary: T,
  destination: string,
  routeOptimization?: TripRouteOptimization
): Promise<T> {
  const seed = await buildCoordSeed(destination, routeOptimization);

  let focus: { lat: number; lng: number } | null = null;
  const known = resolveCityFocus(destination);
  if (known) {
    focus = { lat: known.lat, lng: known.lng };
  } else {
    try {
      const dest = await resolveDestinationCoords(destination);
      focus = { lat: dest.lat, lng: dest.lng };
    } catch {
      /* optional bias */
    }
  }

  for (const name of collectPlaceNames(itinerary)) {
    if (lookupCoords(name, seed)) continue;
    const coords = await resolveCoordinates(name, destination, focus);
    if (coords) seed.set(normalizePlaceKey(name), { lat: coords.lat, lng: coords.lng });
  }

  return applyCoordMapsFromSeed(itinerary, destination, seed, routeOptimization);
}

/** Build seed gộp: food pool (ưu tiên) + route optimization coords. */
async function buildCoordSeed(
  destination: string,
  routeOptimization?: TripRouteOptimization
): Promise<CoordSeed> {
  const seed = buildCoordSeedFromRoute(routeOptimization);
  try {
    const foodSeed = await getFoodPlaceSeed(destination);
    for (const [key, value] of foodSeed) {
      // Food pool ghi đè route coords vì có địa chỉ DB chính xác hơn.
      seed.set(key, value);
    }
  } catch {
    // Food pool optional — không làm fail coord enrichment.
  }
  return seed;
}
