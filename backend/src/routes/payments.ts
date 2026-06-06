import type { FastifyInstance } from "fastify";
import { verifyWebhook } from "../lib/payos.js";
import { finalizeBookingPaymentByOrderCode } from "../services/bookingService.js";
import { logSystemEvent } from "../lib/auditLog.js";

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
        // Invalid signature OR PayOS registration test ping (empty data).
        await logSystemEvent({
          level: "warning",
          title: "PayOS webhook rejected/test",
          source: "payment",
          metadata: { code: body.code, has_signature: Boolean(body.signature) },
        });
        // Return 200 so PayOS webhook registration test passes; do not process.
        return reply.code(200).send({ success: true });
      }
      // Only finalize on a successful payment ("00").
      if (data.code === "00" || body.success === true) {
        try {
          await finalizeBookingPaymentByOrderCode(data.orderCode, data.reference);
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
