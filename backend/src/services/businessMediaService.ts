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

export type BusinessNotification = {
  id: string;
  type: "media" | "booking";
  title: string;
  message: string;
  status: string;
  created_at: string;
};

/** Thông báo cho doanh nghiệp: media được duyệt/từ chối + booking mới. */
export async function getBusinessNotifications(businessId: string): Promise<BusinessNotification[]> {
  const sb = getSupabaseAdmin();
  const [{ data: media }, { data: bookings }] = await Promise.all([
    sb.from("business_media")
      .select("id,url,type,status,reviewed_at,rejection_reason,created_at")
      .eq("business_id", businessId)
      .in("status", ["approved", "rejected"])
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(20),
    sb.from("bookings")
      .select("id,status,total_amount,payment_mode,created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const items: BusinessNotification[] = [];

  for (const m of media ?? []) {
    const approved = m.status === "approved";
    items.push({
      id: `media-${m.id}`,
      type: "media",
      status: m.status,
      title: approved ? "Media đã được duyệt" : "Media bị từ chối",
      message: approved
        ? `${m.type === "video" ? "Video" : "Ảnh"} của bạn đã được duyệt và hiển thị.`
        : `${m.type === "video" ? "Video" : "Ảnh"} bị từ chối${m.rejection_reason ? `: ${m.rejection_reason}` : "."}`,
      created_at: m.reviewed_at ?? m.created_at,
    });
  }

  for (const b of bookings ?? []) {
    const paid = b.status === "paid" || b.status === "confirmed";
    items.push({
      id: `booking-${b.id}`,
      type: "booking",
      status: b.status ?? "pending",
      title: paid
        ? (b.payment_mode === "pay_later" ? "Đặt chỗ mới (trả sau)" : "Đặt chỗ đã thanh toán")
        : "Đặt chỗ mới",
      message: `Đơn ${Math.round(Number(b.total_amount) || 0).toLocaleString("vi-VN")}đ — ${b.status}.`,
      created_at: b.created_at,
    });
  }

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return items.slice(0, 30);
}
