import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { getUserSubscriptionOverview, purchaseUserSubscription } from "../services/userSubscriptionService.js";

export async function userSubscriptionRoutes(app: FastifyInstance) {
  app.get("/user/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      return await getUserSubscriptionOverview(req.userId!);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "subscription_overview_failed" });
    }
  });

  app.post<{ Body: { package_id?: string; voucher_id?: string | null } }>(
    "/user/subscription/purchase",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        if (!req.body?.package_id) return reply.code(400).send({ error: "package_id_required" });
        return await purchaseUserSubscription(req.userId!, req.body);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "subscription_purchase_failed";
        return reply.code(msg === "voucher_not_applicable" ? 400 : 500).send({ error: msg });
      }
    },
  );
}
