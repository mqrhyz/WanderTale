import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  getHotelAgentState,
  resumeHotelAgent,
  runHotelAgent,
  type AgentRunResult,
} from "@wander-tale/hotel-booking-agent";
import { requireAuth } from "../lib/auth.js";
import { getSupabase } from "../lib/supabase.js";

const profileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(8),
  specialRequests: z.string().optional(),
});

const runBodySchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().min(1),
  userProfile: profileSchema.optional(),
});

const resumeBodySchema = z.object({
  threadId: z.string().uuid(),
  userProfile: profileSchema.optional(),
  resume: z.union([
    z.boolean(),
    z.object({ approved: z.boolean(), offerIndex: z.number().int().min(0).max(20).optional() }).strict(),
    z
      .object({
        approved: z.boolean(),
        offer: z
          .object({
            site: z.enum(["booking", "agoda", "vntrip"]),
            hotelName: z.string().min(1),
            priceVnd: z.number().positive(),
            currency: z.string().min(1),
            bookingUrl: z.string().url(),
            scrapedAt: z.string().min(1),
            confidence: z.number().min(0).max(1),
          })
          .passthrough()
          .optional(),
      })
      .strict(),
  ]),
});

type ThreadStatus = "active" | "interrupted" | "done" | "error";
const inFlightThreads = new Set<string>();

function statusForResult(result: AgentRunResult): ThreadStatus {
  if (result.state.error) return "error";
  if (result.state.step === "done") return "done";
  if (result.interrupted) return "interrupted";
  return "active";
}

async function ensureThreadOwner(threadId: string, userId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("hotel_agent_threads")
    .select("id, user_id, last_state")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) {
    const { error: insertErr } = await sb.from("hotel_agent_threads").insert({
      id: threadId,
      user_id: userId,
      status: "active",
    });
    if (insertErr) throw new Error(insertErr.message);
    return null;
  }

  if (data.user_id !== userId) {
    const err = new Error("thread_not_found");
    err.name = "ThreadAccessError";
    throw err;
  }

  return data;
}

async function requireThreadOwner(threadId: string, userId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("hotel_agent_threads")
    .select("id, user_id, last_state")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data || data.user_id !== userId) {
    const err = new Error("thread_not_found");
    err.name = "ThreadAccessError";
    throw err;
  }

  return data;
}

async function persistThreadResult(userId: string, result: AgentRunResult) {
  const sb = getSupabase();
  const { error } = await sb.from("hotel_agent_threads").upsert({
    id: result.threadId,
    user_id: userId,
    status: statusForResult(result),
    last_state: result as unknown as Record<string, unknown>,
    last_error: result.state.error ?? null,
  });
  if (error) throw new Error(error.message);
}

async function persistThreadError(threadId: string, userId: string, message: string) {
  const sb = getSupabase();
  const { error } = await sb.from("hotel_agent_threads").upsert({
    id: threadId,
    user_id: userId,
    status: "error",
    last_error: message,
  });
  if (error) throw new Error(error.message);
}

async function withThreadLock<T>(threadId: string, run: () => Promise<T>): Promise<T> {
  if (inFlightThreads.has(threadId)) {
    const err = new Error("thread_busy");
    err.name = "ThreadBusyError";
    throw err;
  }
  inFlightThreads.add(threadId);
  try {
    return await run();
  } finally {
    inFlightThreads.delete(threadId);
  }
}

export async function hotelAgentRoutes(app: FastifyInstance) {
  app.post("/hotel-agent/run", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = runBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;
    const threadId = body.threadId ?? randomUUID();

    try {
      await ensureThreadOwner(threadId, request.userId!);
      const result = await withThreadLock(threadId, () =>
        runHotelAgent({
          threadId,
          message: body.message,
          userProfile: body.userProfile ?? null,
        })
      );
      await persistThreadResult(request.userId!, result);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === "ThreadAccessError") {
        return reply.status(404).send({ error: message });
      }
      if (err instanceof Error && err.name === "ThreadBusyError") {
        return reply.status(409).send({ error: message });
      }
      await persistThreadError(threadId, request.userId!, message).catch(() => undefined);
      request.log.error({ err }, "hotel-agent run failed");
      return reply.status(500).send({ error: "hotel_agent_failed", message });
    }
  });

  app.post("/hotel-agent/resume", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = resumeBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;

    try {
      await requireThreadOwner(body.threadId, request.userId!);
      const currentState = await getHotelAgentState(body.threadId);
      if (currentState.threadId !== body.threadId) {
        return reply.status(409).send({
          error: "thread_checkpoint_unavailable",
          message: "Agent memory checkpoint is not available. Start a new hotel-agent thread.",
        });
      }
      const result = await withThreadLock(body.threadId, () =>
        resumeHotelAgent(body.threadId, body.resume, { userProfile: body.userProfile })
      );
      await persistThreadResult(request.userId!, result);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === "ThreadAccessError") {
        return reply.status(404).send({ error: message });
      }
      if (err instanceof Error && err.name === "ThreadBusyError") {
        return reply.status(409).send({ error: message });
      }
      await persistThreadError(body.threadId, request.userId!, message).catch(() => undefined);
      request.log.error({ err }, "hotel-agent resume failed");
      return reply.status(500).send({ error: "hotel_agent_resume_failed", message });
    }
  });

  app.get("/hotel-agent/state/:threadId", { preHandler: requireAuth }, async (request, reply) => {
    const { threadId } = request.params as { threadId: string };
    if (!z.string().uuid().safeParse(threadId).success) {
      return reply.status(400).send({ error: "invalid_thread_id" });
    }
    try {
      const row = await requireThreadOwner(threadId, request.userId!);
      const state = await getHotelAgentState(threadId);
      const hasMemoryState = Object.keys(state).length > 0 && state.threadId === threadId;
      return reply.send({ threadId, state: hasMemoryState ? state : row.last_state, restoredFromSnapshot: !hasMemoryState });
    } catch (err) {
      if (err instanceof Error && err.name === "ThreadAccessError") {
        return reply.status(404).send({ error: err.message });
      }
      throw err;
    }
  });
}
