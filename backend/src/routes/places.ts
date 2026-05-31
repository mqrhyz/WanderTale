import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { searchPlaces } from "../lib/placesProvider.js";

const q = z.object({
  query: z.string().min(2).max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export async function placesRoutes(app: FastifyInstance) {
  app.get("/places", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = q.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { query, lat, lng } = parsed.data;
    try {
      return await searchPlaces(query, lat ?? null, lng ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "places_error";
      return reply.code(502).send({ error: msg });
    }
  });
}
