import type { Page } from "playwright";
import type { BookingSiteId, HotelOffer, SearchCriteria } from "../state.js";
import { getHotelAgentEnv } from "../config/env.js";
import { runBrowserScript } from "../browser/run-browser-script.js";
import { dismissCookieBanner } from "../lib/cookie-banner.js";
import { dismissBookingPopups } from "../lib/booking-popups.js";
import {
  dismissOverlays,
  scanWaitMsForSite,
  scanWaitMsForSiteLegacy,
} from "../lib/page-intercept.js";
import { dedupeRoomAmenities } from "../lib/room-amenities.js";
import { gotoOtaSearch } from "../lib/ota-navigation.js";
import { usesLiteScan } from "../lib/scan-mode.js";
import { nowIso } from "../lib/datetime.js";
import { inferPriceNote, nightsBetween, parsePriceVnd } from "../lib/price-parse.js";
import { isRealOtaUrl } from "../lib/ota-url.js";
import { SITE_ADAPTERS } from "../sites/registry.js";

export { parsePriceVnd } from "../lib/price-parse.js";

type LiteRaw = {
  hotelName: string;
  priceVnd: number;
  rating: number | null;
  bookingUrl: string;
  roomName: string;
  perks?: string[];
  imagePreviewUrl?: string;
  imagePreviewUrls?: string[];
};

function mergeImageUrls(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const u of list ?? []) {
      const key = u.split("?")[0];
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

function isHotelDetailUrl(offer: HotelOffer): boolean {
  const url = offer.bookingUrl.toLowerCase();
  if (offer.site === "booking") return url.includes("/hotel/");
  if (offer.site === "agoda") return url.includes("/hotel/") || url.includes("/partnership/");
  if (offer.site === "vntrip") return url.includes("/hotel") || url.includes("/khach-san");
  return false;
}

/** Lấy gallery ảnh từ trang chi tiết OTA (Booking/Agoda). */
async function scrapeOtaGallery(page: Page, url: string, max = 10): Promise<string[]> {
  try {
    const env = getHotelAgentEnv();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: Math.min(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS, 12_000),
    });
    if (url.includes("booking.com")) {
      await dismissBookingPopups(page);
    } else {
      await dismissCookieBanner(page);
      await dismissOverlays(page);
    }
    await page.waitForTimeout(400);
    const urls = await runBrowserScript<string[]>(page, "extract-hotel-gallery.js", { max });
    return Array.isArray(urls) ? urls.filter((u) => typeof u === "string" && u.startsWith("http")) : [];
  } catch {
    return [];
  }
}

/** Bổ sung gallery ảnh từ trang chi tiết Booking (chạy nền sau khi có giá). */
export async function enrichHotelOfferGalleries(
  offers: HotelOffer[],
  options?: { maxOffers?: number; minImages?: number; maxImages?: number }
): Promise<HotelOffer[]> {
  const maxOffers = options?.maxOffers ?? 6;
  const minImages = options?.minImages ?? 5;
  const maxImages = options?.maxImages ?? 10;
  const targets = offers.slice(0, maxOffers);
  const needsGallery = targets.some((o) => {
    const urls = mergeImageUrls(o.imagePreviewUrls, o.imagePreviewUrl ? [o.imagePreviewUrl] : undefined);
    return isHotelDetailUrl(o) && urls.length < minImages;
  });
  if (!needsGallery) return offers;

  const { withPage } = await import("./playwright-browser.js");
  return withPage(async (page) => {
    const enriched = await enrichBookingGalleries(page, targets, minImages, maxImages);
    const byUrl = new Map(enriched.map((o) => [o.bookingUrl, o]));
    return offers.map((o) => byUrl.get(o.bookingUrl) ?? o);
  });
}

async function enrichBookingGalleries(
  page: Page,
  offers: HotelOffer[],
  minImages = 5,
  maxImages = 10
): Promise<HotelOffer[]> {
  const out: HotelOffer[] = [];

  for (const o of offers) {
    let urls = mergeImageUrls(o.imagePreviewUrls, o.imagePreviewUrl ? [o.imagePreviewUrl] : undefined);

    if (isHotelDetailUrl(o) && urls.length < minImages) {
      const gallery = await scrapeOtaGallery(page, o.bookingUrl, maxImages);
      urls = mergeImageUrls(urls, gallery);
    }

    out.push({
      ...o,
      imagePreviewUrls: urls.length > 0 ? urls : undefined,
      imagePreviewUrl: urls[0] ?? o.imagePreviewUrl,
    });
  }

  return out;
}

