import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    /** Set by requireBusinessOwner: the business owned by the authenticated user. */
    businessId?: string;
    /** Set by requireAdmin / requireBusinessOwner when the caller is an admin. */
    isAdmin?: boolean;
  }
}
