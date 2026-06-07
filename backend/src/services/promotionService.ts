import { getSupabaseAdmin } from "../lib/auth.js";

type VoucherRow = Record<string, unknown>;
type PostRow = Record<string, unknown>;

const VOUCHER_APPLICABILITIES = new Set(["hotel_places", "user_subscription", "pro_plan"]);
const VOUCHER_BILLING_CYCLES = new Set(["both", "monthly", "yearly"]);

function metadata(v: VoucherRow): Record<string, unknown> {
  return v.metadata && typeof v.metadata === "object" && !Array.isArray(v.metadata)
    ? (v.metadata as Record<string, unknown>)
    : {};
}

function voucherApplicability(value: unknown): string {
  const normalized = String(value ?? "hotel_places");
  return VOUCHER_APPLICABILITIES.has(normalized) ? normalized : "hotel_places";
}

function voucherBillingCycle(value: unknown): string {
  const normalized = String(value ?? "both");
  return VOUCHER_BILLING_CYCLES.has(normalized) ? normalized : "both";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : null;
}

function partnerName(v: VoucherRow): string | null {
  const p = v.partners;
  const row = Array.isArray(p) ? p[0] : p;
  return row && typeof row === "object" && "name" in row ? String((row as { name?: string }).name ?? "") || null : null;
}

function mapVoucher(v: VoucherRow, savedIds = new Set<string>()) {
  const id = String(v.id);
  const meta = metadata(v);
  return {
    id,
    code: v.code,
    title: v.title,
    description: v.description ?? null,
    discount_percent: v.discount_percent ?? null,
    discount_amount: v.discount_amount ?? null,
    valid_from: v.valid_from ?? null,
    valid_until: v.valid_until ?? null,
    partner_name: partnerName(v),
    is_saved: savedIds.has(id),
    applicability: voucherApplicability(meta.applicability),
    billing_cycle: voucherBillingCycle(meta.billing_cycle),
  };
}

function mapPost(p: PostRow, voucher: unknown = p.vouchers, savedIds = new Set<string>()) {
  const rel = Array.isArray(voucher) ? voucher[0] : voucher;
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle ?? null,
    body: p.body ?? null,
    cover_image_url: p.cover_image_url,
    post_type: p.post_type,
    voucher_id: p.voucher_id ?? null,
    status: p.status,
    sort_order: p.sort_order ?? 0,
    starts_at: p.starts_at ?? null,
    ends_at: p.ends_at ?? null,
    created_at: p.created_at ?? null,
    voucher: rel ? mapVoucher(rel as VoucherRow, savedIds) : null,
  };
}