/** Bổ sung tên phòng + tiện nghi từ trang chi tiết OTA. */
export async function enrichHotelOfferRoomInfo(
  offers: HotelOffer[],
  options?: { maxOffers?: number }
): Promise<HotelOffer[]> {
  const maxOffers = options?.maxOffers ?? 6;
  const targets = offers.slice(0, maxOffers);
  const needsRoomInfo = targets.some((o) => isHotelDetailUrl(o));
  if (!needsRoomInfo) return offers;

  const { withPage } = await import("./playwright-browser.js");
  return withPage(async (page) => {
    const enriched = await scrapeRoomInfoForOffers(page, targets);
    const byUrl = new Map(enriched.map((o) => [o.bookingUrl, o]));
    return offers.map((o) => byUrl.get(o.bookingUrl) ?? o);
  });
}

async function scrapeRoomInfoForOffers(page: Page, offers: HotelOffer[]): Promise<HotelOffer[]> {
  const env = getHotelAgentEnv();
  const out: HotelOffer[] = [];

  for (const o of offers) {
    if (!isHotelDetailUrl(o)) {
      out.push(o);
      continue;
    }

    let roomName = o.roomName;
    let perks = o.perks ?? [];

    if (isHotelDetailUrl(o)) {
      try {
        await page.goto(o.bookingUrl, {
          waitUntil: "domcontentloaded",
          timeout: Math.min(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS, 12_000),
        });
        if (o.bookingUrl.includes("booking.com")) {
          await dismissBookingPopups(page);
        } else {
          await dismissCookieBanner(page);
          await dismissOverlays(page);
        }
        await page.waitForTimeout(500);
        const info = await runBrowserScript<{ roomName?: string; perks?: string[] }>(
          page,
          "extract-room-info.js",
          { site: o.site }
        );
        if (info?.roomName && info.roomName.length > 2) roomName = info.roomName.slice(0, 120);
        if (info?.perks?.length) {
          perks = dedupeRoomAmenities([...(o.perks ?? []), ...info.perks], roomName);
        }
      } catch {
        /* giữ dữ liệu thẻ search */
      }
    }

    out.push({
      ...o,
      roomName: roomName || o.roomName,
      perks: perks.length > 0 ? dedupeRoomAmenities(perks, roomName || o.roomName) : o.perks,
    });
  }

  return out;
}

function enrichBookingUrl(url: string, criteria: SearchCriteria): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("checkin")) u.searchParams.set("checkin", criteria.checkIn);
    if (!u.searchParams.has("checkout")) u.searchParams.set("checkout", criteria.checkOut);
    if (!u.searchParams.has("group_adults")) u.searchParams.set("group_adults", String(criteria.adults));
    if (!u.searchParams.has("group_children")) u.searchParams.set("group_children", String(criteria.children));
    if (!u.searchParams.has("no_rooms")) u.searchParams.set("no_rooms", String(criteria.rooms));
    return u.href;
  } catch {
    return url;
  }
}

const NAME_NOISE_RE =
  /(Mở trong cửa sổ mới|Opens in (a )?new window|Mở liên kết|Mới mở)\s*$/i;

function cleanHotelName(name: string): string {
  return name
    .replace(NAME_NOISE_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 140);
}

