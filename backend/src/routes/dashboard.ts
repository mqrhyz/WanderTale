import type { FastifyInstance } from "fastify";
import { getSupabaseAdmin, requireAuth } from "../lib/auth.js";
import { dashboardStats } from "../services/tripService.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.userId!;
    try {
      return await dashboardStats(userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  /** Ưu đãi đang chạy (admin/partner vouchers) — hiện trên dashboard user. */
  app.get("/promotions", { preHandler: requireAuth }, async (_req, reply) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await getSupabaseAdmin()
        .from("vouchers")
        .select("id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,partners(name)")
        .lte("valid_from", today)
        .gte("valid_until", today)
        .order("created_at", { ascending: false })
        .limit(10);
      return {
        items: (data ?? []).map((v: Record<string, unknown>) => ({
          id: v.id,
          code: v.code,
          title: v.title,
          description: v.description,
          discount_percent: v.discount_percent,
          discount_amount: v.discount_amount,
          valid_until: v.valid_until,
          partner_name: (v.partners as { name?: string } | null)?.name ?? null,
        })),
      };
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });
}
