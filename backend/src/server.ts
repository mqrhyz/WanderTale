import cors from "@fastify/cors";
import Fastify from "fastify";
import { corsOrigins, env } from "./lib/env.js";
import { registerApiRoutes } from "./routes/index.js";

const app = Fastify({
  logger: true,
  /** Hotel agent + Playwright có thể chạy vài phút */
  connectionTimeout: 300_000,
  requestTimeout: 300_000,
});

await app.register(cors, {
  origin: corsOrigins(),
  credentials: true,
});

await app.register(registerApiRoutes, { prefix: "/api" });

await app.listen({ port: env.PORT, host: "0.0.0.0" });
