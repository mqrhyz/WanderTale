/** Browser: gọi thẳng Fastify khi có NEXT_PUBLIC_API_URL (tránh proxy Next timeout / socket hang up). */
function apiBase(): string {
  const direct = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
  if (typeof window !== "undefined" && direct) return direct;
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") return "";
  return direct;
}

/** Base URL for API calls (empty string if unset — fetch may hit same-origin and fail). */
export function apiBaseUrl(): string {
  return apiBase();
}

/** Browser/network failures when calling the Fastify backend (often backend not running). */
export function isApiUnreachableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|socket hang up|ECONNRESET/i.test(error.message);
}

function parseApiErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `HTTP ${status}`;
  if (trimmed.startsWith("{")) {
    try {
      const j = JSON.parse(trimmed) as { error?: unknown; message?: string };
      if (typeof j.error === "string") return j.error;
      if (typeof j.message === "string") return j.message;
    } catch {
      /* fall through */
    }
  }
  if (/internal server error/i.test(trimmed)) {
    return "Máy chủ API lỗi hoặc mất kết nối giữa chừng (thường do tạo lịch quá lâu). Thử lại sau vài giây.";
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

export function describeApiLoadError(error: unknown): { summary: string; hint: string | null } {
  if (isApiUnreachableError(error)) {
    const origin = apiBaseUrl() || "http://127.0.0.1:8000 (mặc định từ PORT — đặt API_PUBLIC_URL khi deploy prod)";
    return {
      summary: "Không kết nối được máy chủ API.",
      hint: `Web đang gọi ${origin}. Hãy chạy backend: pnpm dev:api (cổng 8000) và pnpm dev:web (cổng 3000) cùng lúc, rồi tải lại trang.`,
    };
  }
  return {
    summary: error instanceof Error ? error.message : "Lỗi tải dữ liệu",
    hint: null,
  };
}

export async function apiFetch(path: string, accessToken: string, init?: RequestInit) {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseApiErrorBody(text, res.status));
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return res.text();
}
