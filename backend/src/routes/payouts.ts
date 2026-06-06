import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../lib/auth.js";
import { processPayout } from "../services/payoutService.js";

export async function payoutsRoutes(app: FastifyInstance) {
  // Admin/system/internal: trigger settlement of a payout to a business.
  app.post<{ Params: { id: string } }>("/payouts/:id/process", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await processPayout(req.params.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });
}
