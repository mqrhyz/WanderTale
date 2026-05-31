export type TripGenerationStatus = "generating" | "pricing_pending" | "ready" | "failed";

export type TripHotelPricingStatus =
  | "pending"
  | "ok"
  | "cached"
  | "empty"
  | "timeout"
  | "error"
  | "skipped";

export function isTripPricingPending(status: string | null | undefined): boolean {
  return status === "pricing_pending" || status === "generating";
}
