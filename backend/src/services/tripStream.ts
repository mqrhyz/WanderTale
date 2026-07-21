import type { TripGenerateInput } from "../schemas/trip.js";
import { runTripGenerationStaged } from "./tripGenerationPipeline.js";

/** SSE status-only — dùng staged pipeline. */
export async function* streamTripGeneration(
  userId: string,
  body: TripGenerateInput
): AsyncGenerator<
  | { type: "status"; message: string; phase: string }
  | { type: "done"; trip: { id: string }; status: string; hotel_pricing_status: string }
  | { type: "error"; message: string }
> {
  try {
    yield { type: "status", message: "AI đang lên lịch trình cho bạn…", phase: "itinerary" };
    const result = await runTripGenerationStaged(userId, body);
    yield {
      type: "done",
      trip: result.trip,
      status: result.status,
      hotel_pricing_status: String(result.hotel_pricing_status),
    };
  } catch (e) {
    yield { type: "error", message: e instanceof Error ? e.message : "generate_failed" };
  }
}