function mapLiteToOffers(
  site: BookingSiteId,
  raw: LiteRaw[],
  criteria: SearchCriteria,
  max: number
): HotelOffer[] {
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const offers: HotelOffer[] = [];

  for (const row of raw) {
    if (!row.priceVnd || !row.hotelName) continue;
    const hotelName = cleanHotelName(row.hotelName);
    if (hotelName.length < 2) continue;
    let bookingUrl = row.bookingUrl;
    if (site === "booking" && bookingUrl.includes("/hotel/")) {
      bookingUrl = enrichBookingUrl(bookingUrl, criteria);
    }
    if (!isRealOtaUrl(bookingUrl, site)) continue;

    const cardUrls = mergeImageUrls(row.imagePreviewUrls, row.imagePreviewUrl ? [row.imagePreviewUrl] : undefined);

    offers.push({
      site,
      hotelName,
      roomName: row.roomName || "Giá trên trang tìm kiếm",
      perks: row.perks?.length ? dedupeRoomAmenities(row.perks) : undefined,
      priceVnd: row.priceVnd,
      currency: "VND",
      rating: row.rating ?? undefined,
      location: criteria.city,
      bookingUrl,
      imagePreviewUrl: cardUrls[0],
      imagePreviewUrls: cardUrls.length > 0 ? cardUrls : undefined,
      scrapedAt: nowIso(),
      confidence: 0.88,
      nights,
      priceNote: inferPriceNote("", nights),
    });
    if (offers.length >= max) break;
  }
  return offers;
}

/**
 * Quét nhẹ Booking: domcontentloaded + chặn CSS + popup dismiss.
 */
export async function extractOffersLite(
  page: Page,
  site: BookingSiteId,
  criteria: SearchCriteria,
  searchUrl: string
): Promise<HotelOffer[]> {
  const env = getHotelAgentEnv();
  const max = env.HOTEL_AGENT_MAX_OFFERS_PER_SITE;
  const adapter = SITE_ADAPTERS[site];
  const scanWait = scanWaitMsForSite(site, env.HOTEL_AGENT_SCAN_WAIT_MS);

  await gotoOtaSearch(page, site, searchUrl, env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);

  return extractAfterNavigation(page, site, criteria, searchUrl, max, adapter, scanWait, "lite");
}

/**
 * Quét legacy Agoda/Vntrip: domcontentloaded → chờ selector giá (không networkidle).
 */
