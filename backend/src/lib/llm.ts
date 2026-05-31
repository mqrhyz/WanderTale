import { env } from "./env.js";
import { geminiGenerateJsonFast, geminiGenerateJsonSkeleton } from "./gemini.js";
import { parseModelJsonText } from "./json-parse.js";
import { ollamaGenerateJson } from "./ollama.js";

export { parseModelJsonText };

export function isOllamaProvider(): boolean {
  return env.LLM_PROVIDER === "ollama";
}

/** Giới hạn context JSON đưa vào prompt — Ollama local dễ cắt JSON nếu prompt quá dài. */
export function llmContextCharLimit(): number {
  return isOllamaProvider() ? 2500 : 12_000;
}

/** Tác vụ nhẹ (gợi ý địa điểm) — Flash ~1–3s thay vì Gemma 26B ~20s+. */
export async function llmGenerateJsonFast(prompt: string): Promise<string> {
  if (env.LLM_PROVIDER === "ollama") {
    return ollamaGenerateJson(prompt);
  }
  return geminiGenerateJsonFast(prompt);
}

/** Skeleton staged — một lần gọi, prompt ngắn, timeout ~28s. */
export async function llmGenerateJsonSkeleton(prompt: string): Promise<string> {
  if (env.LLM_PROVIDER === "ollama") {
    return ollamaGenerateJson(prompt);
  }
  return geminiGenerateJsonSkeleton(prompt);
}
