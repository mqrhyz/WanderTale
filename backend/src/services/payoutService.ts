import { getSupabaseAdmin } from "../lib/auth.js";
import { logSystemEvent } from "../lib/auditLog.js";
import { dispatchPayout } from "./paymentService.js";

/** Payout settlement: platform -> business. */

export async function listBusinessPayouts(businessId: string, limit = 50) {
  const { data } = await getSupabaseAdmin()
    .from("payout_records")
    .select("id,business_id,payment_transaction_id,amount,currency,status,payout_method,provider_ref,paid_at,created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listAdminPayouts(limit = 100, status?: string) {
  let q = getSupabaseAdmin()
    .from("payout_records")
    .select("id,business_id,payment_transaction_id,amount,currency,status,payout_method,provider_ref,paid_at,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Admin/system processes a pending/scheduled payout to a business. */
export async function processPayout(payoutId: string) {
  const { data: payout, error } = await getSupabaseAdmin()
    .from("payout_records")
    .select("*")
    .eq("id", payoutId)
    .maybeSingle();
  if (error) throw error;
  if (!payout) throw new Error("payout_not_found");
  if (!["pending", "scheduled", "processing", "failed"].includes(payout.status)) {
    throw new Error(`payout_not_processable:${payout.status}`);
  }

  await getSupabaseAdmin().from("payout_records").update({ status: "processing" }).eq("id", payoutId);

  const result = await dispatchPayout({
    payoutId,
    amount: Number(payout.amount),
    currency: payout.currency,
    method: payout.payout_method,
  });

  const paid = result.status === "paid";
  const { data: updated } = await getSupabaseAdmin()
    .from("payout_records")
    .update({
      status: paid ? "paid" : "failed",
      provider_ref: result.provider_ref,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq("id", payoutId)
    .select("*")
    .single();

  // Settle the matching payout ledger row(s).
  await getSupabaseAdmin()
    .from("platform_transactions")
    .update({ status: paid ? "paid_out" : "failed", provider_ref: result.provider_ref })
    .eq("payout_id", payoutId)
    .eq("kind", "payout");

  await logSystemEvent({
    level: paid ? "success" : "error",
    title: paid ? "Payout paid" : "Payout failed",
    source: "payout",
    detail: `${payout.amount} ${payout.currency} → business ${payout.business_id}`,
    metadata: { payout_id: payoutId, provider_ref: result.provider_ref, simulated: result.simulated },
  });

  return updated;
}
