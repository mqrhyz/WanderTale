import { getSupabaseAdmin } from "../lib/auth.js";
import { logSystemEvent } from "../lib/auditLog.js";
import { createPaymentLink, isPayosConfigured } from "../lib/payos.js";
import { env } from "../lib/env.js";

const FREE_MONTHLY_TRIP_LIMIT = 5;

const USER_SUBSCRIPTION_PACKAGES = [
  {
    id: "pro_monthly",
    name: "WanderTale Pro tháng",
    tier: "pro",
    billing_cycle: "monthly",
    price_vnd: 49000,
    duration_days: 30,
    benefits: [
      "Tạo chuyến đi AI không giới hạn",
      "Ưu tiên làm giàu ảnh, khách sạn và giá phòng",
      "Áp dụng voucher Pro theo tháng nếu có",
    ],
  },
  {
    id: "pro_yearly",
    name: "WanderTale Pro năm",
    tier: "pro",
    billing_cycle: "yearly",
    price_vnd: 499000,
    duration_days: 365,
    benefits: [
      "Tạo chuyến đi AI không giới hạn trong 12 tháng",
      "Ưu tiên làm giàu ảnh, khách sạn và giá phòng",
      "Áp dụng voucher Pro theo năm nếu có",
    ],
  },
] as const;

type UserPackage = (typeof USER_SUBSCRIPTION_PACKAGES)[number];
type VoucherRow = Record<string, unknown>;

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function metadata(v: VoucherRow): Record<string, unknown> {
  return v.metadata && typeof v.metadata === "object" && !Array.isArray(v.metadata)
    ? (v.metadata as Record<string, unknown>)
    : {};
}

function monthStart(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isProfilePro(profile: Record<string, unknown> | null): boolean {
  if (!profile?.is_premium) return false;
  const tier = String(profile.subscription_tier ?? "").toLowerCase();
  if (tier !== "pro" && tier !== "premium") return false;
  const expires = profile.subscription_expires_at ? new Date(String(profile.subscription_expires_at)).getTime() : 0;
  return !expires || expires > Date.now();
}

function packageFor(id: string): UserPackage {
  const pkg = USER_SUBSCRIPTION_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error("subscription_package_not_found");
  return pkg;
}

function voucherApplies(voucher: VoucherRow, pkg: UserPackage): boolean {
  const meta = metadata(voucher);
  const applicability = String(meta.applicability ?? "hotel_places");
  const cycle = String(meta.billing_cycle ?? "both");
  if (applicability === "user_subscription") return true;
  if (applicability !== "pro_plan") return false;
  return cycle === "both" || cycle === pkg.billing_cycle;
}

function discountFor(voucher: VoucherRow | null, amount: number): number {
  if (!voucher) return 0;
  const byPercent = Math.round(amount * Math.max(0, n(voucher.discount_percent)) / 100);
  const byAmount = Math.round(Math.max(0, n(voucher.discount_amount)));
  return Math.min(amount, Math.max(byPercent, byAmount));
}

function mapVoucher(v: VoucherRow) {
  const meta = metadata(v);
  return {
    id: String(v.id),
    code: v.code,
    title: v.title,
    description: v.description ?? null,
    discount_percent: v.discount_percent ?? null,
    discount_amount: v.discount_amount ?? null,
    valid_from: v.valid_from ?? null,
    valid_until: v.valid_until ?? null,
    applicability: String(meta.applicability ?? "hotel_places"),
    billing_cycle: String(meta.billing_cycle ?? "both"),
  };
}

export async function getUserSubscriptionOverview(userId: string) {
  const sb = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profile }, { count }, { data: saved }] = await Promise.all([
    sb
      .from("profiles")
      .select("id,is_premium,subscription_tier,subscription_expires_at")
      .eq("id", userId)
      .maybeSingle(),
    sb
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart()),
    sb
      .from("user_saved_vouchers")
      .select("vouchers(id,code,title,description,discount_percent,discount_amount,valid_from,valid_until,metadata)")
      .eq("user_id", userId),
  ]);

  const active = isProfilePro(profile as Record<string, unknown> | null);
  const vouchers = (saved ?? [])
    .map((r) => (Array.isArray(r.vouchers) ? r.vouchers[0] : r.vouchers) as VoucherRow | null)
    .filter((v): v is VoucherRow => Boolean(v?.id))
    .filter((v) => String(v.valid_from ?? "0000-01-01") <= today && String(v.valid_until ?? "9999-12-31") >= today)
    .filter((v) => {
      const applicability = String(metadata(v).applicability ?? "hotel_places");
      return applicability === "user_subscription" || applicability === "pro_plan";
    })
    .map(mapVoucher);

  return {
    is_premium: active,
    tier: active ? "pro" : "free",
    subscription_expires_at: active ? profile?.subscription_expires_at ?? null : null,
    monthly_trip_count: count ?? 0,
    monthly_trip_limit: active ? null : FREE_MONTHLY_TRIP_LIMIT,
    packages: USER_SUBSCRIPTION_PACKAGES,
    vouchers,
  };
}

