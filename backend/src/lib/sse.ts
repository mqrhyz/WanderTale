import type { FastifyRequest } from "fastify";
import { corsOrigins } from "./env.js";

/** CORS cho response hijack (SSE) — Fastify CORS plugin không tự gắn header. */
export function corsHeadersForRequest(req: FastifyRequest): Record<string, string> {
  const origin = req.headers.origin;
  if (!origin) return {};
  const allowed = corsOrigins();
  if (!allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
