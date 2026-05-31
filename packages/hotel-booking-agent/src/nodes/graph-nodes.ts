import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";
import type { HotelOffer } from "../state.js";
import type { HotelAgentState } from "../state.js";
import { createHotelChatModel } from "../config/llm-pool.js";
import {
  HOTEL_AGENT_SYSTEM_PROMPT,
  PARSE_CRITERIA_PROMPT,
} from "../prompts/system.js";
import { searchHotel } from "../tools/search-hotel.js";
import { comparePrices } from "../tools/compare-prices.js";
import { fillForm } from "../tools/fill-form.js";
import { formatVietnamDateTime } from "../lib/datetime.js";
import { logActivity } from "../lib/activity.js";
import { getActiveScanSites } from "../config/env.js";
import { SITE_ADAPTERS } from "../sites/registry.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const parsedCriteriaSchema = z.object({
  city: z.string().trim().min(1).max(120).catch("Đà Lạt"),
  checkIn: dateSchema.nullish(),
  checkOut: dateSchema.nullish(),
  adults: z.coerce.number().int().min(1).max(20).catch(2),
  children: z.coerce.number().int().min(0).max(10).catch(0),
  rooms: z.coerce.number().int().min(1).max(10).catch(1),
  budgetVnd: z.coerce.number().positive().optional().nullable(),
  hotelNameHint: z.string().trim().min(1).max(160).optional().nullable(),
  userProfile: z
    .object({
      fullName: z.string().trim().min(1).nullable(),
      email: z.string().email().nullable(),
      phone: z.string().trim().min(8).nullable(),
      specialRequests: z.string().trim().optional().nullable(),
    })
    .nullable()
    .optional(),
});

function isDateRangeValid(checkIn: string, checkOut: string): boolean {
  const start = new Date(`${checkIn}T12:00:00.000Z`);
  const end = new Date(`${checkOut}T12:00:00.000Z`);
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start < end;
}

/** Parse user message → search criteria + profile */
export async function parseRequestNode(
  state: HotelAgentState
): Promise<Partial<HotelAgentState>> {
  const lastHuman = [...state.messages].reverse().find((m) => m._getType() === "human");
  const text = lastHuman ? String(lastHuman.content) : "";

  const model = createHotelChatModel(0.1);
  const res = await model.invoke([
    new SystemMessage(HOTEL_AGENT_SYSTEM_PROMPT),
    new HumanMessage(`${PARSE_CRITERIA_PROMPT}\n\nTin nhắn user:\n${text}`),
  ]);

  const raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      step: "parse_failed",
      error: "Không trích xuất được tiêu chí. Vui lòng gửi: thành phố, ngày nhận/trả phòng, số khách.",
      messages: [new AIMessage("Mình cần thêm thông tin: thành phố, check-in, check-out, số người và ngân sách (VND).")],
    };
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(jsonMatch[0]) as unknown;
  } catch {
    return {
      step: "parse_failed",
      error: "LLM trả JSON không hợp lệ.",
      messages: [new AIMessage("Mình chưa đọc được yêu cầu. Bạn gửi lại theo mẫu: thành phố, ngày nhận/trả phòng, số khách, ngân sách.")],
    };
  }

  const parsedResult = parsedCriteriaSchema.safeParse(parsedRaw);
  if (!parsedResult.success) {
    return {
      step: "parse_failed",
      error: parsedResult.error.message,
      messages: [new AIMessage("Thông tin đặt phòng chưa hợp lệ. Bạn gửi lại thành phố, ngày nhận/trả phòng YYYY-MM-DD, số khách và ngân sách nhé.")],
    };
  }

  const parsed = parsedResult.data;
  const criteria = {
    city: parsed.city,
    checkIn: parsed.checkIn ?? "",
    checkOut: parsed.checkOut ?? "",
    adults: parsed.adults,
    children: parsed.children,
    rooms: parsed.rooms,
    budgetVnd: parsed.budgetVnd ?? undefined,
    hotelNameHint: parsed.hotelNameHint ?? undefined,
  };

  if (!criteria.checkIn || !criteria.checkOut) {
    return {
      step: "need_dates",
      searchCriteria: criteria,
      messages: [
        new AIMessage("Bạn cho mình ngày nhận phòng (check-in) và trả phòng (check-out) theo định dạng YYYY-MM-DD nhé."),
      ],
    };
  }

  if (!isDateRangeValid(criteria.checkIn, criteria.checkOut)) {
    return {
      step: "invalid_dates",
      searchCriteria: criteria,
      messages: [
        new AIMessage("Ngày nhận phòng phải trước ngày trả phòng. Bạn gửi lại ngày theo định dạng YYYY-MM-DD nhé."),
      ],
    };
  }

  const up = parsed.userProfile;
  const userProfile =
    state.userProfile ??
    (up?.fullName && up?.email && up?.phone
      ? {
          fullName: up.fullName,
          email: up.email,
          phone: up.phone,
          specialRequests: up.specialRequests ?? undefined,
        }
      : null);

  const siteList = getActiveScanSites().map((id) => SITE_ADAPTERS[id].label).join(", ");
  const summary = `Tìm phòng tại ${criteria.city}, ${criteria.checkIn} → ${criteria.checkOut}, ${criteria.adults} người lớn, ${criteria.rooms} phòng. Quét: ${siteList}.`;

  const parseLog = logActivity("parse", "Đã phân tích yêu cầu", summary);

  return {
    step: "await_search_confirm",
    searchCriteria: criteria,
    userProfile,
    searchPlanSummary: summary,
    activityLog: parseLog,
    messages: [
      new AIMessage(
        `${summary}\n\nBấm **Xác nhận** để quét giá **thật** trên Booking, Agoda, Vntrip — 3 tab Playwright song song, khoảng 25–40 giây.`
      ),
    ],
  };
}

