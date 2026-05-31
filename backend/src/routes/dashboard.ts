import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
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
}
