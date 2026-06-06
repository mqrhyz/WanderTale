import { getSupabase } from "../lib/supabase.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import type { GeneratedItinerary } from "./openaiItinerary.js";
import type { TripGenerationContext } from "./tripGenerationContext.js";
import type { SuggestedPlacesPlan } from "./tripSuggestPlaces.js";

export type TripEnrichmentJobPayload = {
  userId: string;
  body: TripGenerateInput;
  context: TripGenerationContext;
  baseItinerary: GeneratedItinerary;
  suggestedPlaces?: SuggestedPlacesPlan["places"];
  loadSuggestedPlaces?: boolean;
};

type JobRow = {
  trip_id: string;
  user_id: string;
  status: string;
  attempts: number;
  payload: TripEnrichmentJobPayload;
};

const memoryJobs = new Map<string, JobRow>();

export async function enqueueTripEnrichment(tripId: string, payload: TripEnrichmentJobPayload): Promise<void> {
  const row: JobRow = {
    trip_id: tripId,
    user_id: payload.userId,
    status: "queued",
    attempts: 0,
    payload,
  };
  memoryJobs.set(tripId, row);

  try {
    await getSupabase().from("trip_enrichment_jobs").upsert(
      {
        trip_id: tripId,
        user_id: payload.userId,
        status: "queued",
        payload,
        error: null,
        last_event_type: "queued",
        last_event_payload: { status: "queued" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "trip_id" }
    );
  } catch (error) {
    console.warn("[trip-job] DB enqueue unavailable; using process memory fallback:", error);
  }
}

export async function getTripEnrichmentJob(tripId: string): Promise<JobRow | null> {
  try {
    const { data, error } = await getSupabase()
      .from("trip_enrichment_jobs")
      .select("trip_id,user_id,status,attempts,payload")
      .eq("trip_id", tripId)
      .maybeSingle();
    if (!error && data) {
      return {
        trip_id: String(data.trip_id),
        user_id: String(data.user_id),
        status: String(data.status),
        attempts: Number(data.attempts ?? 0),
        payload: data.payload as TripEnrichmentJobPayload,
      };
    }
  } catch {
    /* fallback below */
  }
  return memoryJobs.get(tripId) ?? null;
}

export async function tryStartTripEnrichmentJob(tripId: string): Promise<JobRow | null> {
  const job = await getTripEnrichmentJob(tripId);
  if (!job) return null;
  if (job.status === "running") return null;
  if (job.status === "complete") return null;

  const nextAttempts = job.attempts + 1;
  const startedAt = new Date().toISOString();
  memoryJobs.set(tripId, { ...job, attempts: nextAttempts, status: "running" });

  try {
    const { data, error } = await getSupabase()
      .from("trip_enrichment_jobs")
      .update({
        status: "running",
        attempts: nextAttempts,
        locked_at: startedAt,
        started_at: startedAt,
        updated_at: startedAt,
      })
      .eq("trip_id", tripId)
      .in("status", ["queued", "failed"])
      .select("trip_id,user_id,status,attempts,payload")
      .maybeSingle();
    if (!error && data) {
      return {
        trip_id: String(data.trip_id),
        user_id: String(data.user_id),
        status: String(data.status),
        attempts: Number(data.attempts ?? nextAttempts),
        payload: data.payload as TripEnrichmentJobPayload,
      };
    }
  } catch {
    /* DB may be unavailable/migration not applied; memory job can still run. */
  }

  return { ...job, attempts: nextAttempts, status: "running" };
}

export async function markTripEnrichmentJobComplete(tripId: string, payload?: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  const current = memoryJobs.get(tripId);
  if (current) memoryJobs.set(tripId, { ...current, status: "complete" });
  try {
    await getSupabase()
      .from("trip_enrichment_jobs")
      .update({
        status: "complete",
        completed_at: now,
        last_event_type: "complete",
        last_event_payload: payload ?? { status: "ready" },
        updated_at: now,
      })
      .eq("trip_id", tripId);
  } catch {
    /* no-op */
  }
}

export async function markTripEnrichmentJobFailed(tripId: string, message: string): Promise<void> {
  const now = new Date().toISOString();
  const current = memoryJobs.get(tripId);
  if (current) memoryJobs.set(tripId, { ...current, status: "failed" });
  try {
    await getSupabase()
      .from("trip_enrichment_jobs")
      .update({
        status: "failed",
        error: message.slice(0, 500),
        last_event_type: "failed",
        last_event_payload: { error: message },
        updated_at: now,
      })
      .eq("trip_id", tripId);
  } catch {
    /* no-op */
  }
}

export async function recordTripProgress(
  tripId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const current = memoryJobs.get(tripId);
  if (current) memoryJobs.set(tripId, { ...current, status: current.status === "queued" ? "running" : current.status });
  try {
    await getSupabase()
      .from("trip_enrichment_jobs")
      .update({
        last_event_type: eventType,
        last_event_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("trip_id", tripId);
  } catch {
    /* progress DB is best effort; trip rows remain source of truth. */
  }
}

export async function getTripProgressSnapshot(tripId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await getSupabase()
      .from("trip_enrichment_jobs")
      .select("status,attempts,last_event_type,last_event_payload,error,updated_at,completed_at")
      .eq("trip_id", tripId)
      .maybeSingle();
    if (!error && data) return data as Record<string, unknown>;
  } catch {
    /* fallback below */
  }
  const mem = memoryJobs.get(tripId);
  if (!mem) return null;
  return {
    status: mem.status,
    attempts: mem.attempts,
    updated_at: new Date().toISOString(),
  };
}
