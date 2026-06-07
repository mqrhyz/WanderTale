import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth.js";
import {
  createLocationReview,
  getLocationDetail,
  listLocationReviews,
  listSponsoredLocations,
} from "../services/sponsoredLocationService.js";

export async function locationsRoutes(app: FastifyInstance) {
  // Địa điểm được tài trợ theo thành phố + ngân sách (cho tab Đề xuất).
  app.get<{ Querystring: { city?: string; max_price?: string } }>(
    "/locations/sponsored",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const city = (req.query.city ?? "").trim();
        const maxPrice = req.query.max_price ? Number(req.query.max_price) : undefined;
        const items = await listSponsoredLocations(city, Number.isFinite(maxPrice) ? maxPrice : undefined);
        return { items };
      } catch (e) {
        return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/locations/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        return await getLocationDetail(req.params.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        if (msg === "location_not_found") return reply.code(404).send({ error: msg });
        return reply.code(500).send({ error: msg });
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/locations/:id/reviews",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        return { items: await listLocationReviews(req.params.id) };
      } catch (e) {
        return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
      }
    },
  );

  app.post<{ Params: { id: string }; Body: { rating?: number; comment?: string } }>(
    "/locations/:id/reviews",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        return await createLocationReview(req.params.id, req.userId!, req.body ?? {});
      } catch (e) {
        return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
      }
    },
  );
}
