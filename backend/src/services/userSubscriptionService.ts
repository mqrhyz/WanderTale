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

function truthyFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1" || s === "yes" || s === "pro" || s === "premium";
  }
  return false;
}

/**
 * PRO active if either premium flag or tier says so, and expiry (when set) is still in the future.
 * Partial profile rows (only is_premium or only subscription_tier) must still unlock unlimited trips.
 */
function isProfilePro(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;

  const tier = String(profile.subscription_tier ?? "")
    .toLowerCase()
    .trim();
  const premiumFlag = truthyFlag(profile.is_premium);
  const tierPro =
    tier === "pro" ||
    tier === "premium" ||
    tier === "wander-pro" ||
    tier === "wander_pro" ||
    tier.includes("pro");
  if (!premiumFlag && !tierPro) return false;

  const expiresRaw = profile.subscription_expires_at;
  if (expiresRaw == null || expiresRaw === "") return true;
  const expires = new Date(String(expiresRaw)).getTime();
  if (!Number.isFinite(expires)) return true;
  return expires > Date.now();
}

function packageFor(id: string): UserPackage {
  const pkg = USER_SUBSCRIPTION_PACKAGES.find((p) => p.id === id);
  if (!pkg) throw new Error("subscription_package_not_found");
  return pkg;
}

function voucherApplies(voucher: VoucherRow, pkg: UserPackage): boolean {
  const meta = metadata(voucher);
  const applicability = String(meta.applicability ?? "hotel_places");
  const cycle = String(meta.billing_cycle ?? "both").toLowerCase().trim();
  const gift = giftDaysFromVoucher(voucher) > 0;

  // Pure gift vouchers (BANMOI = 3 months free) only redeem against the monthly package,
  // so yearly is never "free for 12 months" via a short gift code.
  if (gift && n(voucher.discount_percent) >= 100) {
    if (applicability === "hotel_places") return false;
    if (cycle === "yearly" || cycle === "monthly") {
      return cycle === pkg.billing_cycle;
    }
    // cycle both / unset → monthly only for full free gift
    return pkg.billing_cycle === "monthly";
  }

  if (gift) {
    // Partial gift still restricted by applicability + cycle.
    if (applicability === "user_subscription") return true;
    if (applicability !== "pro_plan" && applicability !== "user_subscription") return false;
    return cycle === "both" || cycle === "" || cycle === pkg.billing_cycle;
  }

  if (applicability === "user_subscription") return true;
  if (applicability !== "pro_plan") return false;
  return cycle === "both" || cycle === "" || cycle === pkg.billing_cycle;
}

/** Free Pro duration from gift voucher (gift_days / gift_months). */
function giftDaysFromVoucher(voucher: VoucherRow | null): number {
  if (!voucher) return 0;
  const meta = metadata(voucher);
  const days = n(meta.gift_days) || n(meta.free_days) || n(meta.duration_days);
  if (days > 0) return Math.round(days);
  const months = n(meta.gift_months) || n(meta.free_months) || n(meta.pro_months);
  if (months > 0) return Math.round(months * 30);
  return 0;
}

/**
 * Monetary discount for a Pro package.
 * Gift-duration vouchers with 100% (or gift_days) zero price only when applicable.
 * Percent/amount discounts still work on matching packages.
 */
function discountFor(voucher: VoucherRow | null, amount: number): number {
  if (!voucher) return 0;
  // Free gift (gift_days or 100%) → full discount when voucherApplies already passed.
  if (giftDaysFromVoucher(voucher) > 0 || n(voucher.discount_percent) >= 100) return amount;
  const byPercent = Math.round(amount * Math.max(0, n(voucher.discount_percent)) / 100);
  const byAmount = Math.round(Math.max(0, n(voucher.discount_amount)));
  return Math.min(amount, Math.max(byPercent, byAmount));
}

/** Effective Pro duration: gift days if present, else package duration. Never use package years for a 3-month gift. */
function effectiveDurationDays(pkg: UserPackage, voucher: VoucherRow | null): number {
  const gift = giftDaysFromVoucher(voucher);
  if (gift > 0) return gift;
  // 100% free without gift_days: grant the selected package length (paid free month/year).
  if (voucher && n(voucher.discount_percent) >= 100) return pkg.duration_days;
  return pkg.duration_days;
}

