import type { ComparisonResult, HotelOffer, SearchCriteria } from "../state.js";
import type { BookingSiteId } from "../state.js";
import { SITE_ADAPTERS } from "../sites/registry.js";
import { offerMatchesAnyHint } from "../lib/hotel-name-match.js";

export type ComparePricesInput = {
  offers: HotelOffer[];
  criteria: SearchCriteria;
};

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

/** Xếp hạng: khớp tên KS gợi ý → giá ↑ → rating ↓ */
function rankOffers(offers: HotelOffer[], criteria: SearchCriteria): HotelOffer[] {
  let list = [...offers];
  const hints = criteria.hotelNameHints?.length
    ? criteria.hotelNameHints
    : criteria.hotelNameHint
      ? [criteria.hotelNameHint]
      : undefined;

  if (hints?.length) {
    const matched = list.filter((o) => offerMatchesAnyHint(o.hotelName, hints));
    if (matched.length > 0) list = matched;
  }

  if (criteria.budgetVnd) {
    const within = list.filter((o) => o.priceVnd <= criteria.budgetVnd!);
    if (within.length > 0) list = within;
  }

  return list.sort((a, b) => {
    const aHint = hints ? offerMatchesAnyHint(a.hotelName, hints) : false;
    const bHint = hints ? offerMatchesAnyHint(b.hotelName, hints) : false;
    if (aHint !== bHint) return aHint ? -1 : 1;
    if (a.priceVnd !== b.priceVnd) return a.priceVnd - b.priceVnd;
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (ra !== rb) return rb - ra;
    return b.confidence - a.confidence;
  });
}

function cheapestPerSite(offers: HotelOffer[]): Map<BookingSiteId, HotelOffer> {
  const map = new Map<BookingSiteId, HotelOffer>();
  for (const o of offers) {
    const cur = map.get(o.site);
    if (!cur || o.priceVnd < cur.priceVnd) map.set(o.site, o);
  }
  return map;
}

function offerKey(o: HotelOffer): string {
  return `${o.site}:${o.bookingUrl}:${o.priceVnd}`;
}

/** Gợi ý hiển thị: rẻ nhất chung + ít nhất 1 offer / site quét được. */
function buildAlternatives(
  recommended: HotelOffer,
  sorted: HotelOffer[],
  perSite: Map<BookingSiteId, HotelOffer>,
  maxAlternatives = 5
): HotelOffer[] {
  const seen = new Set<string>();
  const picked: HotelOffer[] = [];

  const tryAdd = (o: HotelOffer | undefined) => {
    if (!o) return;
    const key = offerKey(o);
    if (seen.has(key)) return;
    seen.add(key);
    picked.push(o);
  };

  tryAdd(recommended);

  for (const o of [...perSite.values()].sort((a, b) => a.priceVnd - b.priceVnd)) {
    tryAdd(o);
    if (picked.length >= maxAlternatives + 1) break;
  }

  for (const o of sorted) {
    tryAdd(o);
    if (picked.length >= maxAlternatives + 1) break;
  }

  return picked.slice(1);
}

function buildReasoning(
  recommended: HotelOffer,
  sorted: HotelOffer[],
  perSite: Map<BookingSiteId, HotelOffer>,
  savingsVnd: number
): string {
  const siteCount = perSite.size;
  const lines: string[] = [
    `So sánh **${sorted.length}** phòng từ **${siteCount}** web (thuật toán, không dùng AI).`,
    `Rẻ nhất: **${recommended.hotelName}** trên ${SITE_ADAPTERS[recommended.site].label} — ${formatVnd(recommended.priceVnd)}${recommended.rating ? ` · ★${recommended.rating}` : ""}.`,
  ];

  if (savingsVnd > 0) {
    lines.push(`Chênh lệch so với offer đắt nhất trong danh sách: ~${formatVnd(savingsVnd)}.`);
  }

  const siteLines = [...perSite.entries()]
    .sort((a, b) => a[1].priceVnd - b[1].priceVnd)
    .map(([id, o]) => `• ${SITE_ADAPTERS[id].label}: ${o.hotelName} — ${formatVnd(o.priceVnd)}`);

  if (siteLines.length > 1) {
    lines.push("Giá thấp nhất mỗi web:", ...siteLines);
  }

  lines.push("Giá từ trang tìm kiếm — checkout có thể cao hơn (thuế/phí/loại phòng).");
  return lines.join("\n");
}

/**
 * So sánh giá giữa các OTA — 100% code, không gọi Gemini.
 */
export async function comparePrices(input: ComparePricesInput): Promise<ComparisonResult> {
  const { offers, criteria } = input;
  if (offers.length === 0) {
    throw new Error("Không có offer để so sánh");
  }

  const sorted = rankOffers(offers, criteria);
  const recommended = sorted[0]!;
  const perSite = cheapestPerSite(offers);
  const alternatives = buildAlternatives(recommended, sorted, perSite, 5);
  const expensive = sorted[sorted.length - 1]!;
  const savingsVnd = Math.max(0, expensive.priceVnd - recommended.priceVnd);
  const reasoning = buildReasoning(recommended, sorted, perSite, savingsVnd);

  return { recommended, alternatives, reasoning, savingsVnd };
}
