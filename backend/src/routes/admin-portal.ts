import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../lib/auth.js";
import {
  adminGetAiConfig,
  adminCreateUser,
  adminListBusinesses,
  adminListUsers,
  adminOverview,
  adminSystemLogs,
  adminTransactions,
  adminUpdateAiConfig,
  adminUpdateBusinessStatus,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminUserDetail,
} from "../services/platformPortalService.js";

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
}
