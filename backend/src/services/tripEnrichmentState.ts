/** Thời gian tối đa job OTA nền sau khi tạo chuyến — quá hạn coi như xong, không quét lại khi mở detail. */
export const OTA_BACKGROUND_MAX_MS = 30 * 60 * 1000;

type TripOtaFields = {
  generation_status?: string | null;
  hotel_pricing_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function tripTimestampMs(trip: TripOtaFields): number | null {
  const raw = trip.updated_at ?? trip.created_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Job OTA nền còn đang chạy (chuyến vừa tạo, chưa quá hạn). */
export function tripHasActiveOtaJob(trip: TripOtaFields): boolean {
  const status = trip.generation_status ?? "";
  if (status === "ready" || status === "failed") return false;
  if (status !== "pricing_pending" && status !== "generating") {
    return status === "" && trip.hotel_pricing_status === "pending";
  }
  const ts = tripTimestampMs(trip);
  if (ts == null) return false;
  return Date.now() - ts < OTA_BACKGROUND_MAX_MS;
}

/** Chuyến cũ kẹt pricing_pending — không quét lại, đánh dấu ready. */
export function tripNeedsStaleOtaFinalize(trip: TripOtaFields): boolean {
  const status = trip.generation_status ?? "";
  const hotelPending = trip.hotel_pricing_status === "pending";

  if (status === "ready" || status === "failed") {
    return hotelPending;
  }

  if (status !== "pricing_pending" && status !== "generating") {
    return false;
  }

  const ts = tripTimestampMs(trip);
  if (ts == null) return true;
  return Date.now() - ts >= OTA_BACKGROUND_MAX_MS;
}