export async function extractOffersLegacy(
  page: Page,
  site: BookingSiteId,
  criteria: SearchCriteria,
  searchUrl: string
): Promise<HotelOffer[]> {
  const env = getHotelAgentEnv();
  const max = env.HOTEL_AGENT_MAX_OFFERS_PER_SITE;
  const adapter = SITE_ADAPTERS[site];
  const scanWait = scanWaitMsForSiteLegacy(site, env.HOTEL_AGENT_LEGACY_SCAN_WAIT_MS);

  await gotoOtaSearch(page, site, searchUrl, env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
  await waitForPriceSignals(page, site, scanWait);
  await dismissOverlays(page);

  return extractAfterNavigation(page, site, criteria, searchUrl, max, adapter, scanWait, "legacy");
}

async function waitForPriceSignals(page: Page, site: BookingSiteId, scanWait: number): Promise<void> {
  const cardSelector =
    site === "agoda"
      ? "[data-selenium='hotel-item'], [data-element-name='property-card'], [data-testid='property-card']"
      : ".listHotel__item, .hotel-item, [class*='HotelCard'], [class*='hotel-card'], article";

  const priceSelector =
    '[data-testid*="price"], [data-selenium*="price"], [data-element-name*="price"], [class*="price"], [class*="Price"]';

  await Promise.all([
    page.locator(cardSelector).first().waitFor({ state: "attached", timeout: scanWait }).catch(() => undefined),
    page.locator(priceSelector).first().waitFor({ state: "visible", timeout: scanWait }).catch(() => undefined),
    page.getByText(/₫|VND|đ\b/).first().waitFor({ state: "visible", timeout: scanWait }).catch(() => undefined),
  ]);
}

/** Chọn lite (Booking) hoặc legacy (Agoda/Vntrip). */
export async function extractOffersForSite(
  page: Page,
  site: BookingSiteId,
  criteria: SearchCriteria,
  searchUrl: string
): Promise<HotelOffer[]> {
  return usesLiteScan(site)
    ? extractOffersLite(page, site, criteria, searchUrl)
    : extractOffersLegacy(page, site, criteria, searchUrl);
}

async function extractAfterNavigation(
  page: Page,
  site: BookingSiteId,
  criteria: SearchCriteria,
  searchUrl: string,
  max: number,
  adapter: (typeof SITE_ADAPTERS)[BookingSiteId],
  scanWait: number,
  mode: "lite" | "legacy"
): Promise<HotelOffer[]> {
  const cardSelector =
    site === "booking"
      ? "[data-testid='property-card'], [data-testid='property-card-container']"
      : site === "agoda"
        ? "[data-selenium='hotel-item'], [data-element-name='property-card'], [data-testid='property-card']"
        : ".listHotel__item, .hotel-item, [class*='HotelCard'], [class*='hotel-card'], article";

  const priceSelector =
    '[data-testid*="price"], [data-selenium*="price"], [data-element-name*="price"], [class*="price"], [class*="Price"]';

  const priceTextTimeout = mode === "legacy" ? 5_000 : 3_000;

  await Promise.all([
    page.locator(cardSelector).first().waitFor({ state: "attached", timeout: scanWait }).catch(() => undefined),
    page.locator(priceSelector).first().waitFor({ state: "visible", timeout: scanWait }).catch(() => undefined),
    page.getByText(/₫|VND|đ\b/).first().waitFor({ state: "visible", timeout: priceTextTimeout }).catch(() => undefined),
  ]);

  if (site === "vntrip") {
    const scrollY = mode === "legacy" ? 500 : 400;
    const pauseMs = mode === "legacy" ? 600 : 150;
    await page.evaluate((y) => window.scrollBy(0, y), scrollY).catch(() => undefined);
    await page.waitForTimeout(pauseMs);
  }

  const raw = await runBrowserScript<LiteRaw[]>(page, "extract-offers-lite.js", {
    site,
    limit: max * 2,
    baseUrl: searchUrl,
  });

  let offers = mapLiteToOffers(site, raw, criteria, max);

  if (offers.length === 0) {
    await page.waitForTimeout(mode === "legacy" ? 800 : 250);
    await dismissOverlays(page);
    const rawRetry = await runBrowserScript<LiteRaw[]>(page, "extract-offers-lite.js", {
      site,
      limit: max * 2,
      baseUrl: searchUrl,
    });
    offers = mapLiteToOffers(site, rawRetry, criteria, max);
  }

  if (offers.length === 0) {
    offers = await extractWithSelectorsFallback(page, site, criteria, searchUrl, max);
  }

  if (offers.length === 0) {
    const title = await page.title().catch(() => "");
    throw new Error(`${adapter.label}: không trích được giá. "${title.slice(0, 60)}"`);
  }

  return offers;
}

/** Fallback tối thiểu — không scroll */
async function extractWithSelectorsFallback(
  page: Page,
  site: BookingSiteId,
  criteria: SearchCriteria,
  url: string,
  max: number
): Promise<HotelOffer[]> {
  const adapter = SITE_ADAPTERS[site];
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const offers: HotelOffer[] = [];

  for (const priceSel of adapter.priceSelectors) {
    const priceEls = page.locator(priceSel);
    const count = await priceEls.count();
    if (count === 0) continue;

    for (let i = 0; i < Math.min(count, max); i++) {
      const priceEl = priceEls.nth(i);
      const priceText = (await priceEl.innerText().catch(() => "")).trim();
      const priceVnd = parsePriceVnd(priceText);
      if (!priceVnd) continue;

      let hotelName = "";
      for (const nameSel of adapter.nameSelectors) {
        const text = (await page.locator(nameSel).nth(i).innerText().catch(() => "")).trim();
        if (text.length > 2) {
          hotelName = text.slice(0, 140);
          break;
        }
      }
      if (!hotelName) continue;

      const href = await priceEl.locator("xpath=ancestor::a[1]").first().getAttribute("href").catch(() => null);
      let bookingUrl = href ? (href.startsWith("http") ? href : new URL(href, url).href) : url;
      if (site === "booking") bookingUrl = enrichBookingUrl(bookingUrl, criteria);
      if (!isRealOtaUrl(bookingUrl, site)) continue;

      offers.push({
        site,
        hotelName,
        priceVnd,
        currency: "VND",
        location: criteria.city,
        bookingUrl,
        scrapedAt: nowIso(),
        confidence: 0.7,
        nights,
        priceNote: inferPriceNote(priceText, nights),
      });
    }
    if (offers.length > 0) break;
  }
  return offers;
}

