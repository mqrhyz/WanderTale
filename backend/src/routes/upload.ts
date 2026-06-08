import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { loadProfileFlags, requireAuth } from "../lib/auth.js";
import { uploadUserImage } from "../services/mediaUploadService.js";

export async function uploadRoutes(app: FastifyInstance) {
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  app.post("/upload/image", { preHandler: requireAuth }, async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: "missing_bearer_token" });

    try {
      const flags = await loadProfileFlags(req.userId);
      if (!flags.is_admin && !flags.is_business) {
        return reply.code(403).send({ error: "upload_not_allowed" });
      }

      const file = await req.file();
      if (!file) return reply.code(400).send({ error: "file_required" });

      const mime = file.mimetype ?? "application/octet-stream";
      const buffer = await file.toBuffer();
      const folder = flags.is_admin ? "admin" : "business";
      const { url } = await uploadUserImage(req.userId, buffer, mime, folder);
      return { url };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_failed";
      if (msg === "unsupported_image_type") return reply.code(400).send({ error: msg });
      if (msg === "file_too_large") return reply.code(413).send({ error: msg });
      return reply.code(500).send({ error: msg });
    }
  });
}