/** Auto-approve: UI gửi form đầy đủ → không cần confirm trước khi quét */
export async function awaitSearchConfirmNode(
  state: HotelAgentState
): Promise<Partial<HotelAgentState>> {
  if (!state.searchCriteria) {
    return { step: "error", error: "Thiếu searchCriteria" };
  }
  return {
    confirmedSteps: { search: true },
    step: "searching",
    lastInterrupt: null,
  };
}

export async function runSearchNode(state: HotelAgentState): Promise<Partial<HotelAgentState>> {
  if (!state.searchCriteria) {
    return { error: "Thiếu searchCriteria", step: "error" };
  }

  const activeSites = getActiveScanSites();
  const scanStart = logActivity(
    "search",
    "Bắt đầu quét song song (4 tab Playwright, lite)",
    activeSites.map((s) => SITE_ADAPTERS[s].label).join(", ")
  );

  const { offers, errors, siteScans, durationMs } = await searchHotel({
    criteria: state.searchCriteria,
  });

  const scanLines = siteScans.map((s) => {
    const label = SITE_ADAPTERS[s.site].label;
    const from = formatVietnamDateTime(s.startedAt);
    const to = formatVietnamDateTime(s.finishedAt);
    if (s.status === "ok") {
      return `• **${label}**: ${s.offerCount} phòng (${from} → ${to})`;
    }
    if (s.status === "empty") {
      return `• **${label}**: không có giá (${from} → ${to})`;
    }
    return `• **${label}**: lỗi ${s.error ?? "unknown"} (${from} → ${to})`;
  });

  const scanLogs = siteScans.flatMap((s) => {
    const errBit = s.error ? ` · ${s.error}` : "";
    const statusBit = s.status === "ok" ? "ok" : s.status;
    return logActivity(
      "search",
      `Quét ${SITE_ADAPTERS[s.site].label}`,
      `${s.offerCount} offer (${statusBit})${errBit} · ${formatVietnamDateTime(s.startedAt)} – ${formatVietnamDateTime(s.finishedAt)}`,
      s.finishedAt
    );
  });

  if (offers.length === 0) {
    const errNote = errors.map((e) => `${e.site}: ${e.message}`).join("; ");
    return {
      siteScans,
      activityLog: [...scanStart, ...scanLogs],
      step: "no_offers",
      error: errNote || "Không quét được giá từ OTA",
      messages: [
        new AIMessage(
          `**Không có giá thật** sau ${(durationMs / 1000).toFixed(0)}s.\n\n${scanLines.join("\n")}\n\nThử đổi ngày/thành phố hoặc chạy \`playwright:install\`. Lỗi: ${errNote || "DOM/CAPTCHA"}`
        ),
      ],
    };
  }

  const errNote =
    errors.length > 0
      ? `\n\n⚠ Một số trang lỗi: ${errors.map((e) => `${e.site}: ${e.message}`).join("; ")}`
      : "";

  const offerLines = offers
    .slice(0, 8)
    .map(
      (o, i) =>
        `${i + 1}. [${SITE_ADAPTERS[o.site].label}] ${o.hotelName} — ${formatVnd(o.priceVnd)} (quét ${formatVietnamDateTime(o.scrapedAt)})`
    )
    .join("\n");

  return {
    rawOffers: offers,
    siteScans,
    activityLog: [...scanStart, ...scanLogs],
    step: "compare",
    messages: [
      new AIMessage(
        `**Đã quét giá thật** — ${offers.length} offer / ${(durationMs / 1000).toFixed(0)}s\n\n${scanLines.join("\n")}\n\n${offerLines}${errNote}`
      ),
    ],
  };
}

