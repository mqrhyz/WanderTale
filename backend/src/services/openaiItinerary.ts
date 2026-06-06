import { isOllamaProvider, llmContextCharLimit, llmGenerateJsonFast, llmGenerateJsonSkeleton, parseModelJsonText } from "../lib/llm.js";
import { isGeminiLlmFailure } from "../lib/gemini.js";
import { z } from "zod";
import type { TripHotelPricingResult } from "./tripHotelPricing.js";
import type { SuggestedPlace } from "./tripSuggestPlaces.js";
import { isGenericAgendaTitle } from "./tripAgendaUtils.js";
import {
  finalizeDayPlan,
  slotHasContent,
  sortActivitiesByTime,
  targetActivitiesPerDay,
  type DayPlanLike,
  type SlotLike,
} from "./tripAgendaActivities.js";
import { hotelPricingSummary } from "./tripPricingEnrichment.js";
import { applySpecificPlacesToAgenda } from "./tripAgendaPlaces.js";

const bookingSuggestionSchema = z
  .object({
    name: z.string(),
    category: z.enum(["hotel", "restaurant", "attraction"]),
    place_id: z.string().optional(),
    url: z.string().optional(),
    price_level: z.number().optional(),
    reason: z.string().optional(),
    price_vnd: z.number().optional(),
    price_source: z.enum(["scraped", "estimated", "ai"]).optional(),
    site: z.string().optional(),
    scraped_at: z.string().optional(),
  })
  .passthrough();

const voucherSuggestionSchema = z.object({
  voucher_id: z.string(),
  code: z.string(),
  title: z.string(),
  partner_name: z.string(),
  reason: z.string().optional(),
});

const activityCategorySchema = z.enum([
  "landmark",
  "hotel",
  "restaurant",
  "cafe",
  "nature",
  "activity",
]);

const cuisineTypeSchema = z.enum(["pho", "bun_bo", "com", "banh", "cafe", "other"]);

const slotSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    place_id: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    suggested_duration_minutes: z.number().optional(),
    estimated_cost: z.number().optional(),
    notes: z.string().optional(),
    weather_note: z.string().optional(),
    crowdedness_hint: z.string().optional(),
    category: activityCategorySchema.optional(),
    cuisine_type: cuisineTypeSchema.optional(),
  })
  .passthrough();

const SLOT_DEFAULT_TIMES: Record<"morning" | "afternoon" | "evening", { start: string; end: string }> = {
  morning: { start: "07:00", end: "11:30" },
  afternoon: { start: "11:30", end: "17:00" },
  evening: { start: "17:00", end: "21:30" },
};

const daySchema = z.object({
  day: z.number().int().positive(),
  date: z.string(),
  theme: z.string(),
  activities: z.array(slotSchema).optional(),
  morning: slotSchema.optional(),
  afternoon: slotSchema.optional(),
  evening: slotSchema.optional(),
});

export const generatedItinerarySchema = z.object({
  destination: z.string(),
  summary: z.string(),
  total_estimated_cost: z.number(),
  risk_warnings: z.array(z.string()),
  days: z.array(daySchema),
  hotel_suggestions: z.array(bookingSuggestionSchema),
  restaurant_suggestions: z.array(bookingSuggestionSchema),
  voucher_suggestions: z.array(voucherSuggestionSchema),
  pricing_meta: z.record(z.unknown()).optional(),
});

export type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;
export type ItinerarySlot = z.infer<typeof slotSchema>;

type BookingCategory = "hotel" | "restaurant" | "attraction";

function coerceString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const key of ["message", "text", "warning", "title", "description", "summary"]) {
      if (typeof o[key] === "string") return (o[key] as string).trim();
    }
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

function inferCategory(value: unknown, fallback: BookingCategory): BookingCategory {
  if (typeof value !== "string") return fallback;
  const c = value.toLowerCase();
  if (c.includes("hotel") || c.includes("khách sạn")) return "hotel";
  if (c.includes("restaurant") || c.includes("food") || c.includes("ăn")) return "restaurant";
  if (c.includes("attraction") || c.includes("tham quan")) return "attraction";
  return fallback;
}

