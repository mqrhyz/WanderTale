import { getSupabaseAdmin } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { logSystemEvent } from "../lib/auditLog.js";

/** Business media upload + admin moderation (pending/approved/rejected). */

const MEDIA_COLUMNS =
  "id,business_id,location_id,type,url,thumbnail_url,status,uploaded_by,reviewed_by,reviewed_at,rejection_reason,created_at";

export async function listBusinessMedia(businessId: string, limit = 100) {
  const { data } = await getSupabaseAdmin()
    .from("business_media")
    .select(MEDIA_COLUMNS)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function createBusinessMedia(
  businessId: string,
  uploadedBy: string,
  body: { url?: string; type?: string; location_id?: string | null; thumbnail_url?: string | null },
) {
  const url = body.url?.trim();
  if (!url) throw new Error("media_url_required");
  const type = body.type === "video" ? "video" : "image";
  // When moderation is required, media starts pending; otherwise auto-approved.
  const status = env.BUSINESS_MEDIA_MODERATION_REQUIRED ? "pending" : "approved";
  const { data, error } = await getSupabaseAdmin()
    .from("business_media")
    .insert({
      business_id: businessId,
      location_id: body.location_id ?? null,
      type,
      url,
      thumbnail_url: body.thumbnail_url ?? null,
      status,
      uploaded_by: uploadedBy,
    })
    .select(MEDIA_COLUMNS)
    .single();
  if (error) throw error;
  await logSystemEvent({
    title: "Business media uploaded",
    source: "media",
    detail: `${type} for business ${businessId} (${status})`,
    metadata: { media_id: data.id, business_id: businessId, status },
  });
  return data;
}

export async function adminListMedia(limit = 100, status?: string) {
  let q = getSupabaseAdmin()
    .from("business_media")
    .select(MEDIA_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function adminUpdateMediaStatus(
  mediaId: string,
  reviewerId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  if (!["approved", "rejected"].includes(status)) throw new Error("invalid_status");
  const { data, error } = await getSupabaseAdmin()
    .from("business_media")
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
    })
    .eq("id", mediaId)
    .select(MEDIA_COLUMNS)
    .single();
  if (error) throw error;
  await logSystemEvent({
    level: status === "approved" ? "success" : "warning",
    title: `Media ${status}`,
    source: "media",
    metadata: { media_id: mediaId, reviewer: reviewerId, status },
  });
  return data;
}
