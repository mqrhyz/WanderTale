export function normalizeHotelName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Khớp tên KS OTA với gợi ý VietMap / user. */
export function hotelNameMatches(offerName: string, hint: string): boolean {
  const na = normalizeHotelName(offerName);
  const nb = normalizeHotelName(hint);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter((t) => t.length > 2));
  const tb = nb.split(" ").filter((t) => t.length > 2);
  if (ta.size === 0 || tb.length === 0) return false;
  const overlap = tb.filter((t) => ta.has(t)).length;
  return overlap / Math.max(tb.length, 1) >= 0.5;
}

export function offerMatchesAnyHint(offerName: string, hints?: string[]): boolean {
  if (!hints?.length) return true;
  return hints.some((h) => hotelNameMatches(offerName, h));
}
