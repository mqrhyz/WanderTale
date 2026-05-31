const USER_AGENT = "WanderTale/1.0 (travel itinerary; contact@wandertale.app)";

/** Chuẩn hóa URL ảnh agenda — HTTPS, Google Maps thumb lớn hơn. */
export function normalizeAgendaImageUrl(url: string): string {
  let u = url.trim().replace(/^http:\/\//i, "https://");
  if (u.includes("googleusercontent.com") && /=w\d+-h\d+/.test(u)) {
    u = u.replace(/=w\d+-h\d+[^&]*/, "=w800-h600-k-no");
  }
  return u;
}

/** HEAD request — Wikimedia trả 403/404 nếu URL hỏng hoặc thiếu User-Agent. */
export async function verifyAgendaImageUrl(url: string): Promise<boolean> {
  const normalized = normalizeAgendaImageUrl(url);
  try {
    const r = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/*,*/*",
      },
    });
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") ?? "";
    return ct.startsWith("image/") || ct.includes("octet-stream");
  } catch {
    return false;
  }
}

export async function filterValidImageUrls(urls: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const raw of urls) {
    const url = normalizeAgendaImageUrl(raw);
    if (
      url.includes("googleusercontent.com") ||
      url.includes("ggpht.com") ||
      url.includes("googleapis.com/maps/api/place")
    ) {
      out.push(url);
      continue;
    }
    if (await verifyAgendaImageUrl(url)) out.push(url);
  }
  return out;
}
