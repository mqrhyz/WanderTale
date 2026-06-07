import type { FastifyInstance } from "fastify";
import { requireAuth, loadProfileFlags, getSupabaseAdmin } from "../lib/auth.js";
import { getActiveBusinessDetail, listActiveBusinesses } from "../services/platformPortalService.js";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  getBooking,
  payBooking,
} from "../services/bookingService.js";

async function isOwnerOrAdmin(userId: string, booking: { user_id?: string }): Promise<boolean> {
  if (booking.user_id === userId) return true;
  const flags = await loadProfileFlags(userId);
  return flags.is_admin;
}

async function isBusinessOwnerOfBooking(userId: string, booking: { business_id?: string | null }): Promise<boolean> {
  const flags = await loadProfileFlags(userId);
  if (flags.is_admin) return true;
  if (!booking.business_id) return false;
  const { data } = await getSupabaseAdmin()
    .from("businesses")
    .select("id")
    .eq("id", booking.business_id)
    .eq("owner_id", userId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function bookingsRoutes(app: FastifyInstance) {
  // Public catalog (authenticated users) — real bookable businesses.
  app.get("/businesses", { preHandler: requireAuth }, async (_req, reply) => {
    try {
      return { items: await listActiveBusinesses() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get<{ Params: { id: string } }>("/businesses/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await getActiveBusinessDetail(req.params.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(msg === "business_not_found" ? 404 : 500).send({ error: msg });
    }
  });

  app.post<{
    Body: {
      business_id?: string;
      total_amount?: number;
      type?: string;
      trip_id?: string | null;
      location_id?: string | null;
      currency?: string;
      provider?: string | null;
      payment_mode?: "prepaid" | "pay_later";
      metadata?: Record<string, unknown>;
    };
  }>("/bookings", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const body = req.body ?? {};
      if (!body.business_id) return reply.code(400).send({ error: "business_id_required" });
      const booking = await createBooking(req.userId!, {
        business_id: body.business_id,
        total_amount: Number(body.total_amount),
        type: body.type,
        trip_id: body.trip_id ?? null,
        location_id: body.location_id ?? null,
        currency: body.currency,
        provider: body.provider ?? null,
        payment_mode: body.payment_mode,
        metadata: body.metadata,
      });
      return reply.code(201).send(booking);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });

  app.get<{ Params: { id: string } }>("/bookings/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const booking = await getBooking(req.params.id);
      if (!(await isOwnerOrAdmin(req.userId!, booking)) && !(await isBusinessOwnerOfBooking(req.userId!, booking))) {
        return reply.code(403).send({ error: "forbidden" });
      }
      return booking;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(msg === "booking_not_found" ? 404 : 500).send({ error: msg });
    }
  });

  app.post<{ Params: { id: string } }>("/bookings/:id/pay", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const booking = await getBooking(req.params.id);
      if (!(await isOwnerOrAdmin(req.userId!, booking))) return reply.code(403).send({ error: "forbidden" });
      return await payBooking(req.params.id, req.userId!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });

  app.post<{ Params: { id: string } }>("/bookings/:id/confirm", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const booking = await getBooking(req.params.id);
      if (!(await isBusinessOwnerOfBooking(req.userId!, booking))) return reply.code(403).send({ error: "forbidden" });
      return await confirmBooking(req.params.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });

  app.post<{ Params: { id: string } }>("/bookings/:id/cancel", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const booking = await getBooking(req.params.id);
      if (!(await isOwnerOrAdmin(req.userId!, booking)) && !(await isBusinessOwnerOfBooking(req.userId!, booking))) {
        return reply.code(403).send({ error: "forbidden" });
      }
      return await cancelBooking(req.params.id, req.userId!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });
}
