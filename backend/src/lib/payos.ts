import { createHmac } from "node:crypto";
import { env } from "./env.js";

/**
 * PayOS client (v2 payment-requests).
 * Docs: https://payos.vn — signature is HMAC-SHA256 over alphabetically-sorted
 * `key=value&...` of the relevant fields, signed with the checksum key.
 */

export function isPayosConfigured(): boolean {
  return (
    env.PAYOS_CLIENT_ID.trim().length > 0 &&
    env.PAYOS_API_KEY.trim().length > 0 &&
    env.PAYOS_CHECKSUM_KEY.trim().length > 0
  );
}

function hmac(data: string): string {
  return createHmac("sha256", env.PAYOS_CHECKSUM_KEY).update(data).digest("hex");
}

/** Build the create-payment-link signature: amount,cancelUrl,description,orderCode,returnUrl. */
function createSignature(p: {
  amount: number;
  cancelUrl: string;
  description: string;
  orderCode: number;
  returnUrl: string;
}): string {
  const raw =
    `amount=${p.amount}` +
    `&cancelUrl=${p.cancelUrl}` +
    `&description=${p.description}` +
    `&orderCode=${p.orderCode}` +
    `&returnUrl=${p.returnUrl}`;
  return hmac(raw);
}

/** Sign an arbitrary data object (webhook verification): sort keys alphabetically. */
export function signObject(data: Record<string, unknown>): string {
  const keys = Object.keys(data).sort();
  const raw = keys
    .map((k) => {
      const v = data[k];
      const value = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `${k}=${value}`;
    })
    .join("&");
  return hmac(raw);
}

export type PayosPaymentLink = {
  checkoutUrl: string;
  paymentLinkId: string;
  qrCode?: string;
  orderCode: number;
  amount?: number;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  description?: string;
  currency?: string;
};

export async function createPaymentLink(params: {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<PayosPaymentLink> {
  if (!isPayosConfigured()) throw new Error("payos_not_configured");
  const returnUrl = params.returnUrl ?? env.PAYOS_RETURN_URL;
  const cancelUrl = params.cancelUrl ?? env.PAYOS_CANCEL_URL;
  // PayOS giới hạn description tối đa 25 ký tự.
  const description = params.description.slice(0, 25);
  const amount = Math.round(params.amount);

  const signature = createSignature({
    amount,
    cancelUrl,
    description,
    orderCode: params.orderCode,
    returnUrl,
  });

  const res = await fetch(`${env.PAYOS_API_BASE}/v2/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": env.PAYOS_CLIENT_ID,
      "x-api-key": env.PAYOS_API_KEY,
    },
    body: JSON.stringify({
      orderCode: params.orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
      signature,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as {
    code?: string;
    desc?: string;
    data?: {
      checkoutUrl?: string;
      paymentLinkId?: string;
      qrCode?: string;
      orderCode?: number;
      amount?: number;
      accountNumber?: string;
      accountName?: string;
      bin?: string;
      description?: string;
      currency?: string;
    };
  };
  if (json.code !== "00" || !json.data?.checkoutUrl) {
    throw new Error(`payos_create_failed: ${json.desc ?? json.code ?? "unknown"}`);
  }
  const d = json.data;
  return {
    checkoutUrl: d.checkoutUrl!,
    paymentLinkId: d.paymentLinkId ?? "",
    qrCode: d.qrCode,
    orderCode: d.orderCode ?? params.orderCode,
    amount: d.amount ?? amount,
    accountNumber: d.accountNumber,
    accountName: d.accountName,
    bin: d.bin,
    description: d.description ?? description,
    currency: d.currency ?? "VND",
  };
}

export type PayosWebhookData = {
  orderCode: number;
  amount: number;
  description?: string;
  reference?: string;
  paymentLinkId?: string;
  code?: string;
  desc?: string;
};

/** Verify a PayOS webhook body. Returns the data only if the signature matches. */
export function verifyWebhook(body: {
  code?: string;
  success?: boolean;
  data?: Record<string, unknown>;
  signature?: string;
}): PayosWebhookData | null {
  if (!body?.data || !body.signature) return null;
  const expected = signObject(body.data);
  if (expected !== body.signature) return null;
  const d = body.data;
  return {
    orderCode: Number(d.orderCode),
    amount: Number(d.amount),
    description: typeof d.description === "string" ? d.description : undefined,
    reference: typeof d.reference === "string" ? d.reference : undefined,
    paymentLinkId: typeof d.paymentLinkId === "string" ? d.paymentLinkId : undefined,
    code: typeof d.code === "string" ? d.code : undefined,
    desc: typeof d.desc === "string" ? d.desc : undefined,
  };
}
