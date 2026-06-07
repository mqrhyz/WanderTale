import { getSupabase } from "../lib/supabase.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import { estimateCrowdedness } from "./crowdedness.js";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import type { TripGenerationContext } from "./tripGenerationContext.js";
import { getDayActivities, inferSlotBucket } from "./tripAgendaActivities.js";

function slotTitle(slot: unknown): string | null {
  if (!slot || typeof slot !== "object") return null;
  const title = (slot as { title?: unknown }).title;
  return typeof title === "string" && title.length > 0 ? title : null;
}

function slotTypes(slot: unknown): string[] {
  if (!slot || typeof slot !== "object") return ["tourist_attraction"];
  const types = (slot as { types?: unknown }).types;
  return Array.isArray(types) ? (types.filter((t) => typeof t === "string") as string[]) : ["tourist_attraction"];
}

function slotString(slot: unknown, key: "summary" | "place_id"): string | null {
  if (!slot || typeof slot !== "object") return null;
  const value = (slot as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function slotNumber(slot: unknown, key: "estimated_cost"): number | null {
  if (!slot || typeof slot !== "object") return null;
  const value = (slot as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

export async function persistGeneratedTrip(params: {
  userId: string;
  body: TripGenerateInput;
  context: TripGenerationContext;
  itinerary: GeneratedItinerary & { pricing_meta?: unknown };
  generationStatus?: "generating" | "pricing_pending" | "ready" | "failed";
  hotelPricingStatus?: string | null;
}) {
  const { userId, body, context, itinerary, generationStatus = "ready", hotelPricingStatus = null } = params;
  const sb = getSupabase();

  const { data: trip, error: tripErr } = await sb
    .from("trips")
    .insert({
      user_id: userId,
      destination: body.destination,
      destination_lat: context.lat,
      destination_lng: context.lng,
      start_date: body.start_date,
      end_date: body.end_date,
      budget: body.budget,
      preferences: body.preferences,
      travelers: body.travelers,
      pace: body.pace,
      summary: itinerary.summary,
      total_estimated_cost: itinerary.total_estimated_cost,
      risk_warnings: itinerary.risk_warnings,
      itinerary_json: itinerary as unknown as Record<string, unknown>,
      generation_status: generationStatus,
      hotel_pricing_status: hotelPricingStatus,
    })
    .select("*")
    .single();
  if (tripErr) throw new Error(tripErr.message);

  const tripId = trip.id as string;

  const { error: weatherErr } = await sb.from("weather_snapshots").insert({
    trip_id: tripId,
    lat: context.lat,
    lng: context.lng,
    payload: context.weather as Record<string, unknown>,
  });
  if (weatherErr) throw new Error(weatherErr.message);

  if (itinerary.days.length < context.dates.length) {
    throw new Error(`AI returned ${itinerary.days.length} days but trip needs ${context.dates.length}`);
  }

  for (let i = 0; i < context.dates.length; i++) {
    const day = itinerary.days[i]!;
    const tripDate = context.dates[i]!;
    const { data: dayRow, error: dayErr } = await sb
      .from("trip_days")
      .insert({
        trip_id: tripId,
        day_index: day.day,
        trip_date: tripDate,
        theme: day.theme,
        morning: day.morning as object,
        afternoon: day.afternoon as object,
        evening: day.evening as object,
      })
      .select("*")
      .single();
    if (dayErr) throw new Error(dayErr.message);

    const activityRows: Array<Record<string, unknown>> = [];
    let order = 0;
    for (const slotData of getDayActivities(day)) {
      const title = slotTitle(slotData);
      if (!title) continue;

      const localDt = new Date(`${tripDate}T12:00:00.000Z`);
      const crowd = estimateCrowdedness({ placeTypes: slotTypes(slotData), localDt });
      const startTime = typeof slotData.start_time === "string" ? slotData.start_time : null;
      const endTime = typeof slotData.end_time === "string" ? slotData.end_time : null;
      activityRows.push({
        trip_day_id: dayRow.id as string,
        slot: inferSlotBucket(startTime),
        sort_order: order++,
        title,
        description: slotString(slotData, "summary"),
        place_id: slotString(slotData, "place_id"),
        start_time: startTime,
        end_time: endTime,
        estimated_cost: slotNumber(slotData, "estimated_cost"),
        crowdedness_score: crowd.score,
        meta: { crowdedness: crowd, slot_raw: slotData },
      });
    }

    if (activityRows.length > 0) {
      const { error: activityErr } = await sb.from("trip_activities").insert(activityRows);
      if (activityErr) throw new Error(activityErr.message);
    }
  }

  return trip;
}

/** Cập nhật lịch sau khi quét OTA nền (P2). Merge giữ lại image_preview_url đã enrich. */
export async function updateTripAfterOtaPricing(params: {
  userId: string;
  tripId: string;
  itinerary: GeneratedItinerary & { pricing_meta?: unknown };
  hotelPricingStatus: string;
  generationStatus?: "generating" | "pricing_pending" | "ready" | "failed";
}) {
  const sb = getSupabase();

  // Đọc itinerary hiện tại để merge image_preview_url đã có (tránh mất ảnh).
  const { data: current } = await sb
    .from("trips")
    .select("itinerary_json")
    .eq("id", params.tripId)
    .eq("user_id", params.userId)
    .maybeSingle();

  const merged = mergeSlotImages(params.itinerary, current?.itinerary_json as GeneratedItinerary | null);

  const { error } = await sb
    .from("trips")
    .update({
      summary: merged.summary,
      total_estimated_cost: merged.total_estimated_cost,
      risk_warnings: merged.risk_warnings,
      itinerary_json: merged as unknown as Record<string, unknown>,
      generation_status: params.generationStatus ?? "ready",
      hotel_pricing_status: params.hotelPricingStatus,
    })
    .eq("id", params.tripId)
    .eq("user_id", params.userId);
  if (error) throw new Error(error.message);
}

/** Giữ lại image_preview_url/image_preview_urls đã có trong DB khi write mới. */
function mergeSlotImages(
  incoming: GeneratedItinerary & { pricing_meta?: unknown },
  existing: GeneratedItinerary | null | undefined,
): GeneratedItinerary & { pricing_meta?: unknown } {
  if (!existing?.days?.length) return incoming;

  // Build map title → images từ existing
  const imageMap = new Map<string, { url?: string; urls?: string[] }>();
  for (const day of existing.days) {
    for (const slot of (day as { activities?: Array<Record<string, unknown>> }).activities ?? []) {
      const title = String(slot.title ?? "").trim().toLowerCase();
      if (!title) continue;
      const url = slot.image_preview_url as string | undefined;
      const urls = slot.image_preview_urls as string[] | undefined;
      if (url || urls?.length) imageMap.set(title, { url, urls });
    }
  }

  if (imageMap.size === 0) return incoming;

  const days = incoming.days.map((day) => {
    const activities = ((day as { activities?: Array<Record<string, unknown>> }).activities ?? []).map((slot) => {
      const title = String(slot.title ?? "").trim().toLowerCase();
      const cached = imageMap.get(title);
      if (!cached) return slot;
      return {
        ...slot,
        image_preview_url: slot.image_preview_url || cached.url,
        image_preview_urls: (slot.image_preview_urls as string[] | undefined)?.length
          ? slot.image_preview_urls
          : cached.urls,
      };
    });
    return { ...day, activities };
  });

  return { ...incoming, days } as GeneratedItinerary & { pricing_meta?: unknown };
}

export async function markTripGenerationFailed(userId: string, tripId: string, message: string): Promise<void> {
  const sb = getSupabase();
  await sb
    .from("trips")
    .update({
      generation_status: "failed",
      hotel_pricing_status: "error",
      risk_warnings: [message.slice(0, 200)],
    })
    .eq("id", tripId)
    .eq("user_id", userId);
}
