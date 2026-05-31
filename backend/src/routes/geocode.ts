import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import {
  autocompleteTripDestination,
  geocodeText,
  isVietmapConfigured,
  placeV4,
  reverseV4,
  searchV4,
} from "../lib/vietmap.js";

const autocompleteQuery = z.object({
  text: z.string().min(2).max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const refQuery = z.object({
  ref_id: z.string().min(1).max(500),
});

const searchQuery = z.object({
  text: z.string().min(2).max(300),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

const reverseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

function focusFromQuery(lat?: number, lng?: number) {
  if (lat != null && lng != null) return { lat, lng };
  return null;
}

export async function geocodeRoutes(app: FastifyInstance) {
  app.get("/geocode/status", async () => ({
    provider: "vietmap",
    configured: isVietmapConfigured(),
  }));

  app.get("/geocode/autocomplete", { preHandler: requireAuth }, async (req, reply) => {
    if (!isVietmapConfigured()) {
      return reply.code(503).send({ error: "VIETMAP_API_KEY chưa cấu hình" });
    }
    const parsed = autocompleteQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { text, lat, lng } = parsed.data;
    try {
      const results = await autocompleteTripDestination(text, focusFromQuery(lat, lng));
      return {
        results: results.map((r) => ({
          ref_id: r.ref_id,
          display: r.display,
          name: r.name ?? "",
          address: r.address ?? "",
          distance_km: r.distance,
        })),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "autocomplete_error";
      return reply.code(502).send({ error: msg });
    }
  });

  app.get("/geocode/place", { preHandler: requireAuth }, async (req, reply) => {
    if (!isVietmapConfigured()) {
      return reply.code(503).send({ error: "VIETMAP_API_KEY chưa cấu hình" });
    }
    const parsed = refQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const place = await placeV4(parsed.data.ref_id);
      return { place };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "place_error";
      return reply.code(502).send({ error: msg });
    }
  });

  app.get("/geocode/search", { preHandler: requireAuth }, async (req, reply) => {
    if (!isVietmapConfigured()) {
      return reply.code(503).send({ error: "VIETMAP_API_KEY chưa cấu hình" });
    }
    const parsed = searchQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { text, lat, lng } = parsed.data;
    try {
      const geo = await geocodeText(text, focusFromQuery(lat, lng));
      return { ...geo, results: await searchV4(text, focusFromQuery(lat, lng)) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "search_error";
      return reply.code(502).send({ error: msg });
    }
  });

  app.get("/geocode/reverse", { preHandler: requireAuth }, async (req, reply) => {
    if (!isVietmapConfigured()) {
      return reply.code(503).send({ error: "VIETMAP_API_KEY chưa cấu hình" });
    }
    const parsed = reverseQuery.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const results = await reverseV4(parsed.data.lat, parsed.data.lng);
      return { results };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "reverse_error";
      return reply.code(502).send({ error: msg });
    }
  });
}
