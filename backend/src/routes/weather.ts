import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { fetchWeatherForecast } from "../services/weatherService.js";

const q = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function weatherRoutes(app: FastifyInstance) {
  app.get("/weather", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = q.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      return await fetchWeatherForecast(parsed.data.lat, parsed.data.lon);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "weather_error";
      return reply.code(502).send({ error: msg });
    }
  });
}
