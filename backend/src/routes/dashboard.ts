import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { dashboardStats } from "../services/tripService.js";
import {
  getPromotionPost,
  listPromotionHome,
  listSavedPromotionVouchers,
  savePromotionVoucher,
  unsavePromotionVoucher,
} from "../services/promotionService.js";

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

  /** Ưu đãi do admin quản lý: vouchers ngang + bài viết chương trình ưu đãi. */
  app.get("/promotions/saved", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await listSavedPromotionVouchers(req.userId!);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.get("/promotions", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await listPromotionHome(req.userId!);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.get<{ Params: { postId: string } }>("/promotions/posts/:postId", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await getPromotionPost(req.params.postId, req.userId!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(msg === "promotion_post_not_found" ? 404 : 500).send({ error: msg });
    }
  });

  app.post<{ Params: { voucherId: string } }>("/promotions/vouchers/:voucherId/save", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await savePromotionVoucher(req.userId!, req.params.voucherId);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.delete<{ Params: { voucherId: string } }>("/promotions/vouchers/:voucherId/save", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await unsavePromotionVoucher(req.userId!, req.params.voucherId);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });
}