async function defaultPartnerId(): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data: found } = await sb.from("partners").select("id").eq("name", "WanderTale").maybeSingle();
  if (found?.id) return found.id;
  const { data, error } = await sb
    .from("partners")
    .insert({ name: "WanderTale", website: "https://wander-tale.app", country: "VN" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function savedVoucherIds(userId: string): Promise<Set<string>> {
  const { data } = await getSupabaseAdmin()
    .from("user_saved_vouchers")
    .select("voucher_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((r) => String(r.voucher_id)));
}

export async function listPromotionHome(userId: string) {
  const sb = getSupabaseAdmin();
  const today = todayISO();
  const saved = await savedVoucherIds(userId);
  const [voucherResult, postResult] = await Promise.all([
    sb
      .from("vouchers")
      .select("id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,created_at,partners(name)")
      .lte("valid_from", today)
      .gte("valid_until", today)
      .order("created_at", { ascending: false })
      .limit(20),
    sb
      .from("promotion_posts")
      .select("*,vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,partners(name))")
      .eq("status", "published")
      .or(`starts_at.is.null,starts_at.lte.${today}`)
      .or(`ends_at.is.null,ends_at.gte.${today}`)
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (voucherResult.error) throw voucherResult.error;
  if (postResult.error) throw postResult.error;
  const vouchers = (voucherResult.data ?? []).map((v) => mapVoucher(v as VoucherRow, saved));
  const posts = (postResult.data ?? []).map((p) => mapPost(p as PostRow, undefined, saved));
  return { items: vouchers, vouchers, posts };
}

export async function getPromotionPost(postId: string, userId: string) {
  const saved = await savedVoucherIds(userId);
  const { data, error } = await getSupabaseAdmin()
    .from("promotion_posts")
    .select("*,vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,partners(name))")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("promotion_post_not_found");
  return mapPost(data as PostRow, undefined, saved);
}

export async function savePromotionVoucher(userId: string, voucherId: string) {
  const { error } = await getSupabaseAdmin()
    .from("user_saved_vouchers")
    .upsert({ user_id: userId, voucher_id: voucherId }, { onConflict: "user_id,voucher_id" });
  if (error) throw error;
  return { ok: true };
}

export async function unsavePromotionVoucher(userId: string, voucherId: string) {
  const { error } = await getSupabaseAdmin()
    .from("user_saved_vouchers")
    .delete()
    .eq("user_id", userId)
    .eq("voucher_id", voucherId);
  if (error) throw error;
  return { ok: true };
}

export async function adminListPromotionVouchers() {
  const { data, error } = await getSupabaseAdmin()
    .from("vouchers")
    .select("id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,created_at,partners(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((v) => mapVoucher(v as VoucherRow));
}

export async function adminCreatePromotionVoucher(body: {
  code?: string;
  title?: string;
  description?: string;
  discount_percent?: number;
  discount_amount?: number;
  valid_from?: string;
  valid_until?: string;
  applicability?: string;
  billing_cycle?: string;
}) {
  if (!body.code?.trim()) throw new Error("voucher_code_required");
  if (!body.title?.trim()) throw new Error("voucher_title_required");
  const today = todayISO();
  const partner_id = await defaultPartnerId();
  const { data, error } = await getSupabaseAdmin()
    .from("vouchers")
    .insert({
      partner_id,
      code: body.code.trim().toUpperCase(),
      title: body.title.trim(),
      description: body.description?.trim() || null,
      discount_percent: n(body.discount_percent),
      discount_amount: n(body.discount_amount),
      valid_from: body.valid_from || today,
      valid_until: body.valid_until || today,
      metadata: {
        applicability: voucherApplicability(body.applicability),
        billing_cycle: voucherBillingCycle(body.billing_cycle),
      },
    })
    .select("id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,created_at,partners(name)")
    .single();
  if (error) throw error;
  return mapVoucher(data as VoucherRow);
}

export async function adminUpdatePromotionVoucher(voucherId: string, body: {
  code?: string;
  title?: string;
  description?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  valid_from?: string;
  valid_until?: string;
  applicability?: string;
  billing_cycle?: string;
}) {
  const patch: Record<string, unknown> = {};
  if (body.code !== undefined) patch.code = body.code.trim().toUpperCase();
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.discount_percent !== undefined) patch.discount_percent = n(body.discount_percent);
  if (body.discount_amount !== undefined) patch.discount_amount = n(body.discount_amount);
  if (body.valid_from !== undefined) patch.valid_from = body.valid_from;
  if (body.valid_until !== undefined) patch.valid_until = body.valid_until;
  if (body.applicability !== undefined || body.billing_cycle !== undefined) {
    const { data: current, error: currentError } = await getSupabaseAdmin()
      .from("vouchers")
      .select("metadata")
      .eq("id", voucherId)
      .maybeSingle();
    if (currentError) throw currentError;
    const currentMeta = metadata((current ?? {}) as VoucherRow);
    patch.metadata = {
      ...currentMeta,
      applicability: voucherApplicability(body.applicability ?? currentMeta.applicability),
      billing_cycle: voucherBillingCycle(body.billing_cycle ?? currentMeta.billing_cycle),
    };
  }
  if (!Object.keys(patch).length) throw new Error("empty_update");
  const { data, error } = await getSupabaseAdmin()
    .from("vouchers")
    .update(patch)
    .eq("id", voucherId)
    .select("id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,created_at,partners(name)")
    .single();
  if (error) throw error;
  return mapVoucher(data as VoucherRow);
}

export async function adminDeletePromotionVoucher(voucherId: string) {
  const sb = getSupabaseAdmin();
  await sb.from("promotion_posts").update({ voucher_id: null }).eq("voucher_id", voucherId);
  await sb.from("user_saved_vouchers").delete().eq("voucher_id", voucherId);
  const { error } = await sb.from("vouchers").delete().eq("id", voucherId);
  if (error) throw error;
  return { ok: true };
}

export async function adminListPromotionPosts() {
  const { data, error } = await getSupabaseAdmin()
    .from("promotion_posts")
    .select("*,vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,partners(name))")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((p) => mapPost(p as PostRow));
}

export async function adminCreatePromotionPost(userId: string, body: {
  title?: string;
  subtitle?: string;
  body?: string;
  cover_image_url?: string;
  post_type?: string;
  voucher_id?: string | null;
  status?: string;
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  if (!body.title?.trim()) throw new Error("post_title_required");
  if (!body.cover_image_url?.trim()) throw new Error("cover_image_required");
  const postType = body.post_type === "main" ? "main" : "secondary";
  const status = ["draft", "published", "archived"].includes(String(body.status)) ? body.status : "published";
  const { data, error } = await getSupabaseAdmin()
    .from("promotion_posts")
    .insert({
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || null,
      body: body.body?.trim() || null,
      cover_image_url: body.cover_image_url.trim(),
      post_type: postType,
      voucher_id: body.voucher_id || null,
      status,
      sort_order: n(body.sort_order) ?? 0,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      created_by: userId,
    })
    .select("*,vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,partners(name))")
    .single();
  if (error) throw error;
  return mapPost(data as PostRow);
}

export async function adminUpdatePromotionPost(postId: string, body: {
  title?: string;
  subtitle?: string | null;
  body?: string | null;
  cover_image_url?: string;
  post_type?: string;
  voucher_id?: string | null;
  status?: string;
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}) {
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.subtitle !== undefined) patch.subtitle = body.subtitle?.trim() || null;
  if (body.body !== undefined) patch.body = body.body?.trim() || null;
  if (body.cover_image_url !== undefined) patch.cover_image_url = body.cover_image_url.trim();
  if (body.post_type !== undefined) patch.post_type = body.post_type === "main" ? "main" : "secondary";
  if (body.voucher_id !== undefined) patch.voucher_id = body.voucher_id || null;
  if (body.status !== undefined) patch.status = ["draft", "published", "archived"].includes(body.status) ? body.status : "published";
  if (body.sort_order !== undefined) patch.sort_order = n(body.sort_order) ?? 0;
  if (body.starts_at !== undefined) patch.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) patch.ends_at = body.ends_at || null;
  if (!Object.keys(patch).length) throw new Error("empty_update");
  const { data, error } = await getSupabaseAdmin()
    .from("promotion_posts")
    .update(patch)
    .eq("id", postId)
    .select("*,vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata,partners(name))")
    .single();
  if (error) throw error;
  return mapPost(data as PostRow);
}

export async function adminDeletePromotionPost(postId: string) {
  const { error } = await getSupabaseAdmin().from("promotion_posts").delete().eq("id", postId);
  if (error) throw error;
  return { ok: true };
}
