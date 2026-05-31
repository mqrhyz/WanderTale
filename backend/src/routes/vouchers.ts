import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { getSupabase } from "../lib/supabase.js";

export async function vouchersRoutes(app: FastifyInstance) {
  app.get("/vouchers", { preHandler: requireAuth }, async (_req, reply) => {
    const sb = getSupabase();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
      .from("vouchers")
      .select("id, code, title, description, discount_percent, discount_amount, valid_from, valid_until, terms_url, partners(name, website)")
      .lte("valid_from", today)
      .gte("valid_until", today);
    if (error) return reply.code(500).send({ error: error.message });
    return data ?? [];
  });
}
