import type { FastifyInstance } from "fastify";
import { requireBusiness, requireBusinessOwner } from "../lib/auth.js";
import {
  businessCampaigns,
  businessLocations,
  businessOverview,
  businessReviews,
  businessTransactions,
  businessVouchers,
  createBusinessCampaign,
  createBusinessLocation,
  createBusinessVoucher,
  getBusinessIdForOwner,
  getBusinessProfile,
  listAdPackages,
  purchaseAdPackage,
  replyBusinessReview,
  updateBusinessLocation,
  updateBusinessProfile,
} from "../services/platformPortalService.js";
import { createBusinessMedia, listBusinessMedia } from "../services/businessMediaService.js";
import { listBusinessPayouts } from "../services/payoutService.js";

export async function businessPortalRoutes(app: FastifyInstance) {
  app.get("/business/overview", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return await businessOverview(businessId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/transactions", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return { items: await businessTransactions(businessId) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/ad-packages", { preHandler: requireBusiness }, async (_req, reply) => {
    try {
      return { items: await listAdPackages() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/campaigns", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return { items: await businessCampaigns(businessId) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/business/campaigns", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return await createBusinessCampaign(businessId, req.body as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/vouchers", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return { items: await businessVouchers(businessId) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/business/vouchers", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return await createBusinessVoucher(businessId, req.body as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/locations", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return { items: await businessLocations(businessId) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/business/locations", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return await createBusinessLocation(businessId, req.body as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/business/reviews", { preHandler: requireBusiness }, async (req, reply) => {
    try {
      const businessId = await getBusinessIdForOwner(req.userId!);
      if (!businessId) return reply.code(404).send({ error: "business_not_found" });
      return { items: await businessReviews(businessId) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { reviewId: string }; Body: { reply?: string } }>(
    "/business/reviews/:reviewId/reply",
    { preHandler: requireBusiness },
    async (req, reply) => {
      try {
        const businessId = await getBusinessIdForOwner(req.userId!);
        if (!businessId) return reply.code(404).send({ error: "business_not_found" });
        return await replyBusinessReview(businessId, req.params.reviewId, req.body?.reply ?? "");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  app.post<{ Params: { packageId: string } }>(
    "/business/ad-packages/:packageId/purchase",
    { preHandler: requireBusiness },
    async (req, reply) => {
      try {
        const businessId = await getBusinessIdForOwner(req.userId!);
        if (!businessId) return reply.code(404).send({ error: "business_not_found" });
        const order = await purchaseAdPackage(businessId, req.params.packageId);
        return { order };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  // --- Marketplace: packages alias, locations patch, media, profile, payouts ---

  app.get("/business/packages", { preHandler: requireBusiness }, async (_req, reply) => {
    try {
      return { items: await listAdPackages() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: { package_id?: string } }>(
    "/business/packages/purchase",
    { preHandler: requireBusinessOwner },
    async (req, reply) => {
      try {
        const packageId = req.body?.package_id;
        if (!packageId) return reply.code(400).send({ error: "package_id_required" });
        return { order: await purchaseAdPackage(req.businessId!, packageId) };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/business/locations/:id",
    { preHandler: requireBusinessOwner },
    async (req, reply) => {
      try {
        return await updateBusinessLocation(req.businessId!, req.params.id, req.body as never);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get("/business/media", { preHandler: requireBusinessOwner }, async (req, reply) => {
    try {
      return { items: await listBusinessMedia(req.businessId!) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: { url?: string; type?: string; location_id?: string | null; thumbnail_url?: string | null } }>(
    "/business/media",
    { preHandler: requireBusinessOwner },
    async (req, reply) => {
      try {
        return await createBusinessMedia(req.businessId!, req.userId!, req.body ?? {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get("/business/profile", { preHandler: requireBusinessOwner }, async (req, reply) => {
    try {
      return await getBusinessProfile(req.businessId!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Body: Record<string, unknown> }>(
    "/business/profile",
    { preHandler: requireBusinessOwner },
    async (req, reply) => {
      try {
        return await updateBusinessProfile(req.businessId!, req.body as never);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get("/business/payouts", { preHandler: requireBusinessOwner }, async (req, reply) => {
    try {
      return { items: await listBusinessPayouts(req.businessId!) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });
}
