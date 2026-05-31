import type { ComparisonResult, HotelOffer } from "@wander-tale/hotel-booking-agent";
import { dedupeRoomAmenities } from "@wander-tale/hotel-booking-agent";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import type { SuggestedPlace } from "./tripSuggestPlaces.js";
import type { TripHotelPricingResult } from "./tripHotelPricing.js";
import { buildGoogleMapsSearchUrl } from "../lib/mapsLinks.js";
import { getDayActivities, iterateDaySlots } from "./tripAgendaActivities.js";
import { hotelNameMatches, type TripRouteOptimization } from "./tripHotelLocationService.js";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

function genericRoomLabel(name?: string): boolean {
  return !name || name === "Giá trên trang tìm kiếm";
}

function offerToHotelSuggestion(
  o: HotelOffer,
  reason?: string,
  destination?: string,
  existing?: { maps_url?: string; image_preview_urls?: string[] }
) {
  const imageUrls =
    o.imagePreviewUrls?.length ? o.imagePreviewUrls : o.imagePreviewUrl ? [o.imagePreviewUrl] : existing?.image_preview_urls;

  return {
    name: o.hotelName,
    category: "hotel" as const,
    url: o.bookingUrl,
    price_level: undefined,
    reason: reason ?? (o.rating ? `★${o.rating}` : undefined),
    place_id: undefined,
    price_vnd: o.priceVnd,
    price_source: "scraped" as const,
    site: o.site,
    scraped_at: o.scrapedAt,
    image_preview_url: o.imagePreviewUrl ?? imageUrls?.[0],
    image_preview_urls: imageUrls,
    maps_url:
      existing?.maps_url ??
      (destination ? buildGoogleMapsSearchUrl(`${o.hotelName} ${destination}`) : undefined),
    room_name: genericRoomLabel(o.roomName) ? undefined : o.roomName,
    room_amenities: o.perks?.length ? dedupeRoomAmenities(o.perks, o.roomName) : undefined,
  };
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchPlaceCost(title: string, places: SuggestedPlace[]): number | undefined {
  const key = normalizeKey(title);
  if (!key) return undefined;
  for (const p of places) {
    const pk = normalizeKey(p.name);
    if (pk && (key.includes(pk) || pk.includes(key))) {
      return p.estimated_cost_vnd;
    }
  }
  return undefined;
}

function enrichSlot(slot: Record<string, unknown>, places: SuggestedPlace[]): Record<string, unknown> {
  const title = typeof slot.title === "string" ? slot.title : "";
  const cost = matchPlaceCost(title, places);
  const existing = typeof slot.estimated_cost === "number" ? slot.estimated_cost : undefined;
  const priceVnd = cost ?? existing;
  return {
    ...slot,
    estimated_cost: priceVnd,
    price_vnd: priceVnd,
    price_source: cost != null ? "estimated" : existing != null ? "ai" : undefined,
  };
}

const DISPLAY_SITE_ORDER = ["booking", "agoda", "vntrip"] as const;

function distanceScoreForOffer(o: HotelOffer, routeOpt?: TripRouteOptimization): number | null {
  if (!routeOpt?.hotel_candidates.length) return null;
  const cand = routeOpt.hotel_candidates.find((c) => hotelNameMatches(c.name, o.hotelName));
  return cand?.avg_distance_km ?? null;
}

function pickRecommendedByLocation(offers: HotelOffer[], routeOpt?: TripRouteOptimization): HotelOffer {
  if (!routeOpt?.hotel_candidates.length) {
    return [...offers].sort((a, b) => a.priceVnd - b.priceVnd)[0]!;
  }
  const ranked = [...offers]
    .map((o) => ({ o, dist: distanceScoreForOffer(o, routeOpt) }))
    .filter((x): x is { o: HotelOffer; dist: number } => x.dist != null)
    .sort((a, b) => {
      if (a.dist !== b.dist) return a.dist - b.dist;
      return a.o.priceVnd - b.o.priceVnd;
    });
  return ranked[0]?.o ?? [...offers].sort((a, b) => a.priceVnd - b.priceVnd)[0]!;
}

/** Hiển thị tối đa 6 KS — ưu tiên vị trí (VietMap) rồi giá / site. */
function pickDisplayHotels(
  offers: HotelOffer[],
  _comparison: ComparisonResult | null,
  destination: string | undefined,
  existingByUrl: Map<string, { maps_url?: string; image_preview_urls?: string[] }>,
  routeOpt?: TripRouteOptimization,
  max = 6
) {
  if (offers.length === 0) return [];

  const recommended = pickRecommendedByLocation(offers, routeOpt);
  const sorted = [...offers].sort((a, b) => {
    const da = distanceScoreForOffer(a, routeOpt);
    const db = distanceScoreForOffer(b, routeOpt);
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return a.priceVnd - b.priceVnd;
  });

  const perSite = new Map<string, HotelOffer>();
  for (const o of offers) {
    const cur = perSite.get(o.site);
    if (!cur || o.priceVnd < cur.priceVnd) perSite.set(o.site, o);
  }

  const picked: HotelOffer[] = [];
  const seen = new Set<string>();

  const add = (o?: HotelOffer) => {
    if (!o) return;
    const k = `${o.site}:${o.bookingUrl}`;
    if (seen.has(k)) return;
    seen.add(k);
    picked.push(o);
  };

  add(recommended);
  for (const site of DISPLAY_SITE_ORDER) {
    const siteOffers = sorted.filter((o) => o.site === site);
    const bestLocated = siteOffers.find((o) => distanceScoreForOffer(o, routeOpt) != null) ?? siteOffers[0];
    add(bestLocated ?? perSite.get(site));
  }
  for (const o of sorted) {
    add(o);
    if (picked.length >= max) break;
  }

  return picked.slice(0, max).map((o) => {
    const isRecommended =
      o.bookingUrl === recommended.bookingUrl && o.site === recommended.site;
    const reason = isRecommended
      ? o.rating
        ? `Gợi ý · ★${o.rating}`
        : "Gợi ý"
      : o.rating
        ? `★${o.rating}`
        : undefined;
    return offerToHotelSuggestion(o, reason, destination, existingByUrl.get(o.bookingUrl));
  });
}

function attachRouteDistances(
  hotels: ReturnType<typeof offerToHotelSuggestion>[],
  routeOpt?: TripRouteOptimization
) {
  if (!routeOpt?.hotel_candidates.length) return hotels;
  return hotels.map((h) => {
    const cand = routeOpt.hotel_candidates.find((c) => hotelNameMatches(h.name, c.name));
    if (!cand) return h;
    return {
      ...h,
      avg_distance_km: cand.avg_distance_km,
      max_distance_km: cand.max_distance_km,
    };
  });
}

function appendPricingRisks(
  existing: string[],
  hotelPricing: TripHotelPricingResult,
  routeOpt?: TripRouteOptimization
): string[] {
  const risk = existing.filter(
    (r) =>
      !r.startsWith("Khách sạn được chọn theo khoảng cách") &&
      !r.startsWith("Khách sạn gợi ý gần") &&
      !r.startsWith("Không quét được giá phòng OTA") &&
      !r.startsWith("Quét giá phòng:") &&
      !r.startsWith("OTA Booking:") &&
      !r.startsWith("OTA Agoda:") &&
      !r.startsWith("OTA Vntrip:")
  );

  if (routeOpt?.status === "ok" && routeOpt.recommended_hotel_names.length > 0) {
    const top = routeOpt.recommended_hotel_names[0];
    risk.push(
      `Khách sạn được chọn theo khoảng cách VietMap tới ${routeOpt.places.length} điểm tham quan — ưu tiên: ${top}`
    );
  }
  if (hotelPricing.status === "error" && hotelPricing.message) {
    risk.push(`Quét giá phòng: ${hotelPricing.message.slice(0, 200)}`);
  }
  if (hotelPricing.status === "timeout" && hotelPricing.message) {
    risk.push(hotelPricing.message.slice(0, 200));
  }
  if (hotelPricing.status === "empty") {
    risk.push("Không quét được giá phòng OTA — giá khách sạn trong lịch là ước tính AI.");
  }
  for (const scan of hotelPricing.siteScans ?? []) {
    if (scan.status !== "ok" && scan.error) {
      const label =
        scan.site === "booking" ? "Booking.com" : scan.site === "agoda" ? "Agoda" : "Vntrip.vn";
      const msg = scan.error.replace(new RegExp(`^${label.replace(/\./g, "\\.")}:?\\s*`, "i"), "");
      risk.push(`OTA ${label}: ${msg.slice(0, 120)}`);
    }
  }
  return risk;
}

export function enrichItineraryWithPricing(
  itinerary: GeneratedItinerary,
  suggestedPlaces: SuggestedPlace[],
  hotelPricing: TripHotelPricingResult,
  destination?: string,
  routeOptimization?: TripRouteOptimization
): GeneratedItinerary & {
  pricing_meta: {
    suggested_places: SuggestedPlace[];
    hotel_pricing: TripHotelPricingResult;
    route_optimization?: TripRouteOptimization;
  };
} {
  const days = itinerary.days.map((d) =>
    iterateDaySlots(d, (slot) => enrichSlot(slot as Record<string, unknown>, suggestedPlaces) as typeof slot)
  );

  let hotel_suggestions = [...itinerary.hotel_suggestions];
  const existingByUrl = new Map(
    itinerary.hotel_suggestions
      .filter((h) => h.url)
      .map((h) => [
        h.url!,
        {
          maps_url: (h as { maps_url?: string }).maps_url,
          image_preview_urls: (h as { image_preview_urls?: string[] }).image_preview_urls,
        },
      ])
  );

  if (hotelPricing.comparison || hotelPricing.offers.length > 0) {
    const routeOpt = routeOptimization ?? hotelPricing.route_optimization;
    hotel_suggestions = attachRouteDistances(
      pickDisplayHotels(
        hotelPricing.offers,
        hotelPricing.comparison,
        destination,
        existingByUrl,
        routeOpt
      ),
      routeOpt
    ) as GeneratedItinerary["hotel_suggestions"];
  }

  let total = 0;
  for (const d of days) {
    for (const slot of getDayActivities(d)) {
      const cost = slot.estimated_cost;
      if (typeof cost === "number") total += cost;
    }
  }
  if (hotelPricing.comparison) {
    const routeOpt = routeOptimization ?? hotelPricing.route_optimization;
    const rec = pickRecommendedByLocation(hotelPricing.offers, routeOpt);
    total += rec.priceVnd;
  }

  const routeOpt = routeOptimization ?? hotelPricing.route_optimization;
  const risk = appendPricingRisks(itinerary.risk_warnings, hotelPricing, routeOpt);

  return {
    ...itinerary,
    days,
    hotel_suggestions: hotel_suggestions as GeneratedItinerary["hotel_suggestions"],
    total_estimated_cost: total > 0 ? total : itinerary.total_estimated_cost,
    risk_warnings: risk,
    pricing_meta: {
      suggested_places: suggestedPlaces,
      hotel_pricing: hotelPricing,
      route_optimization: routeOpt,
    },
  };
}

export function hotelPricingSummary(comparison: ComparisonResult | null): string | null {
  if (!comparison) return null;
  const r = comparison.recommended;
  return `Phòng đề xuất: ${r.hotelName} (${r.site}) — ${formatVnd(r.priceVnd)}`;
}