export async function assertCanCreateTrip(userId: string) {
  const overview = await getUserSubscriptionOverview(userId);
  if (overview.is_premium) return overview;
  if (overview.monthly_trip_count >= FREE_MONTHLY_TRIP_LIMIT) {
    const err = new Error("free_trip_limit_reached");
    (err as Error & { statusCode?: number; details?: unknown }).statusCode = 402;
    (err as Error & { statusCode?: number; details?: unknown }).details = overview;
    throw err;
  }
  return overview;
}

export async function activateUserSubscriptionByTransaction(txId: string) {
  const sb = getSupabaseAdmin();
  const { data: tx } = await sb
    .from("platform_transactions")
    .select("id,user_id,metadata,status")
    .eq("id", txId)
    .maybeSingle();
  if (!tx?.user_id) return null;
  const meta = metadata(tx as VoucherRow);
  const pkg = packageFor(String(meta.package_id));
  const starts = new Date();
  const ends = new Date(starts.getTime() + pkg.duration_days * 86400000);
  await sb
    .from("profiles")
    .update({
      is_premium: true,
      subscription_tier: "pro",
      subscription_expires_at: ends.toISOString(),
    })
    .eq("id", tx.user_id);
  await sb.from("platform_transactions").update({ status: "captured" }).eq("id", txId);
  await logSystemEvent({
    level: "success",
    title: "User subscription activated",
    source: "payment",
    metadata: { user_id: tx.user_id, package_id: pkg.id, transaction_id: txId },
  });
  return { ok: true, tier: "pro", subscription_expires_at: ends.toISOString() };
}

export async function finalizeUserSubscriptionByOrderCode(orderCode: number, reference?: string) {
  const { data: tx } = await getSupabaseAdmin()
    .from("platform_transactions")
    .select("*")
    .eq("kind", "user_subscription")
    .contains("metadata", { order_code: orderCode })
    .maybeSingle();
  if (!tx) return null;
  if (tx.status === "captured") return { already: true };
  await getSupabaseAdmin()
    .from("platform_transactions")
    .update({ provider_ref: reference ?? tx.provider_ref })
    .eq("id", tx.id);
  await activateUserSubscriptionByTransaction(tx.id);
  return { already: false };
}

export async function purchaseUserSubscription(userId: string, input: { package_id?: string; voucher_id?: string | null }) {
  const pkg = packageFor(String(input.package_id ?? ""));
  const sb = getSupabaseAdmin();
  let voucher: VoucherRow | null = null;
  if (input.voucher_id) {
    const { data: saved } = await sb
      .from("user_saved_vouchers")
      .select("vouchers(id,code,title,discount_percent,discount_amount,valid_from,valid_until,metadata)")
      .eq("user_id", userId)
      .eq("voucher_id", input.voucher_id)
      .maybeSingle();
    voucher = (Array.isArray(saved?.vouchers) ? saved?.vouchers[0] : saved?.vouchers) as VoucherRow | null;
    if (!voucher || !voucherApplies(voucher, pkg)) throw new Error("voucher_not_applicable");
  }

  const originalAmount = Math.round(pkg.price_vnd);
  const discountAmount = discountFor(voucher, originalAmount);
  const amount = Math.max(0, originalAmount - discountAmount);
  const orderCode = Number(`${Date.now()}`.slice(-12));
  const { data: tx, error } = await sb
    .from("platform_transactions")
    .insert({
      kind: "user_subscription",
      source: "system",
      user_id: userId,
      gross_amount: originalAmount,
      commission_amount: 0,
      net_amount: amount,
      currency: "VND",
      status: "pending",
      description: `Mua ${pkg.name}`,
      metadata: {
        package_id: pkg.id,
        billing_cycle: pkg.billing_cycle,
        duration_days: pkg.duration_days,
        order_code: orderCode,
        voucher_id: voucher?.id ?? null,
        original_amount: originalAmount,
        discount_amount: discountAmount,
      },
    })
    .select("id")
    .single();
  if (error) throw error;

  if (amount <= 0 || env.PAYMENT_SIMULATION_MODE || !isPayosConfigured()) {
    const activated = await activateUserSubscriptionByTransaction(tx.id);
    return {
      payment_status: "paid",
      amount,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      transaction_id: tx.id,
      subscription: activated,
    };
  }

  const link = await createPaymentLink({
    orderCode,
    amount,
    description: `WanderTale Pro`,
  });
  await sb.from("platform_transactions").update({ provider_ref: link.paymentLinkId, status: "authorized" }).eq("id", tx.id);
  return {
    payment_status: "pending_payment",
    checkout_url: link.checkoutUrl,
    qr_code: link.qrCode ?? null,
    account_number: link.accountNumber ?? null,
    account_name: link.accountName ?? null,
    amount: link.amount ?? amount,
    original_amount: originalAmount,
    discount_amount: discountAmount,
    transfer_content: link.description ?? null,
    order_code: orderCode,
    transaction_id: tx.id,
  };
}
