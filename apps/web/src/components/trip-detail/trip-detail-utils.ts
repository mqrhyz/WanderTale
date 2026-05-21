import type { BookingSuggestion } from "@wander-tale/shared/types";

export function formatVnd(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

export function inferPlaceCategory(title: string, summary?: string | null): string {
  const text = `${title} ${summary ?? ""}`.toLowerCase();
  if (/ăn|quán|nhà hàng|food|cafe|coffee|bún|phở|restaurant|ẩm thực/.test(text)) return "Ẩm thực";
  if (/chợ|market|mua sắm|shopping/.test(text)) return "Mua sắm";
  if (/bảo tàng|museum|văn hóa|culture|đình|chùa|di tích/.test(text)) return "Văn hóa";
  if (/biển|beach|trek|núi|park|công viên|thác/.test(text)) return "Thiên nhiên";
  if (/bar|pub|night|đêm/.test(text)) return "Giải trí";
  return "Tham quan";
}

export function parseHotelRating(reason?: string, priceLevel?: number): number {
  const m = reason?.match(/★([\d.]+)/);
  if (m) return Math.min(5, Math.max(1, Math.round(parseFloat(m[1]!))));
  if (priceLevel != null) return Math.min(5, Math.max(3, priceLevel + 2));
  return 4;
}

export function siteLabel(site?: string): string {
  if (!site) return "OTA";
  const s = site.toLowerCase();
  if (s.includes("booking")) return "Booking";
  if (s.includes("agoda")) return "Agoda";
  if (s.includes("vntrip")) return "Vntrip";
  return site;
}

export function splitHotels(hotels: BookingSuggestion[]): {
  recommended: BookingSuggestion | null;
  alternatives: BookingSuggestion[];
} {
  if (hotels.length === 0) return { recommended: null, alternatives: [] };
  const idx = hotels.findIndex(
    (h) => h.reason?.includes("Đề xuất") || h.reason?.includes("Gợi ý")
  );
  const recIdx = idx >= 0 ? idx : 0;
  const recommended = hotels[recIdx] ?? null;
  const alternatives = hotels.filter((_, i) => i !== recIdx);
  return { recommended, alternatives };
}
