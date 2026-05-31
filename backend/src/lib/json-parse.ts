/** Trích và parse JSON từ output LLM (Gemini / Ollama / Gemma). */
export function parseModelJsonText(text: string): unknown {
  const candidates = extractJsonCandidates(text);
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    for (const attempt of [candidate, repairJson(candidate), tryCloseTruncatedJson(candidate)]) {
      if (!attempt) continue;
      try {
        return JSON.parse(attempt) as unknown;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
  }

  const preview = text.replace(/\s+/g, " ").trim().slice(0, 280);
  throw new Error(
    lastError
      ? `JSON parse failed: ${lastError.message}. Preview: ${preview}…`
      : `No JSON object found. Preview: ${preview}…`
  );
}

function extractJsonCandidates(text: string): string[] {
  let t = text.trim();
  if (!t) return [];

  // Gemma thinking / reasoning blocks (inline or tagged)
  t = t.replace(/<think[\s\S]*?<\/think>/gi, "").trim();
  t = t.replace(/^thinking:[\s\S]*?(?=\{)/im, "").trim();

  const out: string[] = [];

  for (const m of t.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const block = m[1]?.trim();
    if (block) out.push(block);
  }

  out.push(t);

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    out.push(t.slice(start, end + 1));
  }

  // Nested object scan — first balanced `{...}` from each `{`
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "{") continue;
    const slice = sliceBalancedJson(t, i);
    if (slice) out.push(slice);
  }

  return [...new Set(out.filter((s) => s.length > 1))];
}

function sliceBalancedJson(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repairJson(s: string): string {
  let j = s.trim();
  // Trailing commas
  j = j.replace(/,\s*([}\]])/g, "$1");
  // Smart quotes → ASCII
  j = j.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  return j;
}

/** Khi model cắt giữa chừng (hết num_predict) — đóng ngoặc dư. */
function tryCloseTruncatedJson(s: string): string | null {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let j = s.slice(start).trim();

  const openBrace = (j.match(/\{/g) ?? []).length;
  const closeBrace = (j.match(/\}/g) ?? []).length;
  const openBracket = (j.match(/\[/g) ?? []).length;
  const closeBracket = (j.match(/\]/g) ?? []).length;

  if (openBrace <= closeBrace && openBracket <= closeBracket) return null;

  // Cắt dở giữa string — bỏ token cuối không hoàn chỉnh
  j = j.replace(/,\s*"[^"]*$/, "");
  j = j.replace(/,\s*[^,[\]{}\s][^,[\]{}\n]*$/, "");

  if (openBracket > closeBracket) j += "]".repeat(openBracket - closeBracket);
  if (openBrace > closeBrace) j += "}".repeat(openBrace - closeBrace);

  return j;
}
