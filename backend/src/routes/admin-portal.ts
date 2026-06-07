import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../lib/auth.js";
import {
  adminGetAiConfig,
  adminCreateAdPackage,
  adminCreateUser,
  adminListAdPackages,
  adminListBusinesses,
  adminListUsers,
  adminOverview,
  adminSystemLogs,
  adminTransactions,
  adminUpdateAdPackage,
  adminUpdateAiConfig,
  adminUpdateBusinessStatus,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminUserDetail,
} from "../services/platformPortalService.js";
import { adminListMedia, adminUpdateMediaStatus } from "../services/businessMediaService.js";
import {
  createAiRecommendationRule,
  listAiRecommendationRules,
  updateAiRecommendationRule,
} from "../services/aiRecommendationService.js";
import { listAdminPayouts } from "../services/payoutService.js";
import {
  adminCreatePromotionPost,
  adminCreatePromotionVoucher,
  adminDeletePromotionPost,
  adminDeletePromotionVoucher,
  adminListPromotionPosts,
  adminListPromotionVouchers,
  adminUpdatePromotionPost,
  adminUpdatePromotionVoucher,
} from "../services/promotionService.js";

export async function adminPortalRoutes(app: FastifyInstance) {
  app.get("/admin/overview", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return await adminOverview();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/admin/transactions", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminTransactions() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/admin/users", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminListUsers() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{
    Body: { email?: string; password?: string; display_name?: string; is_admin?: boolean; is_business?: boolean; status?: string };
  }>("/admin/users", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminCreateUser(req.body ?? {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });

  app.get<{ Params: { userId: string } }>("/admin/users/:userId", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminUserDetail(req.params.userId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { userId: string }; Body: { is_admin?: boolean; is_business?: boolean } }>(
    "/admin/users/:userId/role",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await adminUpdateUserRole(req.params.userId, req.body ?? {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  app.patch<{ Params: { userId: string }; Body: { status: string } }>(
    "/admin/users/:userId/status",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const status = req.body?.status;
        if (!status) return reply.code(400).send({ error: "status_required" });
        return await adminUpdateUserStatus(req.params.userId, status);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  app.get("/admin/businesses", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminListBusinesses() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { businessId: string }; Body: { status: string } }>(
    "/admin/businesses/:businessId/status",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const status = req.body?.status;
        if (!status) return reply.code(400).send({ error: "status_required" });
        return await adminUpdateBusinessStatus(req.params.businessId, status);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  app.get("/admin/ai-config", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminGetAiConfig() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get<{ Querystring: { level?: string } }>("/admin/system-logs", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return { items: await adminSystemLogs(100, req.query.level) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { key: string }; Body: { value: Record<string, unknown> } }>(
    "/admin/ai-config/:key",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        if (!req.body?.value) return reply.code(400).send({ error: "value_required" });
        return await adminUpdateAiConfig(req.params.key, req.body.value);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(500).send({ error: msg });
      }
    },
  );

  // --- Marketplace: media moderation, ad-package CRUD, AI rules, payouts ---

  app.get<{ Querystring: { status?: string } }>("/admin/media", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return { items: await adminListMedia(100, req.query.status) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.patch<{ Params: { id: string }; Body: { status?: string; rejection_reason?: string } }>(
    "/admin/media/:id/status",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const status = req.body?.status;
        if (status !== "approved" && status !== "rejected") {
          return reply.code(400).send({ error: "invalid_status" });
        }
        return await adminUpdateMediaStatus(req.params.id, req.userId!, status, req.body?.rejection_reason);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get("/admin/ad-packages", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminListAdPackages() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/admin/ad-packages", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminCreateAdPackage(req.body as never);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(400).send({ error: msg });
    }
  });

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    "/admin/ad-packages/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await adminUpdateAdPackage(req.params.id, req.body as never);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get("/admin/ai-recommendation-rules", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await listAiRecommendationRules() };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.post<{ Body: { name?: string; status?: string; config?: Record<string, unknown> } }>(
    "/admin/ai-recommendation-rules",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await createAiRecommendationRule(req.userId!, req.body ?? {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { name?: string; status?: string; config?: Record<string, unknown> } }>(
    "/admin/ai-recommendation-rules/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await updateAiRecommendationRule(req.params.id, req.body ?? {});
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        return reply.code(400).send({ error: msg });
      }
    },
  );

  app.get<{ Querystring: { status?: string } }>("/admin/payouts", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return { items: await listAdminPayouts(100, req.query.status) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      return reply.code(500).send({ error: msg });
    }
  });

  app.get("/admin/promotion-vouchers", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminListPromotionVouchers() };
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/admin/promotion-vouchers", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminCreatePromotionVoucher(req.body as never);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.patch<{ Params: { voucherId: string }; Body: Record<string, unknown> }>(
    "/admin/promotion-vouchers/:voucherId",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await adminUpdatePromotionVoucher(req.params.voucherId, req.body as never);
      } catch (e) {
        return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
      }
    },
  );

  app.delete<{ Params: { voucherId: string } }>("/admin/promotion-vouchers/:voucherId", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminDeletePromotionVoucher(req.params.voucherId);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.get("/admin/promotion-posts", { preHandler: requireAdmin }, async (_req, reply) => {
    try {
      return { items: await adminListPromotionPosts() };
    } catch (e) {
      return reply.code(500).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.post<{ Body: Record<string, unknown> }>("/admin/promotion-posts", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminCreatePromotionPost(req.userId!, req.body as never);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
    }
  });

  app.patch<{ Params: { postId: string }; Body: Record<string, unknown> }>(
    "/admin/promotion-posts/:postId",
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        return await adminUpdatePromotionPost(req.params.postId, req.body as never);
      } catch (e) {
        return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
      }
    },
  );

  app.delete<{ Params: { postId: string } }>("/admin/promotion-posts/:postId", { preHandler: requireAdmin }, async (req, reply) => {
    try {
      return await adminDeletePromotionPost(req.params.postId);
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : "error" });
    }
  });
}
