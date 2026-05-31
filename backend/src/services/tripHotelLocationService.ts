import { otaSearchLabel, resolveCityFocus } from "@wander-tale/hotel-booking-agent";
import { geocodeNearFocus, haversineKm, isVietmapConfigured, matrixRoutes } from "../lib/vietmap.js";
import type { HotelOffer } from "@wander-tale/hotel-booking-agent";
import { getDayActivities } from "./tripAgendaActivities.js";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import type { SuggestedPlace } from "./tripSuggestPlaces.js";
import { resolveDestinationCoords } from "./weatherService.js";

const MAX_PLACES = 12;
const MAX_OTA_HOTELS = 10;
/** POI / KS phải nằm trong bán kính này quanh điểm đến (km). */
const MAX_PLACE_RADIUS_KM = 50;
const MAX_HOTEL_RADIUS_KM = 45;
/** Ẩn outlier trên UI + khi tính TB (km đường bộ). */
const MAX_MATRIX_SCORE_KM = 50;

export type PlaceCoord = {
  name: string;
  lat: number;
  lng: number;
  day?: number;
};

export type PlaceDistanceFromHotel = {
  place_name: string;
  distance_km: number;
  duration_min: number;
};

export type ScoredHotelCandidate = {
  name: string;
  display: string;
  lat: number;
  lng: number;
  avg_distance_km: number;
  max_distance_km: number;
  total_drive_min: number;
  distances_to_places: PlaceDistanceFromHotel[];
  /** Tên trên OTA (có thể khác VietMap display). */
  ota_hotel_name?: string;
};

export type TripRouteOptimization = {
  status: "ok" | "skipped" | "error";
  message?: string;
  activity_centroid?: { lat: number; lng: number };
  places: PlaceCoord[];
  hotel_candidates: ScoredHotelCandidate[];
  /** KS OTA có vị trí tốt nhất (theo khoảng cách TB). */
  recommended_hotel_names: string[];
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function hotelNameMatches(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((t) => t.length > 2));
  const tb = nb.split(" ").filter((t) => t.length > 2);
  if (ta.size === 0 || tb.length === 0) return false;
  const overlap = tb.filter((t) => ta.has(t)).length;
  return overlap / Math.max(tb.length, 1) >= 0.5;
}

function centroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } | null {
  if (points.length === 0) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

async function resolveTripFocus(
  destination: string
): Promise<{ lat: number; lng: number; label: string }> {
  const known = resolveCityFocus(destination);
  if (known) return { lat: known.lat, lng: known.lng, label: known.label };
  const dest = await resolveDestinationCoords(destination);
  return {
    lat: dest.lat,
    lng: dest.lng,
    label: dest.formatted_address ?? otaSearchLabel(destination),
  };
}

async function resolvePlaceCoords(
  names: string[],
  destination: string,
  dayByName?: Map<string, number>
): Promise<PlaceCoord[]> {
  const coords: PlaceCoord[] = [];
  const seen = new Set<string>();
  const focus = await resolveTripFocus(destination);
  const destLabel = focus.label;

  for (const raw of names.slice(0, MAX_PLACES)) {
    const name = raw.trim();
    const key = normalizeName(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    try {
      const geo = await geocodeNearFocus(`${name}, ${destLabel}`, focus, {
        maxRadiusKm: MAX_PLACE_RADIUS_KM,
      });
      const straightKm = haversineKm(focus, { lat: geo.lat, lng: geo.lng });
      if (straightKm > MAX_PLACE_RADIUS_KM * 1.5) {
        console.warn("[route-score] place too far, skip:", name, straightKm.toFixed(1), "km");
        continue;
      }
      coords.push({ name, lat: geo.lat, lng: geo.lng, day: dayByName?.get(name) });
    } catch (e) {
      console.warn("[route-score] geocode place failed:", name, e instanceof Error ? e.message : e);
    }
  }
  return coords;
}

function otaNamesForScoring(offers: HotelOffer[]): string[] {
  const names: string[] = [];
  const add = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (names.some((x) => hotelNameMatches(x, name))) return;
    names.push(name);
  };

  // Luôn geocode ít nhất 1 KS / site (tránh Vntrip bị lọt khi Booking/Agoda chiếm hết quota).
  for (const site of ["booking", "agoda", "vntrip"] as const) {
    const siteOffers = offers.filter((o) => o.site === site);
    if (siteOffers.length === 0) continue;
    const best = [...siteOffers].sort((a, b) => a.priceVnd - b.priceVnd)[0];
    if (best) add(best.hotelName);
  }

  for (const o of [...offers].sort((a, b) => a.priceVnd - b.priceVnd)) {
    add(o.hotelName);
    if (names.length >= MAX_OTA_HOTELS) break;
  }
  return names;
}

async function geocodeOtaHotels(
  hotelNames: string[],
  focus: { lat: number; lng: number; label: string }
): Promise<Array<{ otaName: string; lat: number; lng: number; display: string }>> {
  const out: Array<{ otaName: string; lat: number; lng: number; display: string }> = [];
  for (const otaName of hotelNames) {
    try {
      const geo = await geocodeNearFocus(`${otaName}, ${focus.label}`, focus, {
        maxRadiusKm: MAX_HOTEL_RADIUS_KM,
      });
      out.push({
        otaName,
        lat: geo.lat,
        lng: geo.lng,
        display: geo.formatted_address || otaName,
      });
    } catch (e) {
      console.warn("[route-score] geocode hotel failed:", otaName, e instanceof Error ? e.message : e);
    }
  }
  return out;
}

function summarizeDistances(rows: PlaceDistanceFromHotel[]) {
  const valid = rows.filter((d) => d.distance_km <= MAX_MATRIX_SCORE_KM);
  if (valid.length === 0) {
    return { avg_distance_km: 0, max_distance_km: 0, total_drive_min: 0, distances_to_places: [] as PlaceDistanceFromHotel[] };
  }
  const totalDist = valid.reduce((s, d) => s + d.distance_km, 0);
  const totalDur = valid.reduce((s, d) => s + d.duration_min, 0);
  return {
    avg_distance_km: Math.round((totalDist / valid.length) * 10) / 10,
    max_distance_km: Math.round(Math.max(...valid.map((d) => d.distance_km)) * 10) / 10,
    total_drive_min: totalDur,
    distances_to_places: valid.sort((a, b) => a.distance_km - b.distance_km),
  };
}

function scoreHotelsWithMatrix(
  hotels: Array<{ otaName: string; display: string; lat: number; lng: number }>,
  places: PlaceCoord[],
  matrix: { distances: number[][]; durations: number[][] }
): ScoredHotelCandidate[] {
  const hCount = hotels.length;
  const scored: ScoredHotelCandidate[] = [];

  for (let hi = 0; hi < hCount; hi++) {
    const raw: PlaceDistanceFromHotel[] = [];

    for (let pi = 0; pi < places.length; pi++) {
      const matrixPi = hCount + pi;
      const distM = matrix.distances[hi]?.[matrixPi] ?? 0;
      const durS = matrix.durations[hi]?.[matrixPi] ?? 0;
      const distKm = Math.round((distM / 1000) * 10) / 10;
      const durMin = Math.round(durS / 60);
      raw.push({
        place_name: places[pi].name,
        distance_km: distKm,
        duration_min: durMin,
      });
    }

    const summary = summarizeDistances(raw);
    scored.push({
      name: hotels[hi].otaName,
      display: hotels[hi].display,
      lat: hotels[hi].lat,
      lng: hotels[hi].lng,
      ota_hotel_name: hotels[hi].otaName,
      ...summary,
    });
  }

  return scored.sort((a, b) => {
    if (a.avg_distance_km !== b.avg_distance_km) return a.avg_distance_km - b.avg_distance_km;
    return a.max_distance_km - b.max_distance_km;
  });
}

/**
 * Sau khi agent OTA quét phòng — VietMap Matrix xếp hạng KS theo khoảng cách tới điểm gợi ý.
 */
export async function scoreOtaHotelsForTrip(params: {
  destination: string;
  suggestedPlaces: SuggestedPlace[];
  itinerary?: GeneratedItinerary;
  offers: HotelOffer[];
}): Promise<TripRouteOptimization> {
  const empty: TripRouteOptimization = {
    status: "skipped",
    places: [],
    hotel_candidates: [],
    recommended_hotel_names: [],
  };

  if (!isVietmapConfigured()) {
    return { ...empty, message: "VIETMAP chưa cấu hình" };
  }

  if (params.offers.length === 0) {
    return { ...empty, message: "Chưa có phòng OTA để xếp hạng vị trí" };
  }

  const { destination, suggestedPlaces, itinerary, offers } = params;
  const dayByName = new Map(suggestedPlaces.map((p) => [p.name, p.day ?? 0]));
  const names: string[] = suggestedPlaces.map((p) => p.name);

  if (itinerary) {
    for (const d of itinerary.days) {
      for (const slot of getDayActivities(d)) {
        const t = slot.title?.trim();
        if (t && t !== "—" && !names.includes(t)) names.push(t);
      }
    }
  }

  const places = await resolvePlaceCoords(names, destination, dayByName);
  if (places.length === 0) {
    return { ...empty, message: "Không geocode được điểm tham quan" };
  }

  const tripFocus = await resolveTripFocus(destination);
  const otaNames = otaNamesForScoring(offers);
  const geocodedHotels = await geocodeOtaHotels(otaNames, tripFocus);
  if (geocodedHotels.length === 0) {
    return {
      ...empty,
      places,
      message: "Không geocode được vị trí khách sạn từ OTA",
    };
  }

  const center = centroid(places) ?? { lat: tripFocus.lat, lng: tripFocus.lng };

  try {
    const allPoints = [
      ...geocodedHotels.map((h) => ({ lat: h.lat, lng: h.lng })),
      ...places.map((p) => ({ lat: p.lat, lng: p.lng })),
    ];
    const matrix = await matrixRoutes(allPoints);
    const hotel_candidates = scoreHotelsWithMatrix(geocodedHotels, places, matrix);
    const recommended_hotel_names = hotel_candidates.slice(0, 5).map((h) => h.ota_hotel_name ?? h.name);

    console.info(
      `[route-score] ota=${geocodedHotels.length} places=${places.length} best=${recommended_hotel_names[0] ?? "—"} avg=${hotel_candidates[0]?.avg_distance_km ?? "—"}km`
    );

    return {
      status: "ok",
      activity_centroid: center,
      places,
      hotel_candidates,
      recommended_hotel_names,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[route-score] matrix failed:", message);
    return {
      status: "error",
      message,
      activity_centroid: center,
      places,
      hotel_candidates: [],
      recommended_hotel_names: [],
    };
  }
}

/** @deprecated — dùng scoreOtaHotelsForTrip sau OTA scrape */
export async function optimizeHotelLocationForTrip(params: {
  destination: string;
  suggestedPlaces: SuggestedPlace[];
  itinerary?: GeneratedItinerary;
  offers?: HotelOffer[];
}): Promise<TripRouteOptimization> {
  if (params.offers?.length) {
    return scoreOtaHotelsForTrip({ ...params, offers: params.offers });
  }
  return {
    status: "skipped",
    places: [],
    hotel_candidates: [],
    recommended_hotel_names: [],
    message: "Chờ quét OTA trước khi xếp hạng vị trí",
  };
}