function normalizeBookingSuggestions(items: unknown, fallback: BookingCategory): unknown[] {
  if (!Array.isArray(items)) return [];
  const out: unknown[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name =
      typeof o.name === "string"
        ? o.name.trim()
        : typeof o.title === "string"
          ? o.title.trim()
          : "";
    if (!name) continue;
    out.push({
      name,
      category: inferCategory(o.category, fallback),
      place_id: typeof o.place_id === "string" ? o.place_id : undefined,
      url: typeof o.url === "string" ? o.url : undefined,
      price_level: typeof o.price_level === "number" ? o.price_level : undefined,
      reason: typeof o.reason === "string" ? o.reason : undefined,
    });
  }
  return out;
}

function normalizeVoucherSuggestions(items: unknown, vouchers: unknown): unknown[] {
  const byId = new Map<string, Record<string, unknown>>();
  if (Array.isArray(vouchers)) {
    for (const v of vouchers) {
      if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string") {
        byId.set((v as { id: string }).id, v as Record<string, unknown>);
      }
    }
  }
  if (!Array.isArray(items) || byId.size === 0) return [];

  const out: unknown[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const voucherId =
      typeof o.voucher_id === "string"
        ? o.voucher_id
        : typeof o.id === "string"
          ? o.id
          : "";
    const src = byId.get(voucherId);
    if (!src) continue;
    const partners = src.partners as { name?: string } | null | undefined;
    const partnerName =
      typeof o.partner_name === "string"
        ? o.partner_name
        : partners && typeof partners.name === "string"
          ? partners.name
          : "";
    out.push({
      voucher_id: voucherId,
      code: typeof o.code === "string" ? o.code : String(src.code ?? ""),
      title: typeof o.title === "string" ? o.title : String(src.title ?? ""),
      partner_name: partnerName || "Đối tác",
      reason: typeof o.reason === "string" ? o.reason : undefined,
    });
  }
  return out;
}

