import { ApiError } from "@google/genai";
import { env } from "./env.js";
import {
  buildGeminiGenerationConfig,
  createAiStudioGenAIClient,
  getVertexGenAIClient,
  usesVertexGemini,
} from "./geminiClient.js";

let keyIndex = 0;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS_PER_KEY = 3;
const BASE_DELAY_MS = 900;

export function collectGeminiKeys(): string[] {
  const keys = [
    env.GEMINI_API_KEY_1,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.GEMINI_API_KEY,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k && k.length > 10));
  return [...new Set(keys)];
}

export function nextGeminiApiKey(): string {
  const keys = collectGeminiKeys();
  if (keys.length === 0) {
    throw new Error(
      "Thiếu Gemini API key. Đặt GEMINI_API_KEY_1..3 hoặc bật GEMINI_USE_VERTEX=true với GCP project."
    );
  }
  const key = keys[keyIndex % keys.length]!;
  keyIndex = (keyIndex + 1) % keys.length;
  return key;
}

export { parseModelJsonText } from "./json-parse.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fastModelsToTry(): string[] {
  const fast = env.GEMINI_FAST_MODEL?.trim() || "gemini-2.5-flash-lite";
  const fallback = env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash-lite";
  return [...new Set([fast, fallback].filter(Boolean))];
}

function isRetryable(status: number, message: string): boolean {
  if (RETRYABLE_STATUS.has(status)) return true;
  return /high demand|overloaded|unavailable|try again|resource exhausted|rate limit|quota/i.test(message);
}

type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; status: number; message: string };

function extractResponseText(response: {
  text?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  const direct = response.text?.trim();
  if (direct) return direct;
  return response.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

function errorStatus(e: unknown): { status: number; message: string } {
  if (e instanceof ApiError) {
    return { status: e.status ?? 503, message: e.message };
  }
  if (e instanceof Error && e.name === "TimeoutError") {
    return { status: 504, message: e.message };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return { status: 503, message: msg };
}

async function callGeminiModel(model: string, prompt: string, timeoutMs: number, apiKey?: string): Promise<GeminiResult> {
  const config = buildGeminiGenerationConfig(timeoutMs);

  try {
    const response = usesVertexGemini()
      ? await getVertexGenAIClient().models.generateContent({
          model,
          contents: prompt,
          config,
        })
      : await createAiStudioGenAIClient(apiKey ?? nextGeminiApiKey()).models.generateContent({
          model,
          contents: prompt,
          config,
        });

    const text = extractResponseText(response);
    if (!text.trim()) {
      return { ok: false, status: 502, message: "Gemini response missing text" };
    }
    return { ok: true, text };
  } catch (e) {
    const { status, message } = errorStatus(e);
    if (e instanceof Error && e.name === "TimeoutError") {
      return { ok: false, status: 504, message: `Timeout sau ${Math.round(timeoutMs / 1000)}s (${model})` };
    }
    return { ok: false, status, message };
  }
}

async function geminiGenerateWithModels(
  prompt: string,
  models: string[],
  timeoutMs: number,
  opts?: { maxAttemptsPerKey?: number; maxKeys?: number }
): Promise<string> {
  if (usesVertexGemini()) {
    return geminiGenerateWithModelsVertex(prompt, models, timeoutMs, opts);
  }

  const keys = collectGeminiKeys();
  if (keys.length === 0) {
    throw new Error("Thiếu Gemini API key. Đặt GEMINI_API_KEY_1..3 hoặc GEMINI_USE_VERTEX=true.");
  }

  const maxAttempts = opts?.maxAttemptsPerKey ?? MAX_ATTEMPTS_PER_KEY;
  const maxKeys = opts?.maxKeys ?? keys.length;

  let lastMessage = "Unknown Gemini error";
  let lastStatus = 503;
  const attemptsLog: string[] = [];

  for (const model of models) {
    for (let k = 0; k < maxKeys; k++) {
      const apiKey = keys[(keyIndex + k) % keys.length]!;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const result = await callGeminiModel(model, prompt, timeoutMs, apiKey);
        if (result.ok) {
          keyIndex = (keyIndex + k + 1) % keys.length;
          return result.text;
        }

        lastMessage = result.message;
        lastStatus = result.status;
        attemptsLog.push(`${model}/key${k + 1}:${result.status}`);

        if (!isRetryable(result.status, result.message)) break;

        const delay = BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 400);
        await sleep(delay);
      }
    }
  }

  keyIndex = (keyIndex + 1) % keys.length;
  throwGeminiFailure(lastStatus, lastMessage, attemptsLog, keys.length, models.length);
}

async function geminiGenerateWithModelsVertex(
  prompt: string,
  models: string[],
  timeoutMs: number,
  opts?: { maxAttemptsPerKey?: number }
): Promise<string> {
  const maxAttempts = opts?.maxAttemptsPerKey ?? MAX_ATTEMPTS_PER_KEY;
  let lastMessage = "Unknown Vertex Gemini error";
  let lastStatus = 503;
  const attemptsLog: string[] = [];

  for (const model of models) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await callGeminiModel(model, prompt, timeoutMs);
      if (result.ok) return result.text;

      lastMessage = result.message;
      lastStatus = result.status;
      attemptsLog.push(`${model}:vertex:${result.status}`);

      if (!isRetryable(result.status, result.message)) break;

      const delay = BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 400);
      await sleep(delay);
    }
  }

  throwGeminiFailure(lastStatus, lastMessage, attemptsLog, 1, models.length, "Vertex");
}

function throwGeminiFailure(
  lastStatus: number,
  lastMessage: string,
  attemptsLog: string[],
  keyCount: number,
  modelCount: number,
  backend = "Gemini"
): never {
  if (isRetryable(lastStatus, lastMessage)) {
    throw new Error(
      `${backend} đang quá tải (${lastStatus}). Vui lòng đợi 1–2 phút rồi thử lại. ` +
        `(Đã thử ${keyCount} key × ${modelCount} model: ${attemptsLog.slice(-6).join(", ")})`
    );
  }
  throw new Error(`${backend} API error ${lastStatus}: ${lastMessage}`);
}

/** Model nhanh (Flash Lite) — gợi ý địa điểm, tác vụ nhẹ (~1–3s). */
export async function geminiGenerateJsonFast(prompt: string): Promise<string> {
  return geminiGenerateWithModels(prompt, fastModelsToTry(), env.GEMINI_FAST_TIMEOUT_MS);
}

/** Skeleton staged — fail nhanh → fallback lịch khung nếu Gemini lỗi. */
export async function geminiGenerateJsonSkeleton(prompt: string): Promise<string> {
  const fast = env.GEMINI_FAST_MODEL?.trim() || "gemini-2.5-flash-lite";
  return geminiGenerateWithModels(prompt, [fast], env.GEMINI_SKELETON_TIMEOUT_MS, {
    maxAttemptsPerKey: 1,
    maxKeys: usesVertexGemini() ? undefined : 3,
  });
}

export function isGeminiQuotaOrRateLimitError(message: string): boolean {
  return /quota|rate limit|rate-limit|429|503|resource exhausted|too many requests|limit:\s*0|quá tải|overloaded|high demand/i.test(
    message
  );
}

export function isGeminiLlmFailure(message: string): boolean {
  return (
    isGeminiQuotaOrRateLimitError(message) ||
    /^Gemini (API error|skeleton|đang quá tải)/i.test(message) ||
    /^Vertex (API error|đang quá tải)/i.test(message) ||
    /Timeout sau \d+s \(gemini/i.test(message)
  );
}
