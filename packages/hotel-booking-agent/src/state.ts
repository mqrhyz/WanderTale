import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/** Supported Vietnam-focused OTA / booking sites */
export type BookingSiteId = "booking" | "agoda" | "vntrip";

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  specialRequests?: string;
};

export type SearchCriteria = {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  budgetVnd?: number;
  /** Tìm KS cụ thể trên OTA (1 tên). */
  hotelNameHint?: string;
  /** Danh sách KS ưu tiên từ tối ưu lộ trình. */
  hotelNameHints?: string[];
};

export type HotelOffer = {
  site: BookingSiteId;
  hotelName: string;
  roomName?: string;
  priceVnd: number;
  currency: string;
  /** Ghi chú nguồn giá (tìm kiếm vs tổng đêm) */
  priceNote?: string;
  nights?: number;
  rating?: number;
  location?: string;
  perks?: string[];
  bookingUrl: string;
  /** URL ảnh preview từ trang OTA (không tải file) */
  imagePreviewUrl?: string;
  /** Nhiều URL ảnh gallery (copy link CDN) */
  imagePreviewUrls?: string[];
  scrapedAt: string;
  /** Playwright confidence 0–1 */
  confidence: number;
};

export type ComparisonResult = {
  recommended: HotelOffer;
  alternatives: HotelOffer[];
  reasoning: string;
  savingsVnd?: number;
};

export type FormFillResult = {
  site: BookingSiteId;
  success: boolean;
  stoppedBeforePayment: boolean;
  /** true khi URL là trang checkout/book, không chỉ trang khách sạn */
  checkoutReached?: boolean;
  /** Giá từ trang checkout (sau thuế/phí) — chính xác hơn giá quét */
  checkoutTotalVnd?: number;
  searchPriceVnd?: number;
  fieldsFilled?: number;
  paymentUrl?: string;
  qrHint?: string;
  screenshotPath?: string;
  message: string;
  startedAt: string;
  finishedAt: string;
};

export type SiteScanLog = {
  site: BookingSiteId;
  searchUrl: string;
  startedAt: string;
  finishedAt: string;
  offerCount: number;
  status: "ok" | "empty" | "error";
  error?: string;
};

export type ActivityPhase =
  | "parse"
  | "search"
  | "compare"
  | "select"
  | "fill"
  | "payment"
  | "error";

export type ActivityLogEntry = {
  id: string;
  phase: ActivityPhase;
  label: string;
  at: string;
  detail?: string;
};

export type ConfirmedSteps = {
  search?: boolean;
  selection?: boolean;
  fill?: boolean;
};

export type InterruptKind =
  | "confirm_search"
  | "confirm_selection"
  | "confirm_fill"
  | "payment_handoff";

export type InterruptPayload = {
  kind: InterruptKind;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

export type HotelAgentState = {
  messages: BaseMessage[];
  threadId: string;
  userProfile: UserProfile | null;
  searchCriteria: SearchCriteria | null;
  searchPlanSummary: string | null;
  rawOffers: HotelOffer[];
  comparison: ComparisonResult | null;
  selectedOffer: HotelOffer | null;
  confirmedSteps: ConfirmedSteps;
  formFill: FormFillResult | null;
  siteScans: SiteScanLog[];
  activityLog: ActivityLogEntry[];
  lastInterrupt: InterruptPayload | null;
  error: string | null;
  step: string;
};

export const HotelAgentAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  threadId: Annotation<string>(),
  userProfile: Annotation<UserProfile | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  searchCriteria: Annotation<SearchCriteria | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  searchPlanSummary: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  rawOffers: Annotation<HotelOffer[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  comparison: Annotation<ComparisonResult | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  selectedOffer: Annotation<HotelOffer | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  confirmedSteps: Annotation<ConfirmedSteps>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
  formFill: Annotation<FormFillResult | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  siteScans: Annotation<SiteScanLog[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  activityLog: Annotation<ActivityLogEntry[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  lastInterrupt: Annotation<InterruptPayload | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  error: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  step: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "init",
  }),
});
