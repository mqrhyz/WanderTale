import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import { env } from "./env.js";

let vertexClient: GoogleGenAI | null = null;

/** Vertex AI — quota theo GCP project, auth qua ADC / GOOGLE_APPLICATION_CREDENTIALS. */
export function getVertexGenAIClient(): GoogleGenAI {
  if (!vertexClient) {
    vertexClient = new GoogleGenAI({
      vertexai: true,
      project: env.GOOGLE_CLOUD_PROJECT,
      location: env.GOOGLE_CLOUD_LOCATION,
    });
  }
  return vertexClient;
}

/** AI Studio — một API key mỗi client (xoay key ở tầng gọi). */
export function createAiStudioGenAIClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export function usesVertexGemini(): boolean {
  return env.GEMINI_USE_VERTEX;
}

/** JSON + tắt thinking (tránh latency spike & drain quota trên 2.5 Flash). */
export function buildGeminiGenerationConfig(timeoutMs: number): GenerateContentConfig {
  return {
    responseMimeType: "application/json",
    temperature: 0.35,
    thinkingConfig: {
      thinkingBudget: env.GEMINI_THINKING_BUDGET,
    },
    abortSignal: AbortSignal.timeout(timeoutMs),
  };
}
