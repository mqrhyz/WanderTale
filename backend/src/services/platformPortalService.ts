import { getSupabaseAdmin } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { logSystemEvent } from "../lib/auditLog.js";
import { createPaymentLink, getPaymentLinkInfo, isPayosConfigured } from "../lib/payos.js";

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getBusinessIdForOwner(ownerId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Public catalog: active businesses a user can book. */
export async function listActiveBusinesses(limit = 100) {
  const { data } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,name,business_type,region,hotline,description,rating_avg,rating_count")
    .eq("status", "active")
    .order("rating_avg", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getActiveBusinessDetail(businessId: string) {
  const { data: business } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,name,business_type,region,hotline,description,rating_avg,rating_count,status")
    .eq("id", businessId)
    .eq("status", "active")
    .maybeSingle();
  if (!business) throw new Error("business_not_found");
  const { data: locations } = await getSupabaseAdmin()
    .from("business_locations")
    .select("id,name,address,category,status")
    .eq("business_id", businessId)
    .eq("status", "live")
    .order("created_at", { ascending: false });
  const { data: mediaRows } = await getSupabaseAdmin()
    .from("business_media")
    .select("id,type,url,thumbnail_url")
    .eq("business_id", businessId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(12);
  return { business, locations: locations ?? [], media: mediaRows ?? [] };
}

export async function businessOverview(businessId: string) {
  const sb = getSupabaseAdmin();

  const [businessResult, bookingsResult, activeAdsResult, campaignsResult] = await Promise.all([
    sb.from("businesses")
      .select("id,name,status,business_type,region,hotline,description,license_no,rating_avg,rating_count,created_at")
      .eq("id", businessId)
      .maybeSingle(),
    sb.from("bookings")
      .select("id,gross_amount,net_amount,commission_amount,status")
      .eq("business_id", businessId)
      .in("status", ["confirmed", "pending"]),
    sb.from("business_ad_orders")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "active"),
    sb.from("business_ad_campaigns")
      .select("id,impressions,clicks,suggested_count,budget_vnd,spent_vnd,status,starts_at,ends_at")
      .eq("business_id", businessId),
  ]);

  const business = businessResult.data;
  const bookings = bookingsResult.data ?? [];
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const bookingCount = confirmed.length;
  const grossRevenue = confirmed.reduce((s, b) => s + n(b.gross_amount), 0);
  const netRevenue = confirmed.reduce((s, b) => s + n(b.net_amount ?? b.gross_amount) - n(b.commission_amount), 0);

  const campaigns = campaignsResult.data ?? [];

  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active");
  const impressions = (campaigns ?? []).reduce((s, c) => s + n(c.impressions), 0);
  const clicks = (campaigns ?? []).reduce((s, c) => s + n(c.clicks), 0);
  const suggested = (campaigns ?? []).reduce((s, c) => s + n(c.suggested_count), 0);
  const budget = activeCampaigns.reduce((s, c) => s + n(c.budget_vnd), 0);
  const spent = activeCampaigns.reduce((s, c) => s + n(c.spent_vnd), 0);

  const adPackageExpiry = await businessAdExpiry(businessId);

  return {
    business,
    booking_count: bookingCount,
    gross_revenue_vnd: grossRevenue,
    net_revenue_vnd: netRevenue,
    active_ad_campaigns: activeAdsResult.data?.length ?? 0,
    campaign_count: activeCampaigns.length,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    suggested_count: suggested,
    remaining_budget_vnd: Math.max(0, budget - spent),
    ad_package_expiry: adPackageExpiry,
  };
}

export async function businessTransactions(businessId: string, limit = 50) {
  const { data } = await getSupabaseAdmin()
    .from("platform_transactions")
    .select("id,kind,gross_amount,commission_amount,net_amount,status,description,created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdPackages() {
  const { data } = await getSupabaseAdmin()
    .from("ad_packages")
    .select("id,name,description,price_vnd,duration_days,boost_level")
    .eq("active", true)
    .order("price_vnd", { ascending: true });
  return data ?? [];
}

export async function businessCampaigns(businessId: string) {
  const { data } = await getSupabaseAdmin()
    .from("business_ad_campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createBusinessCampaign(
  businessId: string,
  body: {
    name?: string;
    target_type?: string;
    region?: string;
    season?: string;
    budget_vnd?: number;
    starts_at?: string;
    ends_at?: string;
  },
) {
  if (!body.name?.trim()) throw new Error("campaign_name_required");
  const { data, error } = await getSupabaseAdmin()
    .from("business_ad_campaigns")
    .insert({
      business_id: businessId,
      name: body.name.trim(),
      target_type: body.target_type ?? null,
      region: body.region ?? null,
      season: body.season ?? null,
      budget_vnd: n(body.budget_vnd),
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function businessVouchers(businessId: string) {
  const { data } = await getSupabaseAdmin()
    .from("business_vouchers")
    .select("*")
    .eq("business_id", businessId)
    .order("valid_until", { ascending: false });
  return data ?? [];
}

export async function createBusinessVoucher(
  businessId: string,
  body: {
    code?: string;
    title?: string;
    description?: string;
    discount_type?: string;
    discount_value?: number;
    max_discount_vnd?: number;
    audience?: string;
    usage_limit?: number;
    valid_from?: string;
    valid_until?: string;
  },
) {
  if (!body.code?.trim()) throw new Error("voucher_code_required");
  if (!body.title?.trim()) throw new Error("voucher_title_required");
  const now = todayISO();
  const { data, error } = await getSupabaseAdmin()
    .from("business_vouchers")
    .insert({
      business_id: businessId,
      code: body.code.trim().toUpperCase(),
      title: body.title.trim(),
      description: body.description ?? null,
      discount_type: body.discount_type ?? "percent",
      discount_value: n(body.discount_value),
      max_discount_vnd: body.max_discount_vnd ?? null,
      audience: body.audience ?? "new_user",
      usage_limit: body.usage_limit ?? null,
      valid_from: body.valid_from ?? now,
      valid_until: body.valid_until ?? now,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function businessLocations(businessId: string) {
  const { data } = await getSupabaseAdmin()
    .from("business_locations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createBusinessLocation(
  businessId: string,
  body: { name?: string; address?: string; category?: string; lat?: number; lng?: number },
) {
  if (!body.name?.trim()) throw new Error("location_name_required");
  const { data, error } = await getSupabaseAdmin()
    .from("business_locations")
    .insert({
      business_id: businessId,
      name: body.name.trim(),
      address: body.address ?? null,
      category: body.category ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function businessReviews(businessId: string) {
  const { data } = await getSupabaseAdmin()
    .from("business_reviews")
    .select("id,business_id,user_id,author_name,rating,comment,reply,reported,created_at,replied_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function replyBusinessReview(businessId: string, reviewId: string, reply: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("business_reviews")
    .update({ reply, replied_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("id", reviewId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function purchaseAdPackage(businessId: string, packageId: string) {
  const { data: pkg, error: pkgErr } = await getSupabaseAdmin()
    .from("ad_packages")
    .select("*")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();
  if (pkgErr) throw pkgErr;
  if (!pkg) throw new Error("package_not_found");

  const now = new Date();
  const ends = new Date(now.getTime() + Number(pkg.duration_days) * 86400000);
  const amount = Math.round(Number(pkg.price_vnd));
  const orderCode = Number(`${Date.now()}`.slice(-12));

  // Ledger: pending payment for the ad package.
  const { data: tx, error: txErr } = await getSupabaseAdmin()
    .from("platform_transactions")
    .insert({
      kind: "ad_purchase",
      source: "advertising",
      business_id: businessId,
      gross_amount: amount,
      commission_amount: 0,
      net_amount: amount,
      currency: "VND",
      status: "pending",
      description: `Mua gói quảng cáo: ${pkg.name}`,
      metadata: { package_id: packageId, duration_days: pkg.duration_days, order_code: orderCode },
    })
    .select("id")
    .single();
  if (txErr) throw txErr;

  // Order starts as pending; activated only after payment confirmed.
  const { data: order, error: orderErr } = await getSupabaseAdmin()
    .from("business_ad_orders")
    .insert({
      business_id: businessId,
      package_id: packageId,
      amount_vnd: amount,
      status: "pending",
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      payment_transaction_id: tx.id,
    })
    .select("*")
    .single();
  if (orderErr) throw orderErr;

  // PayOS mode: create payment link, business must pay to activate.
  if (!env.PAYMENT_SIMULATION_MODE && isPayosConfigured()) {
    const link = await createPaymentLink({
      orderCode,
      amount,
      description: `WanderTale ${pkg.name.slice(0, 15)}`,
    });
    await getSupabaseAdmin()
      .from("platform_transactions")
      .update({ provider_ref: link.paymentLinkId, status: "authorized" })
      .eq("id", tx.id);

    await logSystemEvent({
      title: "Ad package payment link created",
      source: "advertising",
      metadata: { business_id: businessId, package_id: packageId, order_code: orderCode },
    });

    return {
      ...order,
      order: {
        id: order.id,
        status: order.status,
        amount_vnd: order.amount_vnd,
        starts_at: order.starts_at,
        ends_at: order.ends_at,
      },
      payment_status: "pending_payment",
      checkout_url: link.checkoutUrl,
      qr_code: link.qrCode ?? null,
      account_number: link.accountNumber ?? null,
      account_name: link.accountName ?? null,
      amount: link.amount ?? amount,
      transfer_content: link.description ?? null,
      order_code: orderCode,
    };
  }

  // Simulation mode: activate immediately.
  await getSupabaseAdmin().from("business_ad_orders").update({ status: "active" }).eq("id", order.id);
  await getSupabaseAdmin().from("platform_transactions").update({ status: "captured" }).eq("id", tx.id);
  await logSystemEvent({
    level: "success",
    title: "Ad package purchased (simulation)",
    source: "advertising",
    metadata: { business_id: businessId, package_id: packageId, order_id: order.id },
  });
  return { ...order, status: "active", payment_status: "paid" };
}

export async function adminOverview() {
  const sb = getSupabaseAdmin();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  const [txResult, userResult, businessResult, bookingResult, tripsTodayResult, pendingResult, bannedResult] =
    await Promise.all([
      sb.from("platform_transactions").select("kind,commission_amount,gross_amount,net_amount,status").eq("status", "completed"),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("businesses").select("id", { count: "exact", head: true }),
      sb.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
      sb.from("trips").select("id", { count: "exact", head: true }).gte("created_at", startToday.toISOString()),
      sb.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("status", "banned"),
    ]);

  const rows = txResult.data ?? [];
  const commissionRevenue = rows
    .filter((r) => r.kind === "booking_commission" || r.kind === "commission")
    .reduce((s, r) => s + n(r.commission_amount), 0);
  const adRevenue = rows
    .filter((r) => r.kind === "ad_purchase")
    .reduce((s, r) => s + n(r.gross_amount), 0);

  return {
    commission_revenue_vnd: commissionRevenue,
    ad_revenue_vnd: adRevenue,
    total_revenue_vnd: commissionRevenue + adRevenue,
    user_count: userResult.count ?? 0,
    business_count: businessResult.count ?? 0,
    booking_count: bookingResult.count ?? 0,
    trips_today: tripsTodayResult.count ?? 0,
    pending_business_count: pendingResult.count ?? 0,
    banned_user_count: bannedResult.count ?? 0,
  };
}

export async function adminTransactions(limit = 100) {
  const { data } = await getSupabaseAdmin()
    .from("platform_transactions")
    .select("id,kind,business_id,gross_amount,commission_amount,net_amount,status,description,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function adminListUsers(limit = 100) {
  const { data } = await getSupabaseAdmin()
    .from("profiles")
    .select("id,display_name,email,phone,is_admin,is_business,status,last_login_at,last_device,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function adminCreateUser(input: {
  email?: string;
  password?: string;
  display_name?: string;
  is_admin?: boolean;
  is_business?: boolean;
  status?: string;
}) {
  const email = input.email?.trim().toLowerCase();
  const password = input.password?.trim();
  if (!email) throw new Error("email_required");
  if (!password || password.length < 6) throw new Error("password_min_6");

  const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: input.display_name?.trim() || email },
  });
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("user_create_failed");

  const profilePatch = {
    id: userId,
    email,
    display_name: input.display_name?.trim() || email,
    is_admin: Boolean(input.is_admin),
    is_business: Boolean(input.is_business),
    status: input.status || "active",
  };

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .upsert(profilePatch, { onConflict: "id" })
    .select("id,display_name,email,phone,is_admin,is_business,status,last_login_at,last_device,created_at")
    .single();
  if (error) throw error;

  if (profilePatch.is_business) {
    await getSupabaseAdmin().from("businesses").upsert(
      {
        owner_id: userId,
        name: profilePatch.display_name,
        contact_email: email,
        status: "active",
      },
      { onConflict: "owner_id" },
    );
  }

  return data;
}

export async function adminUserDetail(userId: string) {
  const { data: user, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id,display_name,email,phone,is_admin,is_business,status,last_login_at,last_device,created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!user) throw new Error("user_not_found");
  const { data: trips } = await getSupabaseAdmin()
    .from("trips")
    .select("id,destination,start_date,end_date,travelers,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  return { user, trips: trips ?? [] };
}

export async function adminUpdateUserStatus(userId: string, status: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select("id,display_name,email,phone,is_admin,is_business,status,last_login_at,last_device,created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateUserRole(
  userId: string,
  patch: { is_admin?: boolean; is_business?: boolean },
) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id,display_name,email,is_admin,is_business")
    .single();
  if (error) throw error;

  if (patch.is_business && data) {
    const { data: existing } = await getSupabaseAdmin()
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!existing) {
      await getSupabaseAdmin().from("businesses").insert({
        owner_id: userId,
        name: data.display_name ?? data.email ?? "Doanh nghiệp",
        contact_email: data.email,
        status: "active",
      });
    }
  }
  return data;
}

export async function adminListBusinesses(limit = 100) {
  const { data } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,owner_id,name,contact_email,status,commission_rate,business_type,region,hotline,description,license_no,rating_avg,rating_count,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function adminSystemLogs(limit = 100, level?: string) {
  let q = getSupabaseAdmin()
    .from("system_logs")
    .select("id,level,title,source,detail,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (level && level !== "all") q = q.eq("level", level);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function adminUpdateBusinessStatus(businessId: string, status: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .update({ status })
    .eq("id", businessId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function adminGetAiConfig() {
  const { data } = await getSupabaseAdmin().from("ai_platform_config").select("key,value,updated_at");
  return data ?? [];
}

export async function adminUpdateAiConfig(key: string, value: Record<string, unknown>) {
  const { data, error } = await getSupabaseAdmin()
    .from("ai_platform_config")
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// --- Marketplace extensions: business profile/locations, ad-package admin CRUD ---

export async function getBusinessProfile(businessId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .select(
      "id,owner_id,name,contact_email,status,commission_rate,business_type,region,hotline,description,license_no,rating_avg,rating_count,created_at,updated_at",
    )
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("business_not_found");
  return data;
}

export async function updateBusinessProfile(
  businessId: string,
  body: {
    name?: string;
    contact_email?: string;
    business_type?: string;
    region?: string;
    hotline?: string;
    description?: string;
    license_no?: string;
  },
) {
  const patch: Record<string, unknown> = {};
  for (const key of ["name", "contact_email", "business_type", "region", "hotline", "description", "license_no"] as const) {
    if (typeof body[key] === "string") patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) throw new Error("nothing_to_update");
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .update(patch)
    .eq("id", businessId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateBusinessLocation(
  businessId: string,
  locationId: string,
  body: { name?: string; address?: string; category?: string; status?: string; lat?: number; lng?: number },
) {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.address === "string") patch.address = body.address;
  if (typeof body.category === "string") patch.category = body.category;
  if (body.status === "live" || body.status === "hidden") patch.status = body.status;
  if (typeof body.lat === "number") patch.lat = body.lat;
  if (typeof body.lng === "number") patch.lng = body.lng;
  if (Object.keys(patch).length === 0) throw new Error("nothing_to_update");
  const { data, error } = await getSupabaseAdmin()
    .from("business_locations")
    .update(patch)
    .eq("id", locationId)
    .eq("business_id", businessId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Active ad order expiry (ends_at of the latest active order) for dashboard. */
export async function businessAdExpiry(businessId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("business_ad_orders")
    .select("ends_at")
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.ends_at ?? null;
}

/** Status of a specific ad order (for polling payment activation). */
export async function getBusinessAdOrderStatus(businessId: string, orderId: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("business_ad_orders")
    .select("id,status,package_id,amount_vnd,starts_at,ends_at,payment_transaction_id")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("order_not_found");

  // Fallback: nếu order còn pending, hỏi trực tiếp PayOS để finalize
  // (phòng trường hợp webhook bị miss/trễ).
  if (data.status !== "active" && data.payment_transaction_id && isPayosConfigured()) {
    const { data: tx } = await sb
      .from("platform_transactions")
      .select("id,status,metadata")
      .eq("id", data.payment_transaction_id)
      .maybeSingle();
    const orderCode = Number((tx?.metadata as Record<string, unknown> | null)?.order_code);
    if (tx && tx.status !== "captured" && Number.isFinite(orderCode)) {
      const info = await getPaymentLinkInfo(orderCode);
      if (info?.status === "PAID") {
        await sb
          .from("platform_transactions")
          .update({ status: "captured", provider_ref: info.reference ?? null })
          .eq("id", tx.id);
        await sb.from("business_ad_orders").update({ status: "active" }).eq("id", orderId);
        await logSystemEvent({
          level: "success",
          title: "Ad package payment confirmed (poll)",
          source: "advertising",
          metadata: { order_code: orderCode, order_id: orderId },
        });
        return { ...data, status: "active" };
      }
    }
  }

  return data;
}

export async function adminListAdPackages() {
  const { data } = await getSupabaseAdmin()
    .from("ad_packages")
    .select("id,name,description,price_vnd,duration_days,boost_level,benefits,active,created_at")
    .order("price_vnd", { ascending: true });
  return data ?? [];
}

export async function adminCreateAdPackage(body: {
  name?: string;
  description?: string;
  price_vnd?: number;
  duration_days?: number;
  boost_level?: number;
  benefits?: Record<string, unknown>;
  active?: boolean;
}) {
  if (!body.name?.trim()) throw new Error("package_name_required");
  const price = n(body.price_vnd);
  if (price <= 0) throw new Error("package_price_invalid");
  const { data, error } = await getSupabaseAdmin()
    .from("ad_packages")
    .insert({
      name: body.name.trim(),
      description: body.description ?? null,
      price_vnd: price,
      duration_days: body.duration_days ?? 7,
      boost_level: body.boost_level ?? 1,
      benefits: body.benefits ?? {},
      active: body.active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  await logSystemEvent({ title: "Ad package created", source: "advertising", metadata: { package_id: data.id } });
  return data;
}

export async function adminUpdateAdPackage(
  packageId: string,
  body: {
    name?: string;
    description?: string;
    price_vnd?: number;
    duration_days?: number;
    boost_level?: number;
    benefits?: Record<string, unknown>;
    active?: boolean;
  },
) {
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.price_vnd === "number") patch.price_vnd = body.price_vnd;
  if (typeof body.duration_days === "number") patch.duration_days = body.duration_days;
  if (typeof body.boost_level === "number") patch.boost_level = body.boost_level;
  if (body.benefits && typeof body.benefits === "object") patch.benefits = body.benefits;
  if (typeof body.active === "boolean") patch.active = body.active;
  if (Object.keys(patch).length === 0) throw new Error("nothing_to_update");
  const { data, error } = await getSupabaseAdmin()
    .from("ad_packages")
    .update(patch)
    .eq("id", packageId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
