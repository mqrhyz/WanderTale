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
  if (job.attempts >= 5) return null;

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

/** Max attempts before giving up on an enrichment job. */
export const TRIP_ENRICHMENT_MAX_ATTEMPTS = 5;
/** Running jobs older than this are considered stuck (instance death). */
export const TRIP_ENRICHMENT_STUCK_MS = 12 * 60 * 1000;

/**
 * Reclaim jobs stuck in "running" (Cloud Run instance died mid-job)
 * back to "queued" so a worker/sweep can retry.
 */
export async function reclaimStuckTripEnrichmentJobs(olderThanMs = TRIP_ENRICHMENT_STUCK_MS): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  let count = 0;
  try {
    const { data, error } = await getSupabase()
      .from("trip_enrichment_jobs")
      .update({
        status: "queued",
        error: "reclaimed_stuck_running",
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("status", "running")
      .lt("updated_at", cutoff)
      .select("trip_id");
    if (!error && data) {
      count = data.length;
      for (const row of data) {
        const id = String((row as { trip_id: string }).trip_id);
        const mem = memoryJobs.get(id);
        if (mem) memoryJobs.set(id, { ...mem, status: "queued" });
      }
    }
  } catch (e) {
    console.warn("[trip-job] reclaim stuck failed:", e);
  }
  return count;
}

/** List jobs eligible for retry (queued/failed, under max attempts). */
export async function listRetryableTripEnrichmentJobs(limit = 10): Promise<JobRow[]> {
  await reclaimStuckTripEnrichmentJobs();
  try {
    const { data, error } = await getSupabase()
      .from("trip_enrichment_jobs")
      .select("trip_id,user_id,status,attempts,payload")
      .in("status", ["queued", "failed"])
      .lt("attempts", TRIP_ENRICHMENT_MAX_ATTEMPTS)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (!error && data?.length) {
      return data.map((d) => ({
        trip_id: String(d.trip_id),
        user_id: String(d.user_id),
        status: String(d.status),
        attempts: Number(d.attempts ?? 0),
        payload: d.payload as TripEnrichmentJobPayload,
      }));
    }
  } catch {
    /* memory fallback */
  }
  const out: JobRow[] = [];
  for (const job of memoryJobs.values()) {
    if ((job.status === "queued" || job.status === "failed") && job.attempts < TRIP_ENRICHMENT_MAX_ATTEMPTS) {
      out.push(job);
    }
  }
  return out.slice(0, limit);
}

/**
 * Best-effort: schedule local processing + log that durable sweep should also run.
 * Prefer Cloud Scheduler hitting POST /api/internal/trips/enrichment/sweep.
 */
export function scheduleLocalTripEnrichment(tripId: string, processFn: (id: string) => Promise<unknown>): void {
  const delayMs = 250;
  setTimeout(() => {
    void processFn(tripId).catch((error) => {
      console.warn("[trip-job] local worker failed:", error);
    });
  }, delayMs);
}