function addDaysIso(iso: string, offset: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function parseTripStartDate(dateRangeLabel: string): string | null {
  const m = dateRangeLabel.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function fallbackActivity(
  title: string,
  destination: string,
  cost: number,
  start: string,
  end: string,
  category: "landmark" | "hotel" | "restaurant" | "cafe" | "nature" | "activity" = "activity",
  cuisine_type?: "pho" | "bun_bo" | "com" | "banh" | "cafe" | "other"
): Record<string, unknown> {
  return {
    title,
    summary: `Gợi ý khám phá tại ${destination}.`,
    start_time: start,
    end_time: end,
    estimated_cost: cost,
    suggested_duration_minutes: 90,
    weather_note: "Kiểm tra thời tiết trước khi ra ngoài — lịch khung tạm thời.",
    notes: "Lịch khung — AI sẽ tinh chỉnh sau khi API khả dụng.",
    category,
    ...(category === "restaurant" || category === "cafe"
      ? { cuisine_type: cuisine_type ?? "other" }
      : {}),
  };
}

const FALLBACK_DAY_ACTIVITIES: Array<{
  start: string;
  end: string;
  title: string;
  category: "landmark" | "cafe" | "restaurant" | "activity";
  cuisine_type?: "cafe" | "other";
}> = [
  { start: "08:00", end: "09:30", title: "Điểm tham quan buổi sáng", category: "landmark" },
  { start: "10:00", end: "11:30", title: "Cafe / view sáng", category: "cafe", cuisine_type: "cafe" },
  { start: "12:00", end: "13:30", title: "Ăn trưa đặc sản", category: "restaurant", cuisine_type: "other" },
  { start: "14:30", end: "16:30", title: "Khám phá chiều", category: "activity" },
  { start: "18:30", end: "20:30", title: "Ẩm thực / phố đi bộ tối", category: "restaurant", cuisine_type: "other" },
];

/** Lịch khung khi Gemini hết quota — vẫn trả trip thay vì 503. */
export function buildFallbackSkeletonItinerary(params: ItineraryGenerateParams): GeneratedItinerary {
  const startDate = parseTripStartDate(params.dateRangeLabel) ?? new Date().toISOString().slice(0, 10);
  const perActivityCost = Math.max(40_000, Math.round(params.budget / Math.max(params.numDays, 1) / 5));

  const days = Array.from({ length: params.numDays }, (_, i) => {
    const activities = FALLBACK_DAY_ACTIVITIES.map((a) =>
      fallbackActivity(
        `${a.title} — ${params.destination}`,
        params.destination,
        perActivityCost,
        a.start,
        a.end,
        a.category,
        a.cuisine_type
      )
    );
    return finalizeDayPlan({
      day: i + 1,
      date: addDaysIso(startDate, i),
      theme: `Ngày ${i + 1} — ${params.destination}`,
      activities: activities as SlotLike[],
    });
  });

  return {
    destination: params.destination,
    summary: `Lịch khung ${params.numDays} ngày tại ${params.destination}. Gemini API đang giới hạn — bạn vẫn xem được timeline; thử tạo lại sau vài phút để có lịch chi tiết hơn.`,
    total_estimated_cost: perActivityCost * FALLBACK_DAY_ACTIVITIES.length * params.numDays,
    risk_warnings: [
      "Lịch tạm thời do Gemini API hết quota/rate limit. Giá OTA vẫn quét nền bình thường.",
    ],
    days: days as GeneratedItinerary["days"],
    hotel_suggestions: [],
    restaurant_suggestions: [],
    voucher_suggestions: [],
  };
}

function slotFromSuggested(match: SuggestedPlace | undefined): Record<string, unknown> | undefined {
  if (!match) return undefined;
  return {
    title: match.name,
    summary: match.note ?? "",
    estimated_cost: match.estimated_cost_vnd,
    suggested_duration_minutes: match.duration_minutes,
  };
}

function mergeSlotWithSuggested(
  raw: unknown,
  fallbackTitle: string,
  slotKey: "morning" | "afternoon" | "evening",
  suggested?: Record<string, unknown>
): Record<string, unknown> {
  const slot = normalizeSlot(raw ?? suggested, fallbackTitle, slotKey);
  const title = typeof slot.title === "string" ? slot.title : "";
  if (isGenericAgendaTitle(title) && suggested?.title) {
    return {
      ...slot,
      ...suggested,
      title: String(suggested.title),
      summary: slot.summary || suggested.summary || "",
    };
  }
  return slot;
}

function normalizeActivityCategory(value: unknown): SlotLike["category"] {
  if (typeof value !== "string") return undefined;
  const c = value.trim().toLowerCase();
  const allowed: SlotLike["category"][] = [
    "landmark",
    "hotel",
    "restaurant",
    "cafe",
    "nature",
    "activity",
  ];
  return allowed.find((a) => a === c);
}

function normalizeCuisineType(value: unknown): SlotLike["cuisine_type"] {
  if (typeof value !== "string") return undefined;
  const c = value.trim().toLowerCase();
  const allowed: SlotLike["cuisine_type"][] = ["pho", "bun_bo", "com", "banh", "cafe", "other"];
  return allowed.find((a) => a === c);
}

function normalizeSlot(
  raw: unknown,
  fallbackTitle = "Khám phá / thư giãn",
  slotKey?: "morning" | "afternoon" | "evening"
): Record<string, unknown> {
  const times = slotKey ? SLOT_DEFAULT_TIMES[slotKey] : undefined;
  if (typeof raw === "string" && raw.trim()) {
    return {
      title: raw.trim(),
      summary: "",
      start_time: times?.start,
      end_time: times?.end,
    };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const title =
      coerceString(o.title ?? o.name ?? o.place ?? o.activity ?? o.destination) || fallbackTitle;
    return {
      title,
      summary: coerceString(o.summary ?? o.description ?? o.details),
      place_id: typeof o.place_id === "string" ? o.place_id : undefined,
      start_time:
        typeof o.start_time === "string" && o.start_time.trim()
          ? o.start_time.trim()
          : times?.start,
      end_time:
        typeof o.end_time === "string" && o.end_time.trim() ? o.end_time.trim() : times?.end,
      suggested_duration_minutes:
        typeof o.suggested_duration_minutes === "number"
          ? o.suggested_duration_minutes
          : typeof o.duration_minutes === "number"
            ? o.duration_minutes
            : undefined,
      estimated_cost:
        typeof o.estimated_cost === "number"
          ? o.estimated_cost
          : typeof o.price_vnd === "number"
            ? o.price_vnd
            : typeof o.estimated_cost_vnd === "number"
              ? o.estimated_cost_vnd
              : undefined,
      notes: typeof o.notes === "string" ? o.notes : undefined,
      weather_note: typeof o.weather_note === "string" ? o.weather_note : undefined,
      crowdedness_hint: typeof o.crowdedness_hint === "string" ? o.crowdedness_hint : undefined,
      category: normalizeActivityCategory(o.category),
      cuisine_type: normalizeCuisineType(o.cuisine_type),
    };
  }
  return {
    title: fallbackTitle,
    summary: "",
    start_time: times?.start,
    end_time: times?.end,
  };
}

function normalizeActivitiesRaw(raw: unknown): SlotLike[] {
  if (!Array.isArray(raw)) return [];
  const out: SlotLike[] = [];
  for (const item of raw) {
    const slot = normalizeSlot(item) as SlotLike;
    if (slotHasContent(slot)) out.push(slot);
  }
  return sortActivitiesByTime(out);
}

function normalizeDay(
  dayRaw: unknown,
  dayIndex: number,
  startDate: string | null,
  suggestedPlaces: SuggestedPlace[]
): DayPlanLike & { activities: SlotLike[] } {
  const dayNum = dayIndex + 1;
  const date = startDate ? addDaysIso(startDate, dayIndex) : "";
  const placeForSlot = (slot: "morning" | "afternoon" | "evening") => {
    const slotIdx = slot === "morning" ? 0 : slot === "afternoon" ? 1 : 2;
    const dayPlaces = suggestedPlaces.filter((p) => p.day === dayNum);
    const match = dayPlaces[slotIdx] ?? suggestedPlaces[dayIndex * 3 + slotIdx];
    return slotFromSuggested(match);
  };

  if (!dayRaw || typeof dayRaw !== "object" || Array.isArray(dayRaw)) {
    const legacy = finalizeDayPlan({
      day: dayNum,
      date,
      theme: `Ngày ${dayNum}`,
      morning: mergeSlotWithSuggested(undefined, "Buổi sáng", "morning", placeForSlot("morning")) as SlotLike,
      afternoon: mergeSlotWithSuggested(undefined, "Buổi chiều", "afternoon", placeForSlot("afternoon")) as SlotLike,
      evening: mergeSlotWithSuggested(undefined, "Buổi tối", "evening", placeForSlot("evening")) as SlotLike,
    });
    return legacy;
  }

  const d = dayRaw as Record<string, unknown>;
  let activities = normalizeActivitiesRaw(d.activities);

  if (activities.length === 0 && Array.isArray(d.places)) {
    activities = normalizeActivitiesRaw(d.places);
  }

  if (activities.length === 0) {
    let morning: unknown = d.morning ?? d.morning_slot ?? d.sang ?? d.buoi_sang;
    let afternoon: unknown = d.afternoon ?? d.afternoon_slot ?? d.chieu ?? d.buoi_chieu;
    let evening: unknown = d.evening ?? d.evening_slot ?? d.toi ?? d.buoi_toi;

    const legacyActs = Array.isArray(d.activities) ? d.activities : [];
    for (const act of legacyActs) {
      if (!act || typeof act !== "object") continue;
      const a = act as Record<string, unknown>;
      const period = coerceString(a.slot ?? a.period ?? a.time_of_day ?? a.time).toLowerCase();
      if (/morning|sáng|sang|am/.test(period)) morning = morning ?? a;
      else if (/afternoon|chiều|chieu|pm/.test(period)) afternoon = afternoon ?? a;
      else if (/evening|tối|toi|night/.test(period)) evening = evening ?? a;
      else activities.push(normalizeSlot(a) as SlotLike);
    }

    if (activities.length === 0) {
      activities = [
        mergeSlotWithSuggested(morning ?? placeForSlot("morning"), "Buổi sáng", "morning", placeForSlot("morning")),
        mergeSlotWithSuggested(afternoon ?? placeForSlot("afternoon"), "Buổi chiều", "afternoon", placeForSlot("afternoon")),
        mergeSlotWithSuggested(evening ?? placeForSlot("evening"), "Buổi tối", "evening", placeForSlot("evening")),
      ]
        .map((s) => s as SlotLike)
        .filter(slotHasContent);
    }
  }

  return finalizeDayPlan({
    day: typeof d.day === "number" ? d.day : dayNum,
    date: typeof d.date === "string" && d.date ? d.date : date,
    theme: coerceString(d.theme) || `Ngày ${dayNum}`,
    activities: sortActivitiesByTime(activities),
  });
}

function normalizeDays(
  raw: unknown,
  numDays: number,
  startDate: string | null,
  suggestedPlaces: SuggestedPlace[]
): unknown[] {
  const arr = Array.isArray(raw) ? raw : [];
  const days: unknown[] = [];
  for (let i = 0; i < Math.max(numDays, 1); i++) {
    days.push(normalizeDay(arr[i], i, startDate, suggestedPlaces));
  }
  return days.slice(0, numDays);
}

/** LLM (đặc biệt Ollama/Gemma) thường thiếu slot hoặc dùng key khác — chuẩn hóa trước Zod. */
export function normalizeItineraryFromModel(
  raw: unknown,
  vouchers: unknown,
  opts?: {
    numDays?: number;
    startDate?: string | null;
    suggestedPlaces?: SuggestedPlace[];
  }
): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const nested =
    o.itinerary && typeof o.itinerary === "object" ? (o.itinerary as Record<string, unknown>) : null;
  const daysRaw = o.days ?? nested?.days ?? o.daily_plan ?? o.schedule;
  const riskRaw = Array.isArray(o.risk_warnings)
    ? o.risk_warnings
    : Array.isArray(nested?.risk_warnings)
      ? nested.risk_warnings
      : [];

  const numDays = opts?.numDays ?? (Array.isArray(daysRaw) ? daysRaw.length : 1);
  const suggestedPlaces = opts?.suggestedPlaces ?? [];

  return {
    ...o,
    destination: coerceString(o.destination ?? nested?.destination),
    summary: coerceString(o.summary ?? nested?.summary),
    total_estimated_cost:
      typeof o.total_estimated_cost === "number"
        ? o.total_estimated_cost
        : Number(o.total_estimated_cost ?? nested?.total_estimated_cost) || 0,
    risk_warnings: riskRaw.map(coerceString).filter((s) => s.length > 0),
    days: normalizeDays(daysRaw, numDays, opts?.startDate ?? null, suggestedPlaces),
    hotel_suggestions: normalizeBookingSuggestions(
      o.hotel_suggestions ?? nested?.hotel_suggestions,
      "hotel"
    ),
    restaurant_suggestions: normalizeBookingSuggestions(
      o.restaurant_suggestions ?? nested?.restaurant_suggestions,
      "restaurant"
    ),
    voucher_suggestions: normalizeVoucherSuggestions(o.voucher_suggestions, vouchers),
  };
}

export type ItineraryGenerateParams = {
  destination: string;
  dateRangeLabel: string;
  numDays: number;
  budget: number;
  preferences: { tags: string[] };
  travelers: number;
  pace: string;
  accommodation_style?: string;
  weather: unknown;
  traffic: unknown;
  places: unknown;
  vouchers: unknown;
  suggestedPlaces?: SuggestedPlace[];
  hotelPricing?: TripHotelPricingResult;
  /** P2: chưa có giá OTA — sinh lịch skeleton, hotel_suggestions tối thiểu. */
  skeleton?: boolean;
};

function buildItineraryPrompt(params: ItineraryGenerateParams): string {
  const hotelSummary = params.hotelPricing?.comparison
    ? hotelPricingSummary(params.hotelPricing.comparison)
    : null;

  const ctxLimit = llmContextCharLimit();
  const ollama = isOllamaProvider();
  const skeleton = params.skeleton === true;
  const placesSlice = (params.suggestedPlaces ?? []).slice(0, ollama ? 10 : skeleton ? 0 : 12);
  const jsonSlice = ollama ? ctxLimit : skeleton ? 2500 : 6000;
  const weatherSlice = skeleton ? 1800 : jsonSlice;
  const { min: minActs, max: maxActs } = targetActivitiesPerDay(params.pace);

  const contextLines = skeleton
    ? [
        `SKELETON MODE — trả lịch nhanh, hotel_suggestions: []. Giá OTA cập nhật sau.`,
        `Dùng kiến thức địa điểm nổi tiếng tại ${params.destination} (tên thật, tiếng Việt).`,
        `QUAN TRỌNG: mỗi phần tử trong activities[] = 1 địa điểm/hoạt động cụ thể (vd "Hồ Xuân Hương", "Chợ Đà Lạt") với start_time/end_time — KHÔNG gom cả ngày thành 3 buổi.`,
        `WEATHER_JSON:\n${JSON.stringify(params.weather).slice(0, weatherSlice)}`,
      ]
    : [
        ...(params.skeleton
          ? [`SKELETON MODE: Giá OTA đang quét — hotel_suggestions để [] hoặc tối đa 1 khách sạn ước tính AI (price_source ai). Giá phòng sẽ cập nhật sau.`]
          : []),
        hotelSummary ? `HOTEL_OTA (giá quét thật): ${hotelSummary}. Dùng tên khách sạn này trong hotel_suggestions và ghi estimated_cost phòng.` : "",
        `SUGGESTED_PLACES_JSON:\n${JSON.stringify(placesSlice).slice(0, jsonSlice)}`,
        `HOTEL_PRICING_JSON:\n${JSON.stringify({
          status: params.hotelPricing?.status,
          top_offers: params.hotelPricing?.offers?.slice(0, ollama ? 3 : 5) ?? [],
          comparison: params.hotelPricing?.comparison ?? null,
        }).slice(0, jsonSlice)}`,
        `WEATHER_JSON:\n${JSON.stringify(params.weather).slice(0, jsonSlice)}`,
        ...(ollama ? [] : [`PLACES_JSON:\n${JSON.stringify(params.places).slice(0, jsonSlice)}`]),
        `VOUCHERS_JSON:\n${JSON.stringify(params.vouchers).slice(0, ollama ? 1500 : 3000)}`,
      ].filter(Boolean);

  return [
    ollama
      ? `WanderTale — lịch du lịch Việt Nam. Trả về ĐÚNG MỘT object JSON hợp lệ, không markdown, không giải thích.`
      : `You are WanderTale, a travel planning engine for Vietnam travelers.`,
    `Build a ${params.numDays}-day itinerary. Respond with JSON only (no markdown).`,
    `Destination: ${params.destination}`,
    `Dates: ${params.dateRangeLabel}`,
    `Budget (total trip, local currency estimate): ${params.budget}`,
    `Travelers: ${params.travelers}`,
    `Pace: ${params.pace}`,
    `Accommodation style: ${params.accommodation_style ?? "standard"} (budget=hostel/homestay, standard=3-star hotel, premium=resort/boutique). Match hotel_suggestions to this tier within total budget.`,
    `Preferences (tags): ${params.preferences.tags.join(", ") || "general"}.`,
    `Thời điểm hiện tại: tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}. Ưu tiên địa điểm đang HOT/được ưa chuộng & hợp mùa hiện tại; KHÔNG đề xuất nơi đã ĐÓNG CỬA VĨNH VIỄN hoặc ngừng hoạt động.`,
    `weather_note BẮT BUỘC là CẢNH BÁO khi thời tiết khung giờ đó có biến động (mưa, dông, nắng gắt, lạnh sâu, gió mạnh) — mở đầu bằng "⚠️" và nêu cách ứng phó (mang ô, đổi sang indoor...). Nếu thời tiết ổn định thì ghi ngắn gọn không cần "⚠️".`,
    ollama
      ? `Dùng thời tiết gợi ý indoor/outdoor. Mỗi ngày có activities[] (${minActs}–${maxActs} mục), mỗi mục là object có title, category, start_time, end_time, summary, estimated_cost.`
      : `Use WEATHER_JSON for each calendar date: schedule outdoor/indoor by hour. Each day has activities[] (${minActs}–${maxActs} timed stops), NOT just 3 generic sessions.`,
    ...(ollama
      ? []
      : [
          `Each day theme or slot title should reflect weather when relevant (e.g. rainy afternoon → indoor market or cafe).`,
          `Use traffic hints for risk_warnings when relevant (no mock URLs).`,
          `If PLACES_JSON has status "skipped" or "error", or places is empty, recommend real well-known POIs for the destination from your knowledge (Vietnam/local names). Do not invent place_id.`,
        ]),
    `risk_warnings MUST be an array of plain strings (e.g. "Mưa có thể ảnh hưởng ngày 2"), NOT objects.`,
    `Align each day's "date" with the calendar sequence starting the first trip date.`,
    `hotel_suggestions: each item MUST have name and category "hotel". restaurant_suggestions: name + category "restaurant".`,
    skeleton
      ? `voucher_suggestions: []. restaurant_suggestions: tối đa 3 món.`
      : `voucher_suggestions: ONLY items with voucher_id from VOUCHERS_JSON (include voucher_id, code, title, partner_name). If no vouchers match, use [].`,
    `Mỗi activity BẮT BUỘC có: title (TÊN RIÊNG địa điểm/quán cụ thể), category, summary, start_time & end_time (HH:MM 24h, không trùng/overlap trong cùng ngày), weather_note (1 câu ngắn tiếng Việt), estimated_cost (VND), suggested_duration_minutes, notes (tuỳ chọn).`,
    `category BẮT BUỘC — một trong: "landmark" | "hotel" | "restaurant" | "cafe" | "nature" | "activity".`,
    `- landmark: danh thắng, chợ, bảo tàng, quảng trường, nhà thờ, di tích`,
    `- nature: hồ, thác, núi, rừng, bãi biển, công viên thiên nhiên`,
    `- restaurant: quán ăn, nhà hàng, ăn sáng/trưa/tối`,
    `- cafe: quán cà phê, cafe view, trà chiều`,
    `- hotel: check-in / nghỉ khách sạn (chỉ khi thật sự là KS)`,
    `- activity: tour, spa, mua sắm, giải trí, trải nghiệm`,
    `Khi category = "restaurant" hoặc "cafe", BẮT BUỘC thêm cuisine_type: "pho" | "bun_bo" | "com" | "banh" | "cafe" | "other".`,
    `cuisine_type gợi ý: pho (phở), bun_bo (bún bò/bún riêu), com (cơm tấm/cơm), banh (bánh mì/bánh cuốn), cafe (cà phê/đồ uống), other (món khác).`,
    `title KHÔNG được là nhãn buổi ("Buổi sáng", "Tham quan buổi chiều") — phải là tên tra được trên Google Maps.`,
    `Sắp xếp activities theo thời gian tăng dần trong ngày (08:00 → 21:00). Có thể xen ăn uống, di chuyển, tham quan — mỗi mục 1 địa điểm.`,
    `Pace "${params.pace}": mỗi ngày ${minActs}–${maxActs} activities.`,
    `weather_note ví dụ: "Trời nắng nhẹ, phù hợp đi bộ ngoài trời" hoặc "Mưa rào, ưu tiên indoor/cafe".`,
    ...(skeleton ? [] : [`Ưu tiên đặt tên địa điểm từ SUGGESTED_PLACES_JSON vào đúng ngày/giờ.`]),
    ...contextLines,
    ``,
    `JSON shape (BẮT BUỘC mỗi ngày có activities[] — KHÔNG chỉ 3 buổi):`,
    `{ "destination":"...", "summary":"...", "total_estimated_cost":0, "risk_warnings":[],`,
    `"days":[{"day":1,"date":"YYYY-MM-DD","theme":"...","activities":[`,
    `{"title":"Hồ Xuân Hương","category":"landmark","start_time":"08:30","end_time":"10:00","weather_note":"...","summary":"...","estimated_cost":0},`,
    `{"title":"Ăn sáng Bún bò Huế Mợ Tôn","category":"restaurant","cuisine_type":"bun_bo","start_time":"10:45","end_time":"11:45","summary":"...","estimated_cost":0}`,
    `]}],`,
    `"hotel_suggestions":[],"restaurant_suggestions":[],"voucher_suggestions":[] }`,
    `activities[] tối thiểu ${minActs} mục/ngày. KHÔNG dùng string thay object.`,
    `Use Vietnamese for titles/summaries where natural.`,
  ].join("\n");
}

async function finalizeItineraryFromLlmText(
  text: string,
  params: ItineraryGenerateParams
): Promise<GeneratedItinerary> {
  const ollama = isOllamaProvider();
  let parsed: unknown;
  try {
    parsed = parseModelJsonText(text);
  } catch (parseErr) {
    if (!ollama) {
      const msg = parseErr instanceof Error ? parseErr.message : "LLM output was not valid JSON";
      throw new Error(msg);
    }
    const repairPrompt = [
      "Chuyển nội dung sau thành MỘT JSON object hợp lệ duy nhất.",
      "Schema: destination, summary, total_estimated_cost, risk_warnings[], days[{day,date,theme,activities[]}], hotel_suggestions[], restaurant_suggestions[], voucher_suggestions[].",
      "Mỗi activity: {title, category, start_time, end_time, summary, estimated_cost, cuisine_type? (restaurant/cafe only)}. JSON only.",
      text.slice(0, 8000),
    ].join("\n");
    parsed = parseModelJsonText(await llmGenerateJsonFast(repairPrompt));
  }

  const normalized = normalizeItineraryFromModel(parsed, params.vouchers, {
    numDays: params.numDays,
    startDate: parseTripStartDate(params.dateRangeLabel),
    suggestedPlaces: params.suggestedPlaces ?? [],
  });
  const check = generatedItinerarySchema.safeParse(normalized);
  if (!check.success) {
    throw new Error(`Itinerary validation failed: ${check.error.message}`);
  }
  return applySpecificPlacesToAgenda(check.data, params.suggestedPlaces ?? []);
}

export async function generateItinerary(params: ItineraryGenerateParams): Promise<GeneratedItinerary> {
  const userPrompt = buildItineraryPrompt(params);
  try {
    const text = params.skeleton
      ? await llmGenerateJsonSkeleton(userPrompt)
      : await llmGenerateJsonFast(userPrompt);
    return finalizeItineraryFromLlmText(text, params);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (params.skeleton && isGeminiLlmFailure(msg)) {
      console.warn("[itinerary] Gemini lỗi trong skeleton — dùng lịch khung fallback:", msg.slice(0, 100));
      return buildFallbackSkeletonItinerary(params);
    }
    throw e;
  }
}
