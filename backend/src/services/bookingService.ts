import { getSupabaseAdmin } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { logSystemEvent } from "../lib/auditLog.js";
import { capturePayment } from "./paymentService.js";
import { createPaymentLink, isPayosConfigured } from "../lib/payos.js";

/**
 * Booking / payment / payout domain.
 *
 * Money flow (marketplace, never user -> business directly):
 *   user pays PLATFORM (booking_payment captured)
 *     -> platform keeps commission (commission tx, settled)
 *     -> net amount scheduled for payout to business (payout_records)
 *     -> payout processed separately (payoutService)
 *
 * Every state change writes a real ledger row in `platform_transactions`
 * and an audit row in `system_logs`. Refunds create NEW records (never mutate
 * historical ledger rows).
 */

function n(v: unknown): number {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function round0(v: number): number {
  return Math.round(v);
}

export type CreateBookingInput = {
  business_id: string;
  total_amount: number;
  type?: string;
  trip_id?: string | null;
  location_id?: string | null;
  currency?: string;
  provider?: string | null;
  payment_mode?: "prepaid" | "pay_later";
  metadata?: Record<string, unknown>;
};

export async function createBooking(userId: string, input: CreateBookingInput) {
  const total = n(input.total_amount);
  if (!input.business_id) throw new Error("business_id_required");
  if (total <= 0) throw new Error("total_amount_invalid");

  const { data: business, error: bizErr } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,status")
    .eq("id", input.business_id)
    .maybeSingle();
  if (bizErr) throw bizErr;
  if (!business) throw new Error("business_not_found");
  if (business.status !== "active") throw new Error("business_not_active");

  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .insert({
      user_id: userId,
      business_id: input.business_id,
      trip_id: input.trip_id ?? null,
      location_id: input.location_id ?? null,
      type: input.type ?? "other",
      provider: input.provider ?? null,
      status: input.payment_mode === "pay_later" ? "confirmed" : "pending_payment",
      payment_mode: input.payment_mode ?? "prepaid",
      currency: input.currency ?? "VND",
      total_amount: total,
      gross_amount: total,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;

  await logSystemEvent({
    title: "Booking created",
    source: "booking",
    detail: `Booking ${data.id} — ${total} ${data.currency}`,
    metadata: { booking_id: data.id, user_id: userId, business_id: input.business_id, status: data.status },
  });
  return data;
}

export async function getBooking(bookingId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("booking_not_found");
  return data;
}

function commissionRateFor(business: { commission_rate?: number | null } | null): number {
  const rate = business?.commission_rate;
  return typeof rate === "number" && Number.isFinite(rate) ? rate : env.DEFAULT_PLATFORM_COMMISSION_RATE;
}

/**
 * Build the post-capture ledger: commission (platform revenue) + payout_record
 * (net owed to business) + payout ledger row, and mark the booking paid.
 * Shared by simulation capture and the PayOS webhook.
 */
async function settleCapturedPayment(params: {
  booking: { id: string; business_id?: string | null; currency?: string | null };
  paymentTxId: string;
  total: number;
  commission: number;
  fee: number;
  currency: string;
  rate: number;
}) {
  const { booking, paymentTxId, total, commission, fee, currency, rate } = params;
  const net = Math.max(0, total - commission - fee);

  // platform commission revenue (settled)
  await getSupabaseAdmin().from("platform_transactions").insert({
    kind: "commission",
    source: "booking",
    business_id: booking.business_id,
    booking_id: booking.id,
    gross_amount: commission,
    commission_amount: commission,
    net_amount: commission,
    currency,
    status: "settled",
    description: `Hoa hồng platform ${rate}%`,
    metadata: { booking_id: booking.id, payment_tx: paymentTxId },
  });

  const payoutStatus = env.PAYOUT_AUTO_PROCESS ? "scheduled" : "pending";
  const { data: payout } = await getSupabaseAdmin()
    .from("payout_records")
    .insert({
      business_id: booking.business_id,
      payment_transaction_id: paymentTxId,
      amount: net,
      currency,
      status: payoutStatus,
      metadata: { booking_id: booking.id, commission, gateway_fee: fee },
    })
    .select("*")
    .single();

  await getSupabaseAdmin().from("platform_transactions").insert({
    kind: "payout",
    source: "booking",
    business_id: booking.business_id,
    booking_id: booking.id,
    gross_amount: net,
    net_amount: net,
    currency,
    status: "payout_pending",
    payout_id: payout?.id ?? null,
    description: "Net payout chờ chi trả cho business",
    metadata: { booking_id: booking.id, payout_id: payout?.id },
  });

  await getSupabaseAdmin()
    .from("bookings")
    .update({ status: "paid", gross_amount: total, commission_amount: commission, net_amount: net })
    .eq("id", booking.id);

  await logSystemEvent({
    level: "success",
    title: "Booking paid",
    source: "payment",
    detail: `gross=${total} commission=${commission} net=${net} ${currency}`,
    metadata: { booking_id: booking.id, payment_tx: paymentTxId, payout_id: payout?.id },
  });

  return { payout, commission, net };
}

/**
 * Initiate payment for a booking.
 * - Simulation mode: capture immediately and settle the ledger (status -> paid).
 * - PayOS mode: create a payment link, keep a pending booking_payment row, and
 *   return the checkout URL. Settlement happens on the PayOS webhook.
 */
export async function payBooking(bookingId: string, actorUserId: string) {
  const booking = await getBooking(bookingId);
  if (!["draft", "pending", "pending_payment"].includes(booking.status)) {
    throw new Error(`booking_not_payable:${booking.status}`);
  }
  const total = n(booking.total_amount ?? booking.gross_amount);
  if (total <= 0) throw new Error("booking_amount_invalid");
  const currency: string = booking.currency ?? "VND";

  const { data: business } = await getSupabaseAdmin()
    .from("businesses")
    .select("id,commission_rate,status")
    .eq("id", booking.business_id)
    .maybeSingle();
  const rate = commissionRateFor(business);
  const commission = round0((total * rate) / 100);

  // --- PayOS mode (async) ---
  if (!env.PAYMENT_SIMULATION_MODE && isPayosConfigured()) {
    const orderCode = Number(`${Date.now()}`.slice(-12)); // numeric, unique enough
    const { data: paymentTx, error: payErr } = await getSupabaseAdmin()
      .from("platform_transactions")
      .insert({
        kind: "booking_payment",
        source: "booking",
        user_id: actorUserId,
        business_id: booking.business_id,
        booking_id: bookingId,
        gross_amount: total,
        commission_amount: commission,
        currency,
        status: "pending",
        description: "Khởi tạo thanh toán PayOS",
        metadata: { order_code: orderCode, commission_rate: rate, provider: "payos" },
      })
      .select("*")
      .single();
    if (payErr) throw payErr;

    try {
      const link = await createPaymentLink({
        orderCode,
        amount: total,
        description: `WanderTale ${String(bookingId).slice(0, 8)}`,
      });
      await getSupabaseAdmin()
        .from("platform_transactions")
        .update({ provider_ref: link.paymentLinkId, status: "authorized" })
        .eq("id", paymentTx.id);
      await getSupabaseAdmin().from("bookings").update({ status: "pending_payment" }).eq("id", bookingId);

      await logSystemEvent({
        title: "PayOS payment link created",
        source: "payment",
        detail: `order ${orderCode} — ${total} ${currency}`,
        metadata: { booking_id: bookingId, order_code: orderCode, payment_link_id: link.paymentLinkId },
      });

      return {
        booking_id: bookingId,
        status: "pending_payment",
        provider: "payos",
        order_code: orderCode,
        checkout_url: link.checkoutUrl,
        qr_code: link.qrCode ?? null,
        account_number: link.accountNumber ?? null,
        account_name: link.accountName ?? null,
        bin: link.bin ?? null,
        amount: link.amount ?? total,
        transfer_content: link.description ?? null,
        currency,
      };
    } catch (e) {
      await getSupabaseAdmin().from("platform_transactions").update({ status: "failed" }).eq("id", paymentTx.id);
      await logSystemEvent({
        level: "error",
        title: "PayOS payment link failed",
        source: "payment",
        metadata: { booking_id: bookingId, order_code: orderCode, error: e instanceof Error ? e.message : String(e) },
      });
      throw new Error("payos_create_failed");
    }
  }

  // --- Simulation mode (synchronous capture) ---
  const capture = await capturePayment({ bookingId, amount: total, currency });
  if (capture.status !== "captured") {
    await getSupabaseAdmin().from("platform_transactions").insert({
      kind: "booking_payment",
      source: "booking",
      user_id: actorUserId,
      business_id: booking.business_id,
      booking_id: bookingId,
      gross_amount: total,
      currency,
      status: "failed",
      provider_ref: capture.provider_ref,
      description: "Thanh toán booking thất bại",
    });
    throw new Error("payment_capture_failed");
  }
  const fee = n(capture.gateway_fee_amount);
  const net = Math.max(0, total - commission - fee);
  const { data: paymentTx, error: payErr } = await getSupabaseAdmin()
    .from("platform_transactions")
    .insert({
      kind: "booking_payment",
      source: "booking",
      user_id: actorUserId,
      business_id: booking.business_id,
      booking_id: bookingId,
      gross_amount: total,
      commission_amount: commission,
      gateway_fee_amount: fee,
      net_amount: net,
      currency,
      status: "captured",
      provider_ref: capture.provider_ref,
      description: "Thanh toán booking (user → platform, simulation)",
      metadata: { simulated: capture.simulated, commission_rate: rate },
    })
    .select("*")
    .single();
  if (payErr) throw payErr;

  const settled = await settleCapturedPayment({
    booking,
    paymentTxId: paymentTx.id,
    total,
    commission,
    fee,
    currency,
    rate,
  });

  return { booking_id: bookingId, status: "paid", payment_transaction: paymentTx, ...settled };
}

/**
 * Finalize a PayOS payment from the webhook. Idempotent: safe to call twice.
 * Returns null if no matching pending payment is found.
 */
export async function finalizeBookingPaymentByOrderCode(orderCode: number, reference?: string) {
  const { data: tx } = await getSupabaseAdmin()
    .from("platform_transactions")
    .select("*")
    .eq("kind", "booking_payment")
    .contains("metadata", { order_code: orderCode })
    .maybeSingle();
  if (!tx) return null;
  if (tx.status === "captured") return { already: true, booking_id: tx.booking_id };

  const booking = await getBooking(tx.booking_id as string);
  const total = n(booking.total_amount ?? booking.gross_amount ?? tx.gross_amount);
  const currency: string = booking.currency ?? tx.currency ?? "VND";
  const rate = n((tx.metadata as Record<string, unknown> | null)?.commission_rate) || env.DEFAULT_PLATFORM_COMMISSION_RATE;
  const commission = n(tx.commission_amount) || round0((total * rate) / 100);

  await getSupabaseAdmin()
    .from("platform_transactions")
    .update({ status: "captured", provider_ref: reference ?? tx.provider_ref })
    .eq("id", tx.id);

  const settled = await settleCapturedPayment({
    booking,
    paymentTxId: tx.id as string,
    total,
    commission,
    fee: 0,
    currency,
    rate,
  });

  await logSystemEvent({
    level: "success",
    title: "PayOS payment confirmed",
    source: "payment",
    metadata: { booking_id: booking.id, order_code: orderCode, reference },
  });

  return { already: false, booking_id: booking.id, ...settled };
}

export async function confirmBooking(bookingId: string) {
  const booking = await getBooking(bookingId);
  if (booking.status !== "paid") throw new Error(`booking_not_confirmable:${booking.status}`);
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error) throw error;
  await logSystemEvent({
    level: "success",
    title: "Booking confirmed",
    source: "booking",
    metadata: { booking_id: bookingId },
  });
  return data;
}

export async function cancelBooking(bookingId: string, actorUserId: string) {
  const booking = await getBooking(bookingId);
  if (["cancelled", "refunded"].includes(booking.status)) {
    throw new Error(`booking_already_${booking.status}`);
  }
  const wasPaid = ["paid", "confirmed"].includes(booking.status);
  const { data, error } = await getSupabaseAdmin()
    .from("bookings")
    .update({ status: wasPaid ? "refunded" : "cancelled" })
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error) throw error;

  if (wasPaid) {
    // Refund creates NEW ledger rows; historical rows are never mutated.
    const total = n(booking.total_amount ?? booking.gross_amount);
    await getSupabaseAdmin().from("platform_transactions").insert({
      kind: "refund",
      source: "booking",
      user_id: actorUserId,
      business_id: booking.business_id,
      booking_id: bookingId,
      gross_amount: total,
      net_amount: -total,
      currency: booking.currency ?? "VND",
      status: "refunded",
      description: "Hoàn tiền booking (đảo ngược doanh thu)",
      metadata: { booking_id: bookingId },
    });
    // Cancel any not-yet-paid payout for this booking's payment.
    await getSupabaseAdmin()
      .from("payout_records")
      .update({ status: "cancelled" })
      .eq("business_id", booking.business_id)
      .in("status", ["pending", "scheduled"])
      .contains("metadata", { booking_id: bookingId });
  }

  await logSystemEvent({
    level: "warning",
    title: wasPaid ? "Booking refunded" : "Booking cancelled",
    source: "booking",
    metadata: { booking_id: bookingId, refunded: wasPaid },
  });
  return data;
}

/** Danh sách booking của user (kèm tên địa điểm + business) cho màn "Đặt chỗ & Thanh toán". */
export async function listUserBookings(userId: string, limit = 50) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("bookings")
    .select("id,business_id,trip_id,location_id,type,status,payment_mode,currency,total_amount,gross_amount,created_at,confirmed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const locationIds = Array.from(new Set(rows.map((r) => r.location_id).filter(Boolean))) as string[];
  const businessIds = Array.from(new Set(rows.map((r) => r.business_id).filter(Boolean))) as string[];

  const [{ data: locs }, { data: bizs }] = await Promise.all([
    locationIds.length
      ? sb.from("business_locations").select("id,name").in("id", locationIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    businessIds.length
      ? sb.from("businesses").select("id,name").in("id", businessIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);
  const locName = new Map((locs ?? []).map((l) => [l.id, l.name]));
  const bizName = new Map((bizs ?? []).map((b) => [b.id, b.name]));

  return rows.map((r) => ({
    ...r,
    location_name: r.location_id ? locName.get(r.location_id) ?? null : null,
    business_name: r.business_id ? bizName.get(r.business_id) ?? null : null,
    code: r.id.slice(0, 8).toUpperCase(),
  }));
}
