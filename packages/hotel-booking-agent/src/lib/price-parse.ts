/** Parse Vietnamese / Western formatted price strings → VND integer */
export function parsePriceVnd(raw: string): number | null {
  const normalized = raw.replace(/\s/g, " ");
  const match = normalized.match(/([\d.,]+)\s*(?:₫|VND|đ)/i) ?? normalized.match(/([\d.,]+)/);
  if (!match?.[1]) return null;
  const cleaned = match[1].replace(/\./g, "").replace(/,/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 10_000 ? n : null;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

/** Ưu tiên giá tổng cho X đêm trên thẻ kết quả */
export function inferPriceNote(priceText: string, nights: number): string {
  const t = priceText.toLowerCase();
  if (/cho\s*\d+\s*đêm|for\s*\d+\s*night|tổng|total/i.test(t)) {
    return `tổng ${nights} đêm (có thể chưa gồm thuế/phí)`;
  }
  if (nights > 1) {
    return `ước tính từ trang tìm kiếm — checkout có thể cao hơn (thuế/phí/loại phòng)`;
  }
  return "từ trang tìm kiếm (có thể chưa gồm thuế/phí)";
}
