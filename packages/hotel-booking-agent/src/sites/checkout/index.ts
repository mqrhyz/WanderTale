import type { Page } from "playwright";
import type { BookingSiteId, HotelOffer } from "../../state.js";
import { dismissCookieBanner } from "../../lib/cookie-banner.js";
import { isCheckoutUrl } from "../../lib/ota-url.js";
import { bookingAdvanceToCheckout, fillBookingGuestFields } from "./booking.js";

export type CheckoutAdvanceResult = {
  reachedCheckout: boolean;
  steps: string[];
  blockedByLogin?: boolean;
  /** Trang checkout thực tế (popup mới hoặc page gốc) */
  checkoutPage?: Page;
};

export async function advanceToCheckout(page: Page, offer: HotelOffer): Promise<CheckoutAdvanceResult> {
  await dismissCookieBanner(page);

  switch (offer.site) {
    case "booking":
      return bookingAdvanceToCheckout(page);
    case "agoda":
      return agodaAdvance(page);
    case "vntrip":
      return vntripAdvance(page);
    default:
      return { reachedCheckout: false, steps: [] };
  }
}

export async function fillGuestFieldsForSite(
  page: Page,
  site: BookingSiteId,
  profile: { fullName: string; email: string; phone: string; specialRequests?: string }
): Promise<number> {
  if (site === "booking") {
    return fillBookingGuestFields(page, profile);
  }
  return fillGenericGuestFields(page, profile);
}

async function agodaAdvance(page: Page): Promise<CheckoutAdvanceResult> {
  const steps: string[] = [];
  const url = page.url();
  if (/search/i.test(url)) {
    const link = page.locator("[data-selenium='hotel-name'], .PropertyCard a, h3 a").first();
    if (await link.isVisible({ timeout: 6000 }).catch(() => false)) {
      await link.click({ timeout: 10_000 });
      await page.waitForLoadState("domcontentloaded");
      steps.push("mở_khách_sạn");
    }
  }
  const bookBtn = page
    .locator("button:has-text('Đặt'), button:has-text('Book'), [data-selenium='book-button']")
    .first();
  if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await bookBtn.click({ timeout: 12_000 }).catch(() => undefined);
    steps.push("đặt_phòng");
  }
  await page.waitForTimeout(2000);
  return { reachedCheckout: isCheckoutUrl(page.url(), "agoda"), steps };
}

async function vntripAdvance(page: Page): Promise<CheckoutAdvanceResult> {
  const steps: string[] = [];
  const bookBtn = page.locator("button:has-text('Đặt'), a:has-text('Đặt phòng')").first();
  if (await bookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await bookBtn.click({ timeout: 10_000 }).catch(() => undefined);
    steps.push("đặt_phòng");
  }
  await page.waitForTimeout(2000);
  return { reachedCheckout: isCheckoutUrl(page.url(), "vntrip"), steps };
}

async function fillGenericGuestFields(
  page: Page,
  profile: { fullName: string; email: string; phone: string; specialRequests?: string }
): Promise<number> {
  let filled = 0;
  const fields: { re: RegExp; value: string }[] = [
    { re: /họ.*tên|full name|tên khách/i, value: profile.fullName },
    { re: /email/i, value: profile.email },
    { re: /phone|điện thoại|mobile/i, value: profile.phone },
  ];
  for (const { re, value } of fields) {
    const byLabel = page.getByLabel(re).first();
    const byPh = page.getByPlaceholder(re).first();
    const input = (await byLabel.isVisible().catch(() => false)) ? byLabel : byPh;
    if (await input.isVisible().catch(() => false)) {
      await input.fill(value, { timeout: 4000 }).catch(() => undefined);
      filled += 1;
    }
  }
  return filled;
}
