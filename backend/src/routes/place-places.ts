import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../lib/auth.js";
import {
  adminListPlaces,
  deletePlace,
  getFoodPlacesByCity,
  getPlacesByCategory,
  upsertPlace,
  destinationToCitySlug,
} from "../services/placePlacesService.js";

const listQuery = z.object({
  city: z.string().trim().min(2).max(200).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(80).default(30),
});

export async function placePoolRoutes(app: FastifyInstance) {
  // Public read — pool ẩm thực crawl thật cho app/agent dùng để hiển thị gợi ý.
  app.get("/place-places", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { city, category, limit } = parsed.data;
    if (!city) return reply.code(400).send({ error: "city_required" });
    try {
      const items = category
        ? await getPlacesByCategory(city, category, limit)
        : await getFoodPlacesByCity(city, limit);
      return { items, slug: destinationToCitySlug(city) };
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "place_pool_error" });
    }
  });

  // Admin: paged list
  const adminQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    city: z.string().trim().max(80).optional(),
    source: z.string().trim().max(40).optional(),
    q: z.string().trim().max(120).optional(),
  });
  app.get("/admin/place-places", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = adminQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const { rows, total } = await adminListPlaces(parsed.data);
      const page = parsed.data.page;
      const pageSize = parsed.data.pageSize;
      return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "place_pool_error" });
    }
  });

  // Admin: upsert
  const upsertBody = z.object({
    source: z.string().min(2).max(40),
    source_id: z.string().min(1).max(120),
    name: z.string().min(1).max(240),
    address: z.string().min(1).max(400),
    city: z.string().min(2).max(120),
    city_slug: z.string().max(80).nullable().optional(),
    district: z.string().max(120).nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    categories: z.array(z.string()).default([]),
    cuisines: z.array(z.string()).default([]),
    image: z.string().url().nullable().optional(),
    image_urls: z.array(z.string()).default([]),
    rating: z.number().nullable().optional(),
    total_review: z.number().int().nullable().optional(),
    detail_url: z.string().nullable().optional(),
  });
  app.post("/admin/place-places", { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = upsertBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const row = await upsertPlace(parsed.data);
      return reply.code(201).send(row);
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "place_pool_error" });
    }
  });

  // Admin: update một phần (cũng qua upsert)
  app.patch<{ Params: { id: string } }>(
    "/admin/place-places/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      // Currently client phải gửi full upsert body; patch đơn giản qua upsert (yêu cầu source+source_id+...).
      const parsed = upsertBody.partial().safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      // Minimal: không hỗ trợ patch từng field nếu thiếu khóa → trả 400 gợi ý dùng POST upsert.
      if (!parsed.data.source || !parsed.data.source_id) {
        return reply.code(400).send({ error: "use_POST_upsert_with_source_and_source_id" });
      }
      try {
        const row = await upsertPlace(parsed.data as Parameters<typeof upsertPlace>[0]);
        return row ?? reply.code(404).send({ error: "not_found" });
      } catch (e) {
        return reply.code(500).send({ error: e instanceof Error ? e.message : "place_pool_error" });
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/admin/place-places/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        await deletePlace(req.params.id);
        return reply.code(204).send();
      } catch (e) {
        return reply.code(500).send({ error: e instanceof Error ? e.message : "place_pool_error" });
      }
    }
  );
}