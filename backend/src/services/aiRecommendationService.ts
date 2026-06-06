import { getSupabaseAdmin } from "../lib/auth.js";
import { logSystemEvent } from "../lib/auditLog.js";

/** Admin-managed AI recommendation / sponsored-visibility boost rules. */

const RULE_COLUMNS = "id,name,status,config,created_by,created_at,updated_at";

export async function listAiRecommendationRules() {
  const { data } = await getSupabaseAdmin()
    .from("ai_recommendation_rules")
    .select(RULE_COLUMNS)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createAiRecommendationRule(
  createdBy: string,
  body: { name?: string; status?: string; config?: Record<string, unknown> },
) {
  const name = body.name?.trim();
  if (!name) throw new Error("rule_name_required");
  const status = body.status === "active" ? "active" : "inactive";
  const { data, error } = await getSupabaseAdmin()
    .from("ai_recommendation_rules")
    .insert({ name, status, config: body.config ?? {}, created_by: createdBy })
    .select(RULE_COLUMNS)
    .single();
  if (error) throw error;
  await logSystemEvent({
    title: "AI recommendation rule created",
    source: "ai_rules",
    metadata: { rule_id: data.id, name, status },
  });
  return data;
}

export async function updateAiRecommendationRule(
  ruleId: string,
  body: { name?: string; status?: string; config?: Record<string, unknown> },
) {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body.status === "active" || body.status === "inactive") patch.status = body.status;
  if (body.config && typeof body.config === "object") patch.config = body.config;
  if (Object.keys(patch).length === 0) throw new Error("nothing_to_update");
  const { data, error } = await getSupabaseAdmin()
    .from("ai_recommendation_rules")
    .update(patch)
    .eq("id", ruleId)
    .select(RULE_COLUMNS)
    .single();
  if (error) throw error;
  await logSystemEvent({
    title: "AI recommendation rule updated",
    source: "ai_rules",
    metadata: { rule_id: ruleId, patch },
  });
  return data;
}
