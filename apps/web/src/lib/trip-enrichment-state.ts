import type { GeneratedItinerary } from "@wander-tale/shared/types";
import { agendaNeedsPlaceMedia, agendaNeedsSpecificPlaces } from "./trip-agenda-activities";

/** Thời gian tối đa job OTA nền — quá hạn không poll/quét lại khi mở chuyến cũ. */
export const OTA_BACKGROUND_MAX_MS = 30 * 60 * 1000;

type TripOtaFields = {
  generation_status?: string | null;
  hotel_pricing_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type TripPollFields = TripOtaFields & {
  itinerary_json?: GeneratedItinerary | null;
};

function tripTimestampMs(trip: TripOtaFields): number | null {
  const raw = trip.updated_at ?? trip.created_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Chỉ enrich ảnh/Maps cho chuyến vừa tạo — chuyến cũ hoặc đã `ready` thì không quét lại. */
function tripWithinEnrichmentWindow(trip: TripOtaFields): boolean {
  const status = trip.generation_status ?? "";
  if (status === "ready" || status === "failed") return false;
  const ts = tripTimestampMs(trip);
  if (ts == null) return false;
  return Date.now() - ts < OTA_BACKGROUND_MAX_MS;
}

/** Chỉ poll OTA cho chuyến vừa tạo (job nền còn trong cửa sổ thời gian). */
export function tripNeedsOtaPolling(trip: TripOtaFields): boolean {
  const status = trip.generation_status ?? "";
  if (status === "ready" || status === "failed") return false;

  const otaActive =
    status === "pricing_pending" ||
    status === "generating" ||
    trip.hotel_pricing_status === "pending";
  if (!otaActive) return false;

  return tripWithinEnrichmentWindow(trip);
}

function hotelNeedsGallery(it?: GeneratedItinerary | null): boolean {
  const hotels = it?.hotel_suggestions ?? [];
  return hotels.length > 0 && hotels.some((h) => !h.image_preview_urls?.length);
}

/** Poll ảnh địa điểm / Maps — chỉ trong cửa sổ enrich sau khi tạo chuyến. */
export function tripNeedsMediaPolling(trip: TripPollFields): boolean {
  if (!tripWithinEnrichmentWindow(trip)) return false;
  const it = trip.itinerary_json;
  if (!it) return false;
  if (hotelNeedsGallery(it)) return true;
  if (agendaNeedsSpecificPlaces(it)) return true;
  if (agendaNeedsPlaceMedia(it)) return true;
  return false;
}

export function tripNeedsLivePolling(trip: TripPollFields): boolean {
  return tripNeedsOtaPolling(trip) || tripNeedsMediaPolling(trip);
}
