import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { collectGeminiKeys, getHotelAgentEnv } from "./env.js";

/**
 * Round-robin pool for 3 Gemini API keys — spreads quota / rate limits.
 */
export class GeminiKeyPool {
  private readonly keys: string[];
  private index = 0;
  private readonly failures = new Map<string, number>();

  constructor(keys?: string[]) {
    this.keys = keys ?? collectGeminiKeys();
    if (this.keys.length === 0) throw new Error("GeminiKeyPool: no API keys configured");
  }

  /** Next key in round-robin order */
  nextKey(): string {
    const key = this.keys[this.index]!;
    this.index = (this.index + 1) % this.keys.length;
    return key;
  }

  /** On 429/5xx, try another key before giving up */
  nextKeyAfterError(failedKey: string): string {
    const count = (this.failures.get(failedKey) ?? 0) + 1;
    this.failures.set(failedKey, count);
    return this.nextKey();
  }

  createChatModel(temperature = 0.2): ChatGoogleGenerativeAI {
    const env = getHotelAgentEnv();
    return new ChatGoogleGenerativeAI({
      apiKey: this.nextKey(),
      model: env.GEMINI_MODEL,
      temperature,
      maxRetries: 2,
    });
  }
}

let defaultPool: GeminiKeyPool | null = null;

export function getGeminiPool(): GeminiKeyPool {
  if (!defaultPool) defaultPool = new GeminiKeyPool();
  return defaultPool;
}
