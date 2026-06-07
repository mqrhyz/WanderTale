import { getSupabaseAdmin } from "../lib/auth.js";

function n(v: unknown): number {
  const x = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\b(thanh pho|tinh|tp|thi xa|quan|huyen)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type AppliedVoucher = {
  id: string;
  code: string;
  title: string;
  discount_type: string;
  discount_value: number;
  final_price_vnd: number;
  discount_vnd: number;
} | null;

/** Tính giá sau khi áp voucher vào giá niêm yết. */
export function applyVoucher(
  priceVnd: number,
  voucher: {
    id: string;
    code: string;
    title: string;
    discount_type: string;
    discount_value: number;
    max_discount_vnd?: number | null;
  } | null,
): AppliedVoucher {
  if (!voucher || priceVnd <= 0) return null;
  let discount = 0;
  if (voucher.discount_type === "percent") {
    discount = Math.round((priceVnd * n(voucher.discount_value)) / 100);
  } else if (voucher.discount_type === "fixed") {
    discount = Math.round(n(voucher.discount_value));
  } else if (voucher.discount_type === "free") {
    discount = priceVnd;
  }
  if (voucher.max_discount_vnd != null) {
    discount = Math.min(discount, Math.round(n(voucher.max_discount_vnd)));
  }
  discount = Math.max(0, Math.min(discount, priceVnd));
  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.title,
    discount_type: voucher.discount_type,
    discount_value: n(voucher.discount_value),
    discount_vnd: discount,
    final_price_vnd: priceVnd - discount,
  };
}

/** Lấy voucher active tốt nhất (giảm nhiều nhất) của 1 business. */
async function bestVoucherForBusiness(businessId: string, priceVnd: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await getSupabaseAdmin()
    .from("business_vouchers")
    .select("id,code,title,discount_type,discount_value,max_discount_vnd,valid_from,valid_until,status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .lte("valid_from", today)
    .gte("valid_until", today);
  let best: AppliedVoucher = null;
  for (const v of data ?? []) {
    const applied = applyVoucher(priceVnd, v as never);
    if (applied && (!best || applied.discount_vnd > best.discount_vnd)) best = applied;
  }
  return best;
}

async function primaryImage(locationId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("business_media")
    .select("url")
    .eq("location_id", locationId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.url ?? null;
}

/**
 * Địa điểm được tài trợ (business đã mua gói active) cùng thành phố + trong ngân sách.
 * Trả kèm ảnh đại diện + voucher tốt nhất + giá sau giảm.
 */
export async function listSponsoredLocations(city: string, maxPriceVnd?: number) {
  const sb = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Business đang có gói quảng cáo active.
  const { data: orders } = await sb
    .from("business_ad_orders")
    .select("business_id,ends_at,status")
    .eq("status", "active")
    .gte("ends_at", nowIso);
  const sponsoredBizIds = Array.from(new Set((orders ?? []).map((o) => o.business_id).filter(Boolean)));
  if (sponsoredBizIds.length === 0) return [];

  const { data: locations } = await sb
    .from("business_locations")
    .select("id,business_id,name,address,category,city,price_vnd,description,lat,lng,rating_avg,rating_count,status")
    .in("business_id", sponsoredBizIds)
    .eq("status", "live");

  const cityNorm = norm(city);
  const matched = (locations ?? []).filter((loc) => {
    const locCity = norm(`${loc.city ?? ""} ${loc.address ?? ""}`);
    const cityOk = cityNorm.length === 0 || locCity.includes(cityNorm) || cityNorm.includes(norm(loc.city ?? ""));
    const priceOk = maxPriceVnd == null || loc.price_vnd == null || n(loc.price_vnd) <= maxPriceVnd;
    return cityOk && priceOk;
  });

  const enriched = await Promise.all(
    matched.slice(0, 10).map(async (loc) => {
      const [image, voucher] = await Promise.all([
        primaryImage(loc.id),
        bestVoucherForBusiness(loc.business_id, n(loc.price_vnd)),
      ]);
      return {
        ...loc,
        image_url: image,
        voucher,
        sponsored: true,
      };
    }),
  );
  return enriched;
}

/** Chi tiết 1 địa điểm public: thông tin + ảnh + voucher + rating + business. */
export async function getLocationDetail(locationId: string) {
  const sb = getSupabaseAdmin();
  const { data: loc, error } = await sb
    .from("business_locations")
    .select("id,business_id,name,address,category,city,price_vnd,description,lat,lng,rating_avg,rating_count,status")
    .eq("id", locationId)
    .maybeSingle();
  if (error) throw error;
  if (!loc) throw new Error("location_not_found");

  const [{ data: media }, { data: business }, voucher] = await Promise.all([
    sb.from("business_media")
      .select("id,type,url,thumbnail_url")
      .eq("location_id", locationId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(12),
    sb.from("businesses").select("id,name,hotline,status").eq("id", loc.business_id).maybeSingle(),
    bestVoucherForBusiness(loc.business_id, n(loc.price_vnd)),
  ]);

  return {
    ...loc,
    images: (media ?? []).map((m) => m.url),
    media: media ?? [],
    business,
    voucher,
  };
}

export async function listLocationReviews(locationId: string, limit = 30) {
  const { data } = await getSupabaseAdmin()
    .from("location_reviews")
    .select("id,location_id,user_id,rating,comment,created_at")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function createLocationReview(
  locationId: string,
  userId: string,
  body: { rating?: number; comment?: string },
) {
  const rating = Math.max(1, Math.min(5, Math.round(n(body.rating) || 5)));
  const { data, error } = await getSupabaseAdmin()
    .from("location_reviews")
    .insert({
      location_id: locationId,
      user_id: userId,
      rating,
      comment: body.comment?.trim() || null,
    })
    .select("id,location_id,user_id,rating,comment,created_at")
    .single();
  if (error) throw error;
  return data;
}
