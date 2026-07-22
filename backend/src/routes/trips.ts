import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { corsHeadersForRequest } from "../lib/sse.js";
import { tripGenerateSchema, tripUpdateSchema } from "../schemas/trip.js";
import {
  deleteTrip,
  duplicateTrip,
  generateTrip,
  getTrip,
  listTrips,
  updateTrip,
} from "../services/tripService.js";
import { streamTripGeneration } from "../services/tripStream.js";
import { previewTripDestination } from "../services/tripPreview.js";
import { getTripProgressSnapshot } from "../services/tripEnrichmentJobService.js";
import { processTripEnrichment } from "../services/tripGenerationPipeline.js";
import { assertCanCreateTrip } from "../services/userSubscriptionService.js";
import { env } from "../lib/env.js";

const previewQuery = z.object({
  destination: z.string().min(2).max(200),
});

export async function tripsRoutes(app: FastifyInstance) {
  app.get("/trips/preview", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = previewQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      return await previewTripDestination(parsed.data.destination);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "preview_failed";
      const code = msg.includes("not configured") ? 503 : 502;
      return reply.code(code).send({ error: msg });
    }
  });

  app.post("/trips/generate", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = tripGenerateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      await assertCanCreateTrip(req.userId!);
      const result = await generateTrip(req.userId!, parsed.data);
      if (result.staged && result.status === "pricing_pending") {
        return reply.code(202).send(result);
      }
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "generate_failed";
      if (msg === "free_trip_limit_reached") {
        return reply.code(402).send({
          error: "free_trip_limit_reached",
          message: "Tài khoản Free chỉ tạo được 5 chuyến đi mỗi tháng. Nâng cấp Pro để tạo không giới hạn.",
          details: (e as Error & { details?: unknown }).details,
        });
      }
      const quota = /quota|rate limit|hết quota|limit:\s*0/i.test(msg);
      const overloaded =
        /quá tải|high demand|503|429|try again later|resource exhausted|Ollama timeout/i.test(msg);
      const code = msg.includes("not configured") || overloaded || quota ? 503 : 500;
      return reply.code(code).send({
        error: quota
          ? "Gemini API hết quota/rate limit. Đợi 1–2 phút rồi thử lại, hoặc đặt LLM_PROVIDER=ollama trong .env."
          : overloaded
            ? "AI tạm quá tải. Đợi 1–2 phút rồi bấm tạo lịch lại — hệ thống sẽ tự đổi API key và model dự phòng."
            : msg,
      });
    }
  });

  app.post("/trips/generate/stream", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = tripGenerateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    reply.hijack();
    reply.raw.writeHead(200, {
      ...corsHeadersForRequest(req),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const keepalive = setInterval(() => {
      if (!reply.raw.writableEnded) reply.raw.write(": ping\n\n");
    }, 3000);

    try {
      await assertCanCreateTrip(req.userId!);
      for await (const ev of streamTripGeneration(req.userId!, parsed.data)) {
        if (ev.type === "error") {
          send("error", { message: ev.message });
          break;
        }
        send(ev.type, ev);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "generate_failed";
      send("error", {
        message: msg === "free_trip_limit_reached"
          ? "Tài khoản Free chỉ tạo được 5 chuyến đi mỗi tháng. Nâng cấp Pro để tạo không giới hạn."
          : msg,
        error: msg,
        details: (e as Error & { details?: unknown }).details,
      });
    } finally {
      clearInterval(keepalive);
      reply.raw.end();
    }
  });

  app.get("/trips", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await listTrips(req.userId!);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "list_failed" });
    }
  });

  app.get("/trips/:tripId", { preHandler: requireAuth }, async (req, reply) => {
    const { tripId } = req.params as { tripId: string };
    const trip = await getTrip(req.userId!, tripId);
    if (!trip) return reply.code(404).send({ error: "not_found" });
    return trip;
  });

  app.get("/trips/:tripId/stream", { preHandler: requireAuth }, async (req, reply) => {
    const { tripId } = req.params as { tripId: string };
    const userId = req.userId!;
    const trip = await getTrip(userId, tripId);
    if (!trip) return reply.code(404).send({ error: "not_found" });

    reply.hijack();
    reply.raw.writeHead(200, {
      ...corsHeadersForRequest(req),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const sendEvent = (type: string, data: unknown) => {
      if (reply.raw.writableEnded) return;
      reply.raw.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let lastSnapshotKey = "";
    const sendSnapshot = async () => {
      const [freshTrip, progress] = await Promise.all([
        getTrip(userId, tripId),
        getTripProgressSnapshot(tripId),
      ]);
      const payload = { trip: freshTrip ?? trip, progress };
      const key = JSON.stringify({
        generation_status: (freshTrip as Record<string, unknown> | null)?.generation_status,
        hotel_pricing_status: (freshTrip as Record<string, unknown> | null)?.hotel_pricing_status,
        progress_updated_at: progress?.updated_at,
        progress_event: progress?.last_event_type,
      });
      if (key === lastSnapshotKey) return;
      lastSnapshotKey = key;
      sendEvent("trip_update", { type: "trip_update", tripId, payload });
    };

    await sendSnapshot();

    const { tripEventEmitter } = await import("../lib/tripEvents.js");
    const handler = (update: { type: string; tripId: string; payload?: Record<string, unknown> }) => {
      if (update.tripId !== tripId) return;
      sendEvent("trip_update", update);
    };
    tripEventEmitter.on(`trip:${tripId}`, handler);

    const poll = setInterval(() => {
      void sendSnapshot().catch(() => undefined);
      if (!reply.raw.writableEnded) reply.raw.write(": keepalive\n\n");
    }, 5_000);

    req.raw.on("close", () => {
      tripEventEmitter.off(`trip:${tripId}`, handler);
      clearInterval(poll);
      if (!reply.raw.writableEnded) reply.raw.end();
    });
  });

  app.post("/internal/trips/:tripId/enrichment", async (req, reply) => {
    if (!env.INTERNAL_WORKER_TOKEN) {
      return reply.code(503).send({ error: "worker_token_not_configured" });
    }
    const token = req.headers["x-worker-token"];
    if (token !== env.INTERNAL_WORKER_TOKEN) return reply.code(401).send({ error: "unauthorized" });
    const { tripId } = req.params as { tripId: string };
    return processTripEnrichment(tripId);
  });

  app.put("/trips/:tripId", { preHandler: requireAuth }, async (req, reply) => {
    const { tripId } = req.params as { tripId: string };
    const parsed = tripUpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const updated = await updateTrip(req.userId!, tripId, parsed.data);
    if (!updated) return reply.code(404).send({ error: "not_found" });
    return updated;
  });

  app.delete("/trips/:tripId", { preHandler: requireAuth }, async (req, reply) => {
    const { tripId } = req.params as { tripId: string };
    const before = await getTrip(req.userId!, tripId);
    if (!before) return reply.code(404).send({ error: "not_found" });
    await deleteTrip(req.userId!, tripId);
    return reply.code(204).send();
  });

  app.post("/trips/:tripId/duplicate", { preHandler: requireAuth }, async (req, reply) => {
    const { tripId } = req.params as { tripId: string };
    try {
      await assertCanCreateTrip(req.userId!);
      const dup = await duplicateTrip(req.userId!, tripId);
      if (!dup) return reply.code(404).send({ error: "not_found" });
      return dup;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "duplicate_failed";
      if (msg === "free_trip_limit_reached") {
        return reply.code(402).send({
          error: "free_trip_limit_reached",
          message: "Tài khoản Free chỉ tạo được 5 chuyến đi mỗi tháng (gồm nhân bản). Nâng cấp Pro để không giới hạn.",
          details: (e as Error & { details?: unknown }).details,
        });
      }
      return reply.code(500).send({ error: msg });
    }
  });

  /** Sweep queued/stuck enrichment jobs (Cloud Scheduler / internal cron). */
  app.post("/internal/trips/enrichment/sweep", async (req, reply) => {
    if (!env.INTERNAL_WORKER_TOKEN) {
      return reply.code(503).send({ error: "worker_token_not_configured" });
    }
    const token = req.headers["x-worker-token"];
    if (token !== env.INTERNAL_WORKER_TOKEN) return reply.code(401).send({ error: "unauthorized" });
    const { reclaimStuckTripEnrichmentJobs, listRetryableTripEnrichmentJobs } = await import(
      "../services/tripEnrichmentJobService.js"
    );
    const reclaimed = await reclaimStuckTripEnrichmentJobs();
    const jobs = await listRetryableTripEnrichmentJobs(10);
    const results: Array<{ trip_id: string; status: string }> = [];
    for (const job of jobs) {
      const out = await processTripEnrichment(job.trip_id);
      results.push({ trip_id: job.trip_id, status: out.status });
    }
    return { reclaimed, processed: results.length, results };
  });
}
