import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { fetchStaticMapPng, isVietmapConfigured } from "../lib/vietmap.js";

const staticQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  zoom: z.coerce.number().min(0).max(20).optional(),
  address: z.string().max(300).optional(),
});

/** Proxy VietMap Static Map — key không lộ ra client URL. */
export async function mapsRoutes(app: FastifyInstance) {
  app.get("/maps/static", { preHandler: requireAuth }, async (req, reply) => {
    if (!isVietmapConfigured()) {
      return reply.code(503).send({ error: "VIETMAP_API_KEY chưa cấu hình" });
    }
    const parsed = staticQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { lat, lng, zoom, address } = parsed.data;
    const png = await fetchStaticMapPng(lat, lng, { zoom, size: "960x300", address });
    if (!png) {
      return reply.code(502).send({ error: "Không tạo được bản đồ tĩnh" });
    }
    return reply
      .header("Content-Type", "image/png")
      .header("Cache-Control", "private, max-age=86400")
      .send(Buffer.from(png));
  });
}