export async function compareNode(state: HotelAgentState): Promise<Partial<HotelAgentState>> {
  if (!state.searchCriteria || state.rawOffers.length === 0) {
    return {
      step: "no_offers",
      messages: [new AIMessage("Không tìm thấy phòng phù hợp. Thử đổi ngày hoặc thành phố.")],
    };
  }

  const comparison = await comparePrices({
    offers: state.rawOffers,
    criteria: state.searchCriteria,
  });

  const top = formatOfferLine(comparison.recommended, 1);
  const alts = comparison.alternatives.map((o, i) => formatOfferLine(o, i + 2)).join("\n");

  return {
    comparison,
    selectedOffer: comparison.recommended,
    step: "await_selection_confirm",
    messages: [
      new AIMessage(
        `**Đề xuất (so sánh code):** ${top}\n\n${comparison.reasoning}\n\n**Khác:**\n${alts}\n\nXác nhận để tiếp tục đặt phòng.`
      ),
    ],
  };
}

/** Confirm hotel selection */
export async function awaitSelectionConfirmNode(
  state: HotelAgentState
): Promise<Partial<HotelAgentState>> {
  if (state.confirmedSteps.selection && state.selectedOffer) {
    return { step: "await_fill_confirm" };
  }

  const payload = interrupt({
    kind: "confirm_selection",
    title: "Chọn phòng",
    summary: state.comparison?.reasoning ?? "",
    data: {
      recommended: state.comparison?.recommended,
      alternatives: state.comparison?.alternatives,
      offers: [state.comparison?.recommended, ...(state.comparison?.alternatives ?? [])].filter(Boolean),
    },
  });

  let selected = state.comparison?.recommended ?? null;
  if (typeof payload === "object" && payload !== null) {
    const p = payload as { approved?: boolean; offerIndex?: number; offer?: HotelOffer };
    if (p.offer) selected = p.offer;
    else if (typeof p.offerIndex === "number") {
      const all = [state.comparison?.recommended, ...(state.comparison?.alternatives ?? [])].filter(
        Boolean
      ) as HotelOffer[];
      selected = all[p.offerIndex] ?? selected;
    }
    if (p.approved === false) {
      return {
        step: "selection_cancelled",
        messages: [new AIMessage("Đã hủy chọn phòng.")],
      };
    }
  }

  if (!selected) {
    return { error: "Chưa chọn phòng", step: "error" };
  }

  return {
    selectedOffer: selected,
    confirmedSteps: { selection: true },
    step: "await_fill_confirm",
    messages: [
      new AIMessage(
        `Đã chọn: **${selected.hotelName}** (${SITE_ADAPTERS[selected.site].label}) — ${formatVnd(selected.priceVnd)}${selected.priceNote ? ` _(${selected.priceNote})_` : ""}.\n\nXác nhận để điền họ tên, email, SĐT (giá checkout có thể khác do thuế/phí/loại phòng).`
      ),
    ],
    lastInterrupt: null,
  };
}

