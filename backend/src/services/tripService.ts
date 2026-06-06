import { getSupabase } from "../lib/supabase.js";
import { buildStaticMapUrl } from "./googleMaps.js";
import type { TripGenerateInput, TripUpdateInput } from "../schemas/trip.js";
import {
  runTripGeneration,
  runTripGenerationStaged,
  useStagedTripGeneration,
} from "./tripGenerationPipeline.js";
import { enrichTripWithCoverImage, enrichTripsWithCoverImages } from "./tripCoverImageService.js";
import { tripNeedsStaleOtaFinalize } from "./tripEnrichmentState.js";

type TripRow = Record<string, unknown> & {
  id: string;
  destination: string;
  generation_status?: string | null;
  hotel_pricing_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Chuyến cũ kẹt pricing_pending — đánh dấu ready, không quét OTA lại khi mở detail. */
async function finalizeStaleTripOtaIfNeeded(userId: string, trip: TripRow): Promise<TripRow> {
  if (!tripNeedsStaleOtaFinalize(trip)) return trip;

  const sb = getSupabase();
  const hotelStatus =
    trip.hotel_pricing_status === "pending" ? "skipped" : (trip.hotel_pricing_status ?? "skipped");

  const { error } = await sb
    .from("trips")
    .update({
      generation_status: "ready",
      hotel_pricing_status: hotelStatus,
    })
    .eq("id", trip.id)
    .eq("user_id", userId);
  if (error) {
    console.warn("[trip] finalize stale OTA failed:", trip.id, error.message);
    return trip;
  }

  return {
    ...trip,
    generation_status: "ready",
    hotel_pricing_status: hotelStatus,
  };
}

export async function listTrips(userId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("trips")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return enrichTripsWithCoverImages(data ?? []);
}

export async function getTrip(userId: string, tripId: string) {
  const sb = getSupabase();
  const { data: trip, error: tErr } = await sb
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();
  if (tErr) throw new Error(tErr.message);
  if (!trip) return null;

  const finalized = await finalizeStaleTripOtaIfNeeded(userId, trip as TripRow);

  const { data: days, error: dErr } = await sb
    .from("trip_days")
    .select("*, trip_activities(*)")
    .eq("trip_id", tripId)
    .order("day_index", { ascending: true });
  if (dErr) throw new Error(dErr.message);

  const lat = finalized.destination_lat as number | null;
  const lng = finalized.destination_lng as number | null;
  const map_preview_url =
    lat != null && lng != null ? buildStaticMapUrl(lat, lng) : null;

  const withCover = await enrichTripWithCoverImage(finalized as TripRow);
  return { ...withCover, trip_days: days ?? [], map_preview_url };
}

export async function updateTrip(userId: string, tripId: string, patch: TripUpdateInput) {
  const sb = getSupabase();
  const row: Record<string, unknown> = {};
  if (patch.destination !== undefined) row.destination = patch.destination;
  if (patch.start_date !== undefined) row.start_date = patch.start_date;
  if (patch.end_date !== undefined) row.end_date = patch.end_date;
  if (patch.budget !== undefined) row.budget = patch.budget;
  if (patch.preferences !== undefined) row.preferences = patch.preferences;
  if (patch.travelers !== undefined) row.travelers = patch.travelers;
  if (patch.pace !== undefined) row.pace = patch.pace;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.total_estimated_cost !== undefined) row.total_estimated_cost = patch.total_estimated_cost;
  if (patch.risk_warnings !== undefined) row.risk_warnings = patch.risk_warnings;
  if (patch.itinerary_json !== undefined) row.itinerary_json = patch.itinerary_json;

  const { data, error } = await sb
    .from("trips")
    .update(row)
    .eq("id", tripId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTrip(userId: string, tripId: string) {
  const sb = getSupabase();
  const { error } = await sb.from("trips").delete().eq("id", tripId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function duplicateTrip(userId: string, tripId: string) {
  const existing = await getTrip(userId, tripId);
  if (!existing) return null;
  const sb = getSupabase();

  const { trip_days: _omit, ...tripRow } = existing as Record<string, unknown>;
  delete tripRow.id;
  delete tripRow.created_at;
  delete tripRow.updated_at;
  tripRow.user_id = userId;
  tripRow.generation_status = "ready";
  if (tripRow.hotel_pricing_status === "pending") {
    tripRow.hotel_pricing_status = "skipped";
  }

  const { data: newTrip, error: insErr } = await sb.from("trips").insert(tripRow).select("*").single();
  if (insErr) throw new Error(insErr.message);
  const newId = newTrip.id as string;

  const days = (existing as { trip_days?: Array<Record<string, unknown>> }).trip_days ?? [];
  for (const d of days) {
    const acts = (d.trip_activities as unknown[]) ?? [];
    const { trip_activities: _a, id: _oid, trip_id: _tid, ...dayRest } = d;
    const { data: newDay, error: dIns } = await sb
      .from("trip_days")
      .insert({
        ...dayRest,
        trip_id: newId,
      })
      .select("*")
      .single();
    if (dIns) throw new Error(dIns.message);
    const newDayId = newDay.id as string;
    for (const act of acts) {
      const { id: _aid, trip_day_id: _td, ...actRest } = act as Record<string, unknown>;
      const { error: aIns } = await sb.from("trip_activities").insert({
        ...actRest,
        trip_day_id: newDayId,
      });
      if (aIns) throw new Error(aIns.message);
    }
  }

  return getTrip(userId, newId);
}

export async function generateTrip(userId: string, body: TripGenerateInput) {
  const staged = useStagedTripGeneration(body);
  const result = staged
    ? await runTripGenerationStaged(userId, body)
    : await runTripGeneration(userId, body);

  return {
    trip: result.trip,
    status: result.status,
    itinerary: result.itinerary,
    suggested_places: result.suggested_places,
    hotel_pricing_status: result.hotel_pricing_status,
    staged,
  };
}

export async function dashboardStats(userId: string) {
  const sb = getSupabase();
  const { data: trips, error } = await sb
    .from("trips")
    .select("id, budget, destination, itinerary_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const list = trips ?? [];
  const totalTrips = list.length;
  const totalBudget = list.reduce((s, t) => s + Number(t.budget ?? 0), 0);
  const destinations = new Set(list.map((t) => t.destination as string)).size;

  // Count places from itinerary_json (fast, no extra DB query).
  let placesVisited = 0;
  for (const trip of list) {
    const itinerary = trip.itinerary_json as { days?: Array<{ activities?: unknown[] }> } | null;
    if (itinerary?.days) {
      for (const day of itinerary.days) {
        placesVisited += Array.isArray(day.activities) ? day.activities.length : 0;
      }
    }
  }

  return {
    total_trips: totalTrips,
    total_budget_planned: totalBudget,
    unique_destinations: destinations,
    places_in_itineraries: placesVisited,
    recent_trips: list.slice(0, 5),
  };
}
