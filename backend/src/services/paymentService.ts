import { env } from "../lib/env.js";

/**
 * PaymentService — payment gateway abstraction.
 *
 * ⚠️ PAYMENT SIMULATION SAFE MODE
 * When `PAYMENT_SIMULATION_MODE=true` (default), `capturePayment` does NOT call
 * any real PSP — it deterministically simulates a successful capture and returns
 * a synthetic provider reference. The DB transaction/ledger records created by
 * the caller are REAL and production-shaped, so wiring a real gateway later only
 * requires replacing the body of `capturePayment` (and `processPayout`) — the
 * domain model, statuses and audit trail stay the same.
 *
 * To integrate a real gateway (VNPay/Momo/Stripe...):
 *   1. Set PAYMENT_SIMULATION_MODE=false.
 *   2. Implement the `!simulation` branch with the real charge call.
 *   3. Keep returning { provider_ref, status, gateway_fee_amount }.
 */

export type CaptureResult = {
  provider_ref: string;
  status: "captured" | "failed";
  gateway_fee_amount: number;
  simulated: boolean;
};

export type PayoutDispatchResult = {
  provider_ref: string;
  status: "paid" | "processing" | "failed";
  simulated: boolean;
};

export function isPaymentSimulation(): boolean {
  return env.PAYMENT_SIMULATION_MODE;
}

/** Capture a user payment to the PLATFORM account (never directly to a business). */
export async function capturePayment(params: {
  bookingId: string;
  amount: number;
  currency: string;
}): Promise<CaptureResult> {
  if (env.PAYMENT_SIMULATION_MODE) {
    // SAFE MODE: no external call. Deterministic synthetic reference.
    return {
      provider_ref: `sim_${params.bookingId}_${Date.now()}`,
      status: "captured",
      gateway_fee_amount: 0,
      simulated: true,
    };
  }
  // TODO(payment-gateway): call real PSP here, map response to CaptureResult.
  throw new Error("payment_gateway_not_configured");
}

/** Dispatch a settlement to a business bank/e-wallet account. */
export async function dispatchPayout(params: {
  payoutId: string;
  amount: number;
  currency: string;
  method?: string | null;
}): Promise<PayoutDispatchResult> {
  if (env.PAYOUT_SIMULATION_MODE) {
    return {
      provider_ref: `simpayout_${params.payoutId}_${Date.now()}`,
      status: "paid",
      simulated: true,
    };
  }
  // TODO(payout-provider): call real disbursement API here (PayOS không hỗ trợ chi trả).
  throw new Error("payout_provider_not_configured");
}
