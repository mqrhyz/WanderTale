import { apiFetch } from "@/lib/api";

export type HotelAgentUserProfile = {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
};

export type HotelAgentOffer = {
  site: string;
  hotelName: string;
  roomName?: string;
  priceVnd: number;
  currency?: string;
  rating?: number;
  location?: string;
  bookingUrl: string;
  scrapedAt?: string;
  priceNote?: string;
  nights?: number;
};

export type HotelAgentInterrupt = {
  kind?: string;
  title?: string;
  summary?: string;
  data?: {
    recommended?: HotelAgentOffer;
    alternatives?: HotelAgentOffer[];
    offers?: HotelAgentOffer[];
    comparison?: {
      recommended?: HotelAgentOffer;
      alternatives?: HotelAgentOffer[];
    };
    profile?: HotelAgentUserProfile;
    offer?: HotelAgentOffer;
    [key: string]: unknown;
  };
};

export type HotelAgentFormFill = {
  site: string;
  success: boolean;
  stoppedBeforePayment: boolean;
  paymentUrl?: string;
  qrHint?: string;
  screenshotPath?: string;
  message: string;
  checkoutReached?: boolean;
  checkoutTotalVnd?: number;
  searchPriceVnd?: number;
  fieldsFilled?: number;
  startedAt?: string;
  finishedAt?: string;
};

export type SiteScanLog = {
  site: string;
  searchUrl: string;
  startedAt: string;
  finishedAt: string;
  offerCount: number;
  status: "ok" | "empty" | "error";
  error?: string;
};

export type ActivityLogEntry = {
  id: string;
  phase: string;
  label: string;
  at: string;
  detail?: string;
};

export type HotelAgentMessage = {
  id?: string;
  type?: string;
  content?: string | unknown;
};

export type HotelAgentRunResult = {
  threadId: string;
  interrupted: boolean;
  interrupt?: HotelAgentInterrupt;
  nextNodes: string[];
  state: {
    step?: string;
    searchPlanSummary?: string | null;
    rawOffers?: unknown[];
    comparison?: {
      recommended?: { hotelName: string; priceVnd: number; site: string };
      reasoning?: string;
      alternatives?: { hotelName: string; priceVnd: number; site: string }[];
    } | null;
    selectedOffer?: { hotelName: string; priceVnd: number; site: string } | null;
    formFill?: HotelAgentFormFill | null;
    siteScans?: SiteScanLog[];
    activityLog?: ActivityLogEntry[];
    messages?: HotelAgentMessage[];
    error?: string | null;
  };
};

export function formatVietnamDateTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

const HOTEL_AGENT_FETCH_MS = 300_000;

export async function runHotelAgentApi(
  token: string,
  body: { message: string; threadId?: string; userProfile?: HotelAgentUserProfile }
): Promise<HotelAgentRunResult> {
  return apiFetch("/api/hotel-agent/run", token, {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(HOTEL_AGENT_FETCH_MS),
  }) as Promise<HotelAgentRunResult>;
}

export async function resumeHotelAgentApi(
  token: string,
  body: { threadId: string; resume: unknown; userProfile?: HotelAgentUserProfile }
): Promise<HotelAgentRunResult> {
  return apiFetch("/api/hotel-agent/resume", token, {
    method: "POST",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(HOTEL_AGENT_FETCH_MS),
  }) as Promise<HotelAgentRunResult>;
}

/** Extract plain text from LangChain message objects in API state */
export function lastAgentText(messages?: HotelAgentMessage[]): string | null {
  if (!messages?.length) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as Record<string, unknown>;
    const id = m.id as string[] | undefined;
    const type =
      m.type ??
      (typeof id?.[id.length - 1] === "string" ? id[id.length - 1] : undefined) ??
      (m as { _getType?: () => string })._getType?.();
    const isAi =
      type === "ai" ||
      type === "AIMessage" ||
      (Array.isArray(id) && id.some((x) => String(x).includes("AIMessage")));
    if (isAi) {
      const kwargs = m.kwargs as { content?: unknown } | undefined;
      const c = m.content ?? kwargs?.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        const text = c
          .map((part) =>
            typeof part === "object" && part && "text" in part ? String((part as { text: string }).text) : ""
          )
          .join("");
        if (text) return text;
      }
      return c != null ? JSON.stringify(c) : null;
    }
  }
  return null;
}

export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}
