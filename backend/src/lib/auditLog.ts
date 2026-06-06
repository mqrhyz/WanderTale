import { getSupabaseAdmin } from "./auth.js";

/**
 * Minimal audit trail — every money/important action writes a row to
 * `system_logs` with structured metadata + status. Best-effort: never throws
 * (logging must not break the business action).
 */
export async function logSystemEvent(params: {
  level?: "info" | "success" | "warning" | "error";
  title: string;
  source?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getSupabaseAdmin().from("system_logs").insert({
      level: params.level ?? "info",
      title: params.title,
      source: params.source ?? "marketplace",
      detail: params.detail ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (e) {
    console.warn("[audit] failed to write system_log:", e instanceof Error ? e.message : e);
  }
}
