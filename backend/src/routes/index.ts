import type { FastifyInstance } from "fastify";
import { adminPortalRoutes } from "./admin-portal.js";
import { businessPortalRoutes } from "./business-portal.js";
import { dashboardRoutes } from "./dashboard.js";
import { geocodeRoutes } from "./geocode.js";
import { hotelAgentRoutes } from "./hotel-agent.js";
import { healthRoutes } from "./health.js";
import { mapsRoutes } from "./maps.js";
import { placesRoutes } from "./places.js";
import { tripsRoutes } from "./trips.js";
import { vouchersRoutes } from "./vouchers.js";
import { weatherRoutes } from "./weather.js";

export async function registerApiRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(tripsRoutes);
  await app.register(weatherRoutes);
  await app.register(geocodeRoutes);
  await app.register(mapsRoutes);
  await app.register(placesRoutes);
  await app.register(vouchersRoutes);
  await app.register(dashboardRoutes);
  await app.register(hotelAgentRoutes);
  await app.register(adminPortalRoutes);
  await app.register(businessPortalRoutes);
}
