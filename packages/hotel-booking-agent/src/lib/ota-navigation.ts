import type { Page } from "playwright";
import type { BookingSiteId } from "../state.js";
import { dismissCookieBanner } from "./cookie-banner.js";
import { dismissBookingPopups } from "./booking-popups.js";
import { dismissOverlays } from "./page-intercept.js";

/** URL có phải trang kết quả tìm kiếm OTA (không phải homepage). */
export function isOtaSearchResultsUrl(url: string, site: BookingSiteId): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (site === "booking") {
      return path.includes("searchresults") || Boolean(u.searchParams.get("ss"));
    }
    if (site === "agoda") {
      return path.includes("/search") || Boolean(u.searchParams.get("city") || u.searchParams.get("textToSearch"));
    }
    if (site === "vntrip") {
      return path.includes("tim-khach-san") || path.includes("/hotel") || path.includes("khach-san");
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Title trang chủ OTA — bot redirect hoặc goto quá sớm. */
export function looksLikeOtaHomepage(title: string, site: BookingSiteId): boolean {
  const t = title.trim().toLowerCase();
  if (!t) return false;
  if (/trang chính thức|official site|official website|tìm khách sạn giá rẻ bất cứ/i.test(t)) {
    return true;
  }
  if (site === "booking" && /booking\.com.*\|\s*khách sạn,\s*chuyến bay|hotels, flights, car/i.test(t)) {
    return true;
  }
  if (site === "agoda" && /agoda.*\|\s*miễn phí hủy|free cancellation.*booking offers/i.test(t)) {
    return true;
  }
  return false;
}

async function dismissSiteChrome(page: Page, site: BookingSiteId): Promise<void> {
  if (site === "booking") {
    await dismissBookingPopups(page);
  } else {
    await dismissCookieBanner(page);
    await dismissOverlays(page);
  }
}

/** Mở URL search OTA — retry nếu bị redirect về homepage. */
export async function gotoOtaSearch(
  page: Page,
  site: BookingSiteId,
  searchUrl: string,
  timeoutMs: number
): Promise<void> {
  let lastUrl = searchUrl;
  let lastTitle = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto(searchUrl, {
      waitUntil: attempt === 0 ? "domcontentloaded" : "load",
      timeout: timeoutMs,
    });
    await dismissSiteChrome(page, site);

    lastUrl = page.url();
    lastTitle = await page.title().catch(() => "");

    const onSearchPage = isOtaSearchResultsUrl(lastUrl, site);
    const onHomepage = looksLikeOtaHomepage(lastTitle, site);

    if (onSearchPage && !onHomepage) return;

    if (attempt === 0) {
      await page.waitForTimeout(site === "vntrip" ? 900 : 600);
      continue;
    }
  }

  if (!isOtaSearchResultsUrl(lastUrl, site) || looksLikeOtaHomepage(lastTitle, site)) {
    throw new Error(`Redirect về trang chủ thay vì kết quả tìm kiếm. "${lastTitle.slice(0, 60)}"`);
  }
}
