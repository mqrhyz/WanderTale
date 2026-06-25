import { env } from "./env.js";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

function getModel(): string {
  return env.MISTRAL_MODEL?.trim() || "mistral-small-latest";
}

function getApiKey(): string {
  const key = env.MISTRAL_API_KEY?.trim();
  if (!key) {
    throw new Error("Thiếu MISTRAL_API_KEY. Đặt MISTRAL_API_KEY trong .env hoặc Secret Manager.");
  }
  return key;
}

function getTimeoutMs(skeleton = false): number {
  if (skeleton) return env.MISTRAL_SKELETON_TIMEOUT_MS;
  return env.MISTRAL_FAST_TIMEOUT_MS;
}

/** Đơn giản rate limit 5 requests/giây. */
const requestTimestamps: number[] = [];
const RPS_LIMIT = 5;
const RPS_WINDOW_MS = 1_000;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < now - RPS_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RPS_LIMIT) {
    const wait = requestTimestamps[0]! + RPS_WINDOW_MS - now + 50;
    await new Promise((resolve) => setTimeout(resolve, Math.max(wait, 50)));
    return respectRateLimit();
  }
  requestTimestamps.push(now);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number, message: string): boolean {
  if (status === 429 || status >= 500) return true;
  return /rate limit|too many requests|timeout|overloaded|temporary|throttled/i.test(message);
}

type MistralResponse = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    total_tokens?: number;
  };
};

async function callMistral(
  prompt: string,
  maxTokens: number,
  timeoutMs: number,
  attempt = 0
): Promise<string> {
  await respectRateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          {
            role: "system",
            content:
              "Bạn là WanderTale, trợ lý lập lịch du lịch Việt Nam. Luôn trả về JSON hợp lệ duy nhất, không markdown, không giải thích.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const message = `Mistral API error ${response.status}: ${text.slice(0, 200)}`;
      if (attempt < 3 && isRetryable(response.status, message)) {
        await sleep(1_000 * 2 ** attempt + Math.floor(Math.random() * 500));
        return callMistral(prompt, maxTokens, timeoutMs, attempt + 1);
      }
      throw new Error(message);
    }

    const data = (await response.json()) as MistralResponse;
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      throw new Error("Mistral response missing content");
    }
    return content;
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("abort") || message.includes("Abort")) {
      throw new Error(`Mistral timeout sau ${Math.round(timeoutMs / 1000)}s`);
    }
    if (attempt < 3 && isRetryable(0, message)) {
      await sleep(1_000 * 2 ** attempt + Math.floor(Math.random() * 500));
      return callMistral(prompt, maxTokens, timeoutMs, attempt + 1);
    }
    throw error;
  }
}

export async function mistralGenerateJsonFast(prompt: string): Promise<string> {
  return callMistral(prompt, env.MISTRAL_MAX_TOKENS, getTimeoutMs(false));
}

export async function mistralGenerateJsonSkeleton(prompt: string): Promise<string> {
  return callMistral(prompt, env.MISTRAL_MAX_TOKENS, getTimeoutMs(true));
}
