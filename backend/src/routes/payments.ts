import type { FastifyInstance } from "fastify";
import { verifyWebhook } from "../lib/payos.js";
import { getSupabaseAdmin } from "../lib/auth.js";
import { finalizeBookingPaymentByOrderCode } from "../services/bookingService.js";
import { logSystemEvent } from "../lib/auditLog.js";

/**
 * Finalize ad package purchase when PayOS confirms payment.
 * Finds the pending ad_purchase transaction by order_code, marks captured,
 * and activates the business_ad_order.
 */
async function finalizeAdPackageByOrderCode(orderCode: number, reference?: string) {
  const { data: tx } = await getSupabaseAdmin()
    .from("platform_transactions")
    .select("*")
    .eq("kind", "ad_purchase")
    .contains("metadata", { order_code: orderCode })
    .maybeSingle();
  if (!tx) return null;
  if (tx.status === "captured") return { already: true };

  await getSupabaseAdmin()
    .from("platform_transactions")
    .update({ status: "captured", provider_ref: reference ?? tx.provider_ref })
    .eq("id", tx.id);

  // Activate the ad order linked to this transaction.
  await getSupabaseAdmin()
    .from("business_ad_orders")
    .update({ status: "active" })
    .eq("payment_transaction_id", tx.id);

  await logSystemEvent({
    level: "success",
    title: "Ad package payment confirmed",
    source: "advertising",
    metadata: { order_code: orderCode, reference, transaction_id: tx.id },
  });
  return { already: false };
}

/**
 * PayOS webhook — called by PayOS (server-to-server), NOT authenticated by our
 * Bearer scheme. Authenticity is verified via the checksum signature.
 */
export async function paymentsRoutes(app: FastifyInstance) {
  app.post<{ Body: { code?: string; success?: boolean; data?: Record<string, unknown>; signature?: string } }>(
    "/payments/payos/webhook",
    async (req, reply) => {
      const body = req.body ?? {};
      const data = verifyWebhook(body);
      if (!data) {
        await logSystemEvent({
          level: "warning",
          title: "PayOS webhook rejected/test",
          source: "payment",
          metadata: { code: body.code, has_signature: Boolean(body.signature) },
        });
        return reply.code(200).send({ success: true });
      }
      if (data.code === "00" || body.success === true) {
        try {
          // Try booking first, then ad package.
          const bookingResult = await finalizeBookingPaymentByOrderCode(data.orderCode, data.reference);
          if (!bookingResult) {
            await finalizeAdPackageByOrderCode(data.orderCode, data.reference);
          }
        } catch (e) {
          await logSystemEvent({
            level: "error",
            title: "PayOS webhook finalize failed",
            source: "payment",
            metadata: { order_code: data.orderCode, error: e instanceof Error ? e.message : String(e) },
          });
        }
      }
      return reply.code(200).send({ success: true });
    },
  );
}
