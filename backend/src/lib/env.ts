import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load monorepo root `.env` (pnpm runs from `backend/` — Node does not auto-load parent .env).
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(8000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY_1: z.string().optional().default(""),
  GEMINI_API_KEY_2: z.string().optional().default(""),
  GEMINI_API_KEY_3: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  /** true = Vertex AI (quota GCP project). false = AI Studio API keys. */
  GEMINI_USE_VERTEX: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  GOOGLE_CLOUD_PROJECT: z.string().optional().default(""),
  /** Region Vertex — vd asia-southeast1, us-central1 */
  GOOGLE_CLOUD_LOCATION: z.string().default("asia-southeast1"),
  /** 0 = tắt thinking (Gemini 2.5 Flash Lite) — giảm latency & quota drain */
  GEMINI_THINKING_BUDGET: z.coerce.number().default(0),
  /** gemini = Google API (mặc định). ollama = model local qua Ollama. */
  LLM_PROVIDER: z.enum(["gemini", "ollama"]).default("gemini"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  /** Tên model sau `ollama pull` — ví dụ gemma-4-26b-a4b */
  OLLAMA_MODEL: z.string().default("gemma4:26b"),
  /** Model 26B local có thể mất vài phút / request */
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(600_000),
  /** Gemma 4 thinking mode — tắt để nhanh hơn (không sinh reasoning trước JSON). */
  OLLAMA_THINK: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  /** Model nhanh cho gợi ý địa điểm (~1–3s). Mặc định cùng Flash Lite. */
  GEMINI_FAST_MODEL: z.string().default("gemini-2.5-flash-lite"),
  /** Model dự phòng khi Gemini quá tải (503). */
  GEMINI_FALLBACK_MODEL: z.string().optional().default("gemini-2.5-flash-lite"),
  GEMINI_TIMEOUT_MS: z.coerce.number().default(120_000),
  GEMINI_FAST_TIMEOUT_MS: z.coerce.number().default(45_000),
  /** Skeleton lịch staged — 1 lần gọi LLM, timeout ngắn hơn. */
  GEMINI_SKELETON_TIMEOUT_MS: z.coerce.number().default(28_000),
  /** Hard deadline tổng khi quét OTA tạo lịch (ms). */
  TRIP_OTA_HARD_DEADLINE_MS: z.coerce.number().default(90_000),
  /** Bật cache OTA Supabase + memory. */
  TRIP_OTA_CACHE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** @deprecated Dùng TRIP_OTA_HARD_DEADLINE_MS */
  TRIP_OTA_SCAN_TIMEOUT_MS: z.coerce.number().default(20_000),
  /** Site OTA khi tạo lịch (vd booking hoặc booking,agoda,vntrip). */
  TRIP_OTA_SITES: z.string().default("booking,agoda,vntrip"),
  /** Số địa điểm tối đa quét Maps agent (agenda + khách sạn). */
  TRIP_MAPS_MEDIA_MAX: z.coerce.number().default(24),
  /** DuckDuckGo Image Search HTTP — tier chính, không cần API key. */
  TRIP_DDG_IMAGES_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  TRIP_DDG_IMAGES_CONCURRENCY: z.coerce.number().int().min(1).max(12).default(6),
  /** Tab Playwright song song khi lấy ảnh Maps (fallback sau Places Photos API). */
  TRIP_MAPS_BROWSER_CONCURRENCY: z.coerce.number().default(2),
  /** Google Places Photos — tier nhanh trước Playwright (cần GOOGLE_MAPS_API_KEY). */
  TRIP_PLACES_PHOTOS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** @deprecated Không còn timeout cắt agent — giữ để tương thích .env cũ. */
  TRIP_MAPS_MEDIA_DEADLINE_MS: z.coerce.number().default(180_000),
  /** P2: skeleton lịch trước, OTA enrich nền (202). */
  TRIP_STAGED_GENERATION: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  /** VietMap Maps API — geocode, autocomplete, static map (VN). */
  VIETMAP_API_KEY: z.string().optional().default(""),
  OPENWEATHER_API_KEY: z.string().optional().default(""),
  /** Pexels — ảnh cover thành phố cho danh sách chuyến đi. */
  PEXELS_API_KEY: z.string().optional().default(""),
  /** Optional token for Cloud Tasks/internal worker endpoint. */
  INTERNAL_WORKER_TOKEN: z.string().optional().default(""),
  // --- Marketplace payments / payout / media moderation ---
  /** true = mô phỏng capture thanh toán (chưa nối cổng thật). Đặt false khi tích hợp gateway. */
  PAYMENT_SIMULATION_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** Tỷ lệ hoa hồng mặc định của platform (%) khi business chưa có commission_rate riêng. */
  DEFAULT_PLATFORM_COMMISSION_RATE: z.coerce.number().min(0).max(100).default(10),
  /** true = tự động chuyển payout sang 'paid' ngay (simulation). false = admin/worker xử lý thủ công. */
  PAYOUT_AUTO_PROCESS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  /** true = mô phỏng chi trả payout (PayOS không làm disbursement). Đặt false khi nối provider chi trả thật. */
  PAYOUT_SIMULATION_MODE: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** true = media business cần admin duyệt (pending) trước khi hiển thị. */
  BUSINESS_MEDIA_MODERATION_REQUIRED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  // --- PayOS payment gateway (dùng khi PAYMENT_SIMULATION_MODE=false) ---
  PAYOS_CLIENT_ID: z.string().optional().default(""),
  PAYOS_API_KEY: z.string().optional().default(""),
  PAYOS_CHECKSUM_KEY: z.string().optional().default(""),
  /** PayOS API base. */
  PAYOS_API_BASE: z.string().default("https://api-merchant.payos.vn"),
  /** URL PayOS redirect khi thanh toán xong/huỷ (deep link app hoặc web). */
  PAYOS_RETURN_URL: z.string().default("https://wandertale.app/payment/success"),
  PAYOS_CANCEL_URL: z.string().default("https://wandertale.app/payment/cancel"),
  BACKEND_CORS_ORIGINS: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),
});

export type Env = z.infer<typeof envSchema>;

function hasGeminiKey(data: Env): boolean {
  return [data.GEMINI_API_KEY_1, data.GEMINI_API_KEY_2, data.GEMINI_API_KEY_3, data.GEMINI_API_KEY].some(
    (k) => k && k.trim().length > 10
  );
}

function hasVertexGemini(data: Env): boolean {
  return data.GEMINI_USE_VERTEX && data.GOOGLE_CLOUD_PROJECT.trim().length > 0;
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid env: ${parsed.error.message}`);
}
if (parsed.data.LLM_PROVIDER === "gemini" && !hasVertexGemini(parsed.data) && !hasGeminiKey(parsed.data)) {
  throw new Error(
    "LLM_PROVIDER=gemini: đặt GEMINI_USE_VERTEX=true + GOOGLE_CLOUD_PROJECT, hoặc GEMINI_API_KEY_1..3, hoặc LLM_PROVIDER=ollama."
  );
}
if (parsed.data.GEMINI_USE_VERTEX && !parsed.data.GOOGLE_CLOUD_PROJECT.trim()) {
  throw new Error("GEMINI_USE_VERTEX=true cần GOOGLE_CLOUD_PROJECT trong .env");
}

export const env: Env = parsed.data;

export function corsOrigins(): string[] {
  return env.BACKEND_CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