function mapVoucher(v: VoucherRow) {
  const meta = metadata(v);
  const giftDays = giftDaysFromVoucher(v);
  return {
    id: String(v.id),
    code: String(v.code ?? ""),
    title: String(v.title ?? "Voucher"),
    description: v.description ?? null,
    discount_percent: v.discount_percent != null ? Number(v.discount_percent) : null,
    discount_amount: v.discount_amount != null ? Number(v.discount_amount) : null,
    valid_from: v.valid_from ?? null,
    valid_until: v.valid_until ?? null,
    applicability: String(meta.applicability ?? "hotel_places"),
    billing_cycle: String(meta.billing_cycle ?? "both"),
    gift_days: giftDays > 0 ? giftDays : null,
    is_saved: true,
  };
}

async function fetchSubscriptionProfile(userId: string) {
  const sb = getSupabaseAdmin();
  const full = await sb
    .from("profiles")
    .select("id,is_premium,subscription_tier,subscription_expires_at,subscription_auto_renew")
    .eq("id", userId)
    .maybeSingle();
  if (full.error?.message?.includes("subscription_auto_renew")) {
    const fallback = await sb
      .from("profiles")
      .select("id,is_premium,subscription_tier,subscription_expires_at")
      .eq("id", userId)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    return {
      ...(fallback.data as Record<string, unknown>),
      subscription_auto_renew: true,
    };
  }
  if (full.error) throw full.error;
  return full.data as Record<string, unknown> | null;
}

