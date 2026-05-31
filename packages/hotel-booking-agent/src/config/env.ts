import { z } from "zod";
import type { BookingSiteId } from "../state.js";
import { ALL_SITES } from "../sites/registry.js";

const siteIdSchema = z.enum(["booking", "agoda", "vntrip"]);

const envSchema = z.object({
  GEMINI_API_KEY_1: z.string().min(1).optional(),
  GEMINI_API_KEY_2: z.string().min(1).optional(),
  GEMINI_API_KEY_3: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  LLM_PROVIDER: z.enum(["gemini", "ollama"]).default("gemini"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("gemma4:26b"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().default(600_000),
  OLLAMA_THINK: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  HOTEL_AGENT_HEADLESS: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** Agoda/Vntrip legacy: headless mặc định (ẩn cửa sổ Chromium). */
  HOTEL_AGENT_HEADLESS_LEGACY: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  HOTEL_AGENT_DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS: z.coerce.number().default(30_000),
  HOTEL_AGENT_MAX_OFFERS_PER_SITE: z.coerce.number().default(3),
  HOTEL_AGENT_SCREENSHOT_DIR: z.string().default(".hotel-agent-screenshots"),
  /** Quét giá: chặn image/font/CSS — tắt bằng HOTEL_AGENT_BLOCK_RESOURCES=false */
  HOTEL_AGENT_BLOCK_RESOURCES: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** Chờ selector giá (ms) sau domcontentloaded — Booking lite */
  HOTEL_AGENT_SCAN_WAIT_MS: z.coerce.number().default(5_000),
  /** Chờ selector giá (ms) — Agoda/Vntrip legacy (networkidle + SPA) */
  HOTEL_AGENT_LEGACY_SCAN_WAIT_MS: z.coerce.number().default(8_000),
  /** Retry full-page legacy khi site trống/lỗi */
  HOTEL_AGENT_SCAN_RETRY: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
  /** Max Playwright jobs per Node process. Keep 1 while browser lifecycle is global. */
  HOTEL_AGENT_MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(4).default(1),
  /** Whole agent browser job timeout, including queue wait. Trip scrape cần ≥ hard deadline + buffer. */
  HOTEL_AGENT_JOB_TIMEOUT_MS: z.coerce.number().default(120_000),
  /** Danh sách site: booking,agoda — mặc định cả 4 */
  HOTEL_AGENT_SITES: z
    .string()
    .optional()
    .transform((v) => {
      if (!v?.trim()) return undefined;
      return v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }),
});

export type HotelAgentEnv = z.infer<typeof envSchema>;

let cached: HotelAgentEnv | null = null;

export function getHotelAgentEnv(): HotelAgentEnv {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}

export function getActiveScanSites(): BookingSiteId[] {
  const raw = getHotelAgentEnv().HOTEL_AGENT_SITES;
  if (!raw?.length) return ALL_SITES;
  const valid = raw.filter((s): s is BookingSiteId => siteIdSchema.safeParse(s).success);
  return valid.length > 0 ? valid : ALL_SITES;
}

export function collectGeminiKeys(): string[] {
  const env = getHotelAgentEnv();
  const keys = [env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3, env.GEMINI_API_KEY].filter(
    (k): k is string => Boolean(k?.trim())
  );
  if (keys.length === 0) {
    throw new Error(
      "Thiếu Gemini API key. Đặt GEMINI_API_KEY_1..3 (round-robin) hoặc GEMINI_API_KEY trong .env"
    );
  }
  return keys;
}
