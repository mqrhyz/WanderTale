import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";

export interface JwtPayload {
  sub: string;
  email?: string;
}

let admin: SupabaseClient | null = null;

function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return admin;
}

/** Validates the browser/mobile access token via Supabase Auth (no local JWT secret needed). */
export async function verifySupabaseAccessToken(token: string): Promise<JwtPayload> {
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    throw new Error(error?.message ?? "invalid_or_expired_token");
  }
  const user = data.user;
  return {
    sub: user.id,
    email: typeof user.email === "string" ? user.email : undefined,
  };
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.toLowerCase().startsWith("bearer ")) {
    await reply.status(401).send({ error: "missing_bearer_token" });
    return;
  }
  const token = header.slice(7).trim();
  try {
    const { sub } = await verifySupabaseAccessToken(token);
    req.userId = sub;
  } catch {
    await reply.status(401).send({ error: "invalid_or_expired_token" });
    return;
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  return supabaseAdmin();
}

export async function loadProfileFlags(userId: string): Promise<{ is_admin: boolean; is_business: boolean }> {
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("is_admin,is_business")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    is_admin: Boolean(data?.is_admin),
    is_business: Boolean(data?.is_business),
  };
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (reply.sent || !req.userId) return;
  try {
    const flags = await loadProfileFlags(req.userId);
    if (!flags.is_admin) {
      await reply.status(403).send({ error: "admin_required" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    await reply.status(500).send({ error: msg });
  }
}

export async function requireBusiness(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (reply.sent || !req.userId) return;
  try {
    const flags = await loadProfileFlags(req.userId);
    if (!flags.is_business && !flags.is_admin) {
      await reply.status(403).send({ error: "business_required" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    await reply.status(500).send({ error: msg });
  }
}