export async function getUserSubscriptionOverview(userId: string) {
  const sb = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const [profile, { count }, { data: saved }] = await Promise.all([
    fetchSubscriptionProfile(userId),
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

  const active = isProfilePro(profile);
  // Heal profile flags so UI badges match real Pro status (including expired).
  if (profile?.id) {
    if (active) {
      const tier = String(profile.subscription_tier ?? "").toLowerCase().trim();
      const needsPremiumFlag = profile.is_premium !== true;
      const needsTier = tier !== "pro" && tier !== "premium";
      if (needsPremiumFlag || needsTier) {
        const healed = {
          is_premium: true,
          subscription_tier: needsTier ? "pro" : profile.subscription_tier,
        };
        await sb.from("profiles").update(healed).eq("id", profile.id);
        Object.assign(profile, healed);
      }
    } else {
      // Expired / free: clear stale is_premium so clients don't show a fake PRO badge.
      const stalePremium =
        profile.is_premium === true ||
        ["pro", "premium"].includes(String(profile.subscription_tier ?? "").toLowerCase().trim());
      if (stalePremium) {
        const healed = {
          is_premium: false,
          subscription_tier: "free",
        };
        await sb.from("profiles").update(healed).eq("id", profile.id);
        Object.assign(profile, healed);
      }
    }
  }
  const vouchers = (saved ?? [])
    .map((r) => (Array.isArray(r.vouchers) ? r.vouchers[0] : r.vouchers) as VoucherRow | null)
    .filter((v): v is VoucherRow => Boolean(v?.id))
    .filter((v) => String(v.valid_from ?? "0000-01-01") <= today && String(v.valid_until ?? "9999-12-31") >= today)
    .filter((v) => {
      const applicability = String(metadata(v).applicability ?? "hotel_places");
      // Include gift-duration vouchers even if applicability was mis-set.
      return (
        applicability === "user_subscription" ||
        applicability === "pro_plan" ||
        giftDaysFromVoucher(v) > 0
      );
    })
    .map(mapVoucher);

  return {
    is_premium: active,
    tier: active ? "pro" : "free",
    subscription_expires_at: active ? profile?.subscription_expires_at ?? null : null,
    auto_renew: profile?.subscription_auto_renew !== false,
    monthly_trip_count: count ?? 0,
    monthly_trip_limit: active ? null : FREE_MONTHLY_TRIP_LIMIT,
    packages: USER_SUBSCRIPTION_PACKAGES.map((p) => ({
      ...p,
      price_vnd: Number(p.price_vnd),
    })),
    vouchers,
  };
}

export async function assertCanCreateTrip(userId: string) {
  const overview = await getUserSubscriptionOverview(userId);
  // Null monthly_trip_limit means unlimited (PRO). Never cap PRO at Free's 5 trips.
  if (overview.is_premium || overview.monthly_trip_limit == null) {
    return overview;
  }
  const limit = overview.monthly_trip_limit ?? FREE_MONTHLY_TRIP_LIMIT;
  if (overview.monthly_trip_count >= limit) {
    const err = new Error("free_trip_limit_reached");
    (err as Error & { statusCode?: number; details?: unknown }).statusCode = 402;
    (err as Error & { statusCode?: number; details?: unknown }).details = {
      ...overview,
      reason: "free_monthly_cap",
    };
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
  const giftDays = n(meta.gift_days);
  const durationDays =
    n(meta.duration_days) > 0 ? Math.round(n(meta.duration_days)) : pkg.duration_days;

  // Stack remaining Pro time when already premium, instead of resetting from now.
  const profile = await fetchSubscriptionProfile(tx.user_id);
  const now = Date.now();
  let startsMs = now;
  const existingExpires = profile?.subscription_expires_at
    ? new Date(String(profile.subscription_expires_at)).getTime()
    : 0;
  if (isProfilePro(profile) && Number.isFinite(existingExpires) && existingExpires > now) {
    startsMs = existingExpires;
  }
  const ends = new Date(startsMs + durationDays * 86400000);

  await sb
    .from("profiles")
    .update({
      is_premium: true,
      subscription_tier: "pro",
      subscription_expires_at: ends.toISOString(),
      // Free gift periods should not auto-charge after expiry.
      subscription_auto_renew: giftDays > 0 ? false : true,
    })
    .eq("id", tx.user_id);
  await sb.from("platform_transactions").update({ status: "captured" }).eq("id", txId);
  await logSystemEvent({
    level: "success",
    title: "User subscription activated",
    source: "payment",
    metadata: {
      user_id: tx.user_id,
      package_id: pkg.id,
      transaction_id: txId,
      duration_days: durationDays,
      gift_days: giftDays > 0 ? giftDays : null,
    },
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
    // Enforce voucher validity window at purchase time.
    const today = new Date().toISOString().slice(0, 10);
    const from = String(voucher.valid_from ?? "0000-01-01");
    const until = String(voucher.valid_until ?? "9999-12-31");
    if (from > today || until < today) throw new Error("voucher_expired");
  }

  const originalAmount = Math.round(pkg.price_vnd);
  const giftDays = giftDaysFromVoucher(voucher);
  const discountAmount = discountFor(voucher, originalAmount);
  const amount = Math.max(0, originalAmount - discountAmount);
  const durationDays = effectiveDurationDays(pkg, voucher);
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
      description: giftDays > 0 ? `Nhận ${pkg.name} (quà ${giftDays} ngày)` : `Mua ${pkg.name}`,
      metadata: {
        package_id: pkg.id,
        billing_cycle: pkg.billing_cycle,
        duration_days: durationDays,
        gift_days: giftDays > 0 ? giftDays : null,
        order_code: orderCode,
        voucher_id: voucher?.id ?? null,
        voucher_code: voucher?.code ?? null,
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
      duration_days: durationDays,
      gift_days: giftDays > 0 ? giftDays : null,
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
    duration_days: durationDays,
    gift_days: giftDays > 0 ? giftDays : null,
    transfer_content: link.description ?? null,
    order_code: orderCode,
    transaction_id: tx.id,
  };
}

export async function updateUserSubscriptionAutoRenew(userId: string, autoRenew: boolean) {
  const { error } = await getSupabaseAdmin()
    .from("profiles")
    .update({ subscription_auto_renew: autoRenew })
    .eq("id", userId);
  if (error) throw error;
  await logSystemEvent({
    level: "info",
    title: autoRenew ? "User enabled subscription auto-renew" : "User disabled subscription auto-renew",
    source: "user_subscription",
    metadata: { user_id: userId, auto_renew: autoRenew },
  });
  return { auto_renew: autoRenew };
}
