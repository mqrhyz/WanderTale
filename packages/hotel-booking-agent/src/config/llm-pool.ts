import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOllama } from "@langchain/ollama";
import { getGeminiPool } from "./gemini-pool.js";
import { getHotelAgentEnv } from "./env.js";

/** Chat model cho hotel agent — Ollama (gemma4) hoặc Gemini API. */
export function createHotelChatModel(temperature = 0.2): BaseChatModel {
  const env = getHotelAgentEnv();
  if (env.LLM_PROVIDER === "ollama") {
    return new ChatOllama({
      baseUrl: env.OLLAMA_BASE_URL.replace(/\/+$/, ""),
      model: env.OLLAMA_MODEL,
      temperature,
      numPredict: 4096,
      format: "json",
      think: env.OLLAMA_THINK === true,
    });
  }
  return getGeminiPool().createChatModel(temperature);
}