export async function awaitFillConfirmNode(state: HotelAgentState): Promise<Partial<HotelAgentState>> {
  if (state.confirmedSteps.fill) {
    return { step: "filling" };
  }

  if (!state.userProfile) {
    return {
      step: "need_profile",
      messages: [
        new AIMessage("Cần họ tên, email và số điện thoại để điền form. Gửi trong tin nhắn hoặc payload resume."),
      ],
    };
  }

  const payload = interrupt({
    kind: "confirm_fill",
    title: "Xác nhận điền form",
    summary: `Khách: ${state.userProfile.fullName}, ${state.userProfile.email}`,
    data: { profile: state.userProfile, offer: state.selectedOffer },
  });

  const approved =
    payload === true ||
    (typeof payload === "object" &&
      payload !== null &&
      "approved" in payload &&
      (payload as { approved: boolean }).approved);

  if (!approved) {
    return { step: "fill_cancelled", messages: [new AIMessage("Đã hủy điền form.")] };
  }

  return {
    confirmedSteps: { fill: true },
    step: "filling",
    lastInterrupt: null,
  };
}

export async function fillBookingFormNode(state: HotelAgentState): Promise<Partial<HotelAgentState>> {
  if (!state.selectedOffer || !state.userProfile) {
    return { error: "Thiếu offer hoặc profile", step: "error" };
  }

  const fillStart = logActivity(
    "fill",
    "Bắt đầu điền form trên OTA",
    `${SITE_ADAPTERS[state.selectedOffer.site].label} · ${state.selectedOffer.bookingUrl}`
  );

  const formFill = await fillForm({
    offer: state.selectedOffer,
    profile: state.userProfile,
    criteria: state.searchCriteria,
  });

  const fillDone = logActivity(
    "fill",
    "Hoàn tất điền form (dừng trước thanh toán)",
    `${formatVietnamDateTime(formFill.startedAt)} → ${formatVietnamDateTime(formFill.finishedAt)}`,
    formFill.finishedAt
  );

  return {
    formFill,
    activityLog: [...fillStart, ...fillDone],
    step: "payment_handoff",
    messages: [
      new AIMessage(
        `${formFill.message}\n\n**Thời gian:** ${formatVietnamDateTime(formFill.startedAt)} → ${formatVietnamDateTime(formFill.finishedAt)}\n\n**Link đặt phòng / thanh toán:** ${formFill.paymentUrl ?? "—"}\n${formFill.qrHint ?? ""}`
      ),
    ],
  };
}

export async function paymentHandoffNode(state: HotelAgentState): Promise<Partial<HotelAgentState>> {
  const payload = interrupt({
    kind: "payment_handoff",
    title: "Thanh toán thủ công",
    summary: "Agent dừng trước bước thanh toán.",
    data: {
      paymentUrl: state.formFill?.paymentUrl,
      qrHint: state.formFill?.qrHint,
      screenshotPath: state.formFill?.screenshotPath,
      offer: state.selectedOffer,
    },
  });

  void payload;

  const payLog = logActivity("payment", "Chờ bạn thanh toán thủ công", state.formFill?.paymentUrl);

  return {
    step: "done",
    activityLog: payLog,
    messages: [
      new AIMessage(
        `Hoàn tất luồng đặt phòng lúc ${formatVietnamDateTime()}. Kiểm tra email xác nhận từ đối tác sau khi bạn thanh toán.`
      ),
    ],
    lastInterrupt: null,
  };
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

function formatOfferLine(o: HotelOffer, index: number): string {
  const note = o.priceNote ? ` · ${o.priceNote}` : "";
  return `${index}. [${SITE_ADAPTERS[o.site].label}] ${o.hotelName} — ${formatVnd(o.priceVnd)}${note} (quét ${formatVietnamDateTime(o.scrapedAt)})${o.rating ? ` ★${o.rating}` : ""}`;
}
