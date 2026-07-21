import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import { getUserSubscriptionOverview, purchaseUserSubscription, updateUserSubscriptionAutoRenew } from "../services/userSubscriptionService.js";

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
        const code =
          msg === "voucher_not_applicable" ||
          msg === "voucher_expired" ||
          msg === "subscription_package_not_found"
            ? 400
            : 500;
        return reply.code(code).send({ error: msg });
      }
    },
  );

  app.patch<{ Body: { auto_renew?: boolean } }>(
    "/user/subscription/auto-renew",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        if (typeof req.body?.auto_renew !== "boolean") {
          return reply.code(400).send({ error: "auto_renew_required" });
        }
        return await updateUserSubscriptionAutoRenew(req.userId!, req.body.auto_renew);
      } catch (e) {
        return reply.code(500).send({ error: e instanceof Error ? e.message : "auto_renew_update_failed" });
      }
    },
  );
}
