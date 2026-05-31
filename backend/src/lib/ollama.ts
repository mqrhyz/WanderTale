import { env } from "./env.js";

const MAX_ATTEMPTS = 2;
const BASE_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseUrl(): string {
  return env.OLLAMA_BASE_URL.replace(/\/+$/, "");
}

function ollamaModel(): string {
  const model = env.OLLAMA_MODEL.trim();
  if (!model) {
    throw new Error("Thiếu OLLAMA_MODEL trong .env (ví dụ gemma4:26b).");
  }
  return model;
}

function chatBody(prompt: string, stream: boolean) {
  return {
    model: ollamaModel(),
    stream,
    format: "json" as const,
    think: env.OLLAMA_THINK === true,
    messages: [
      {
        role: "system" as const,
        content:
          "Travel assistant. Output ONE valid JSON object only. No markdown, no explanation, no thinking text.",
      },
      { role: "user" as const, content: prompt },
    ],
    options: {
      temperature: 0.25,
      num_predict: 16_384,
    },
  };
}

type OllamaChatResponse = {
  message?: { content?: string; thinking?: string };
  error?: string;
  done?: boolean;
};

function extractOllamaText(raw: OllamaChatResponse): string {
  return raw.message?.content?.trim() ?? "";
}

/** Gọi Ollama local (non-stream). */
export async function ollamaGenerateJson(prompt: string): Promise<string> {
  const url = `${baseUrl()}/api/chat`;
  let lastError = "Ollama request failed";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
        body: JSON.stringify(chatBody(prompt, false)),
      });

      const raw = (await res.json()) as OllamaChatResponse;

      if (!res.ok) {
        lastError = raw.error ?? `HTTP ${res.status}`;
        if (attempt + 1 < MAX_ATTEMPTS) {
          await sleep(BASE_DELAY_MS * (attempt + 1));
          continue;
        }
        throw new Error(`Ollama error ${res.status}: ${lastError}`);
      }

      const text = extractOllamaText(raw);
      if (!text) {
        const hadThinking = Boolean(raw.message?.thinking?.trim());
        lastError = hadThinking
          ? "Model trả thinking nhưng không có content — đặt OLLAMA_THINK=false"
          : "Ollama response missing content";
        if (attempt + 1 < MAX_ATTEMPTS) {
          await sleep(BASE_DELAY_MS);
          continue;
        }
        throw new Error(lastError);
      }
      return text;
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        throw new Error(`Ollama timeout sau ${Math.round(env.OLLAMA_TIMEOUT_MS / 1000)}s.`);
      }
      lastError = e instanceof Error ? e.message : String(e);
      if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(lastError)) {
        throw new Error(`Không kết nối Ollama tại ${baseUrl()}. Chạy \`ollama serve\` trước.`);
      }
      if (attempt + 1 < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * (attempt + 1));
        continue;
      }
      throw new Error(`Ollama: ${lastError}`);
    }
  }

  throw new Error(`Ollama: ${lastError}`);
}
