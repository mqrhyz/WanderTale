import type { Page } from "playwright";
import { runBrowserScript } from "../../browser/run-browser-script.js";
import { dismissCookieBanner } from "../../lib/cookie-banner.js";
import { parsePriceVnd } from "../../lib/price-parse.js";
import { splitVietnameseName } from "../../lib/vietnamese-name.js";
import { isCheckoutUrl } from "../../lib/ota-url.js";

export type CheckoutAdvanceResult = {
  reachedCheckout: boolean;
  steps: string[];
  blockedByLogin?: boolean;
  /** Trang checkout thực tế (có thể là popup mới) */
  checkoutPage?: Page;
};

async function clickReserve(page: Page): Promise<{ clicked: boolean; popup: Page | null }> {
  const candidates = [
    page.locator("#hcta"),
    page.getByRole("button", { name: /Tôi sẽ đặt/i }),
    page.getByRole("button", { name: /I'll reserve/i }),
    page.locator("[data-testid='reservation-cta']"),
    page.locator(".bui-button--primary").filter({ hasText: /đặt/i }),
  ];

  for (const btn of candidates) {
    if (!(await btn.first().isVisible({ timeout: 2000 }).catch(() => false))) continue;
    if (await btn.first().isDisabled().catch(() => false)) continue;

    const popupPromise = page.context().waitForEvent("page", { timeout: 12_000 }).catch(() => null);
    await btn.first().click({ timeout: 15_000 }).catch(() => undefined);
    const popup = await popupPromise;
    if (popup) {
      await popup.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
      await popup.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
      return { clicked: true, popup };
    }
    return { clicked: true, popup: null };
  }
  return { clicked: false, popup: null };
}

export async function bookingAdvanceToCheckout(page: Page): Promise<CheckoutAdvanceResult> {
  const steps: string[] = [];
  await dismissCookieBanner(page);

  let url = page.url();
  let checkoutPage: Page | null = null;

  if (/searchresults\.html/i.test(url)) {
    const hotelLink = page
      .locator('[data-testid="property-card"] a[data-testid="title-link"], h3 a')
      .first();
    if (await hotelLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await hotelLink.click({ timeout: 12_000 });
      await page.waitForLoadState("domcontentloaded");
      steps.push("mở_trang_khách_sạn");
      url = page.url();
    }
  }

  if (/\/hotel\//i.test(url) && !isCheckoutUrl(url, "booking")) {
    await page
      .waitForSelector("table.hprt-table, #hprt-table, #hp_availability", { timeout: 15_000 })
      .catch(() => undefined);

    await runBrowserScript(page, "scroll-availability.js");
    await page.waitForTimeout(500);

    const roomPick = await runBrowserScript<{ ok: boolean }>(page, "select-booking-room.js");
    if (roomPick.ok) steps.push("chọn_phòng");

    await page.waitForTimeout(800);
    await page.locator("#hcta:not([disabled])").waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);

    const reserveResult = await clickReserve(page);
    if (reserveResult.clicked) steps.push("bấm_tôi_sẽ_đặt");

    if (reserveResult.popup) {
      checkoutPage = reserveResult.popup;
      steps.push("mở_popup_checkout");
    } else {
      // Không có popup → đợi page hiện tại navigate sang book.html
      await Promise.race([
        page.waitForURL(/book\.html|secure\.booking\.com/i, { timeout: 30_000 }),
        page.getByText(/Nhập thông tin chi tiết|Enter your details/i).waitFor({ timeout: 30_000 }),
        page.waitForSelector("input[name='firstname'], input[name='lastname'], #email", { timeout: 30_000 }),
      ]).catch(() => undefined);
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    }

    // Đảm bảo checkoutPage được set nếu không có popup nhưng page hiện tại đã navigate
    if (!checkoutPage && /book\.html|secure\.booking\.com/i.test(page.url())) {
      checkoutPage = page;
    }
  }

  // Tìm checkout page trong context nếu vẫn chưa có
  if (!checkoutPage) {
    for (const p of page.context().pages()) {
      if (isCheckoutUrl(p.url(), "booking") || /book\.html/i.test(p.url())) {
        checkoutPage = p;
        break;
      }
    }
  }

  const targetPage = checkoutPage ?? page;
  await targetPage.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
  await targetPage.waitForTimeout(3000);

  const finalUrl = targetPage.url();
  const onGuestForm =
    isCheckoutUrl(finalUrl, "booking") ||
    (await targetPage.getByText(/Nhập thông tin chi tiết|Enter your details/i).isVisible({ timeout: 3000 }).catch(() => false)) ||
    (await targetPage.locator("input[name='email'], input[type='email']").first().isVisible({ timeout: 3000 }).catch(() => false)) ||
    (await targetPage.locator("input[name='firstname'], input[name='lastname']").first().isVisible({ timeout: 3000 }).catch(() => false));

  const loginWall =
    /login|sign-in|account\.booking/i.test(finalUrl) &&
    !(await targetPage.locator("input[name='firstname']").isVisible({ timeout: 1000 }).catch(() => false));

  if (loginWall) {
    return { reachedCheckout: false, steps, blockedByLogin: true, checkoutPage: targetPage };
  }

  return {
    reachedCheckout: onGuestForm,
    steps,
    checkoutPage: targetPage,
  };
}

export async function fillBookingGuestFields(
  page: Page,
  profile: { fullName: string; email: string; phone: string }
): Promise<number> {
  const { familyName, givenName } = splitVietnameseName(profile.fullName);
  const phone = profile.phone.replace(/\s/g, "");

  // Bring to front + wait for form to fully load
  await page.bringToFront().catch(() => undefined);
  await page
    .waitForSelector("input[name='firstname'], input[name='lastname'], input[type='email']", {
      state: "visible",
      timeout: 30_000,
    })
    .catch(() => undefined);
  // Đợi React hydration + Booking analytics finish
  await page.waitForTimeout(3000);

  // Strategy: Browser script là PRIMARY (handles React-controlled inputs reliably).
  // Chạy 3 lần với delay vì Booking.com hay re-render form sau hydration.
  let filled = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await runBrowserScript<{
      filled: number;
      debug: string[];
      results: Record<string, boolean>;
    }>(page, "fill-booking-guest.js", {
      familyName,
      givenName,
      email: profile.email,
      phone,
    }).catch(() => ({ filled: 0, debug: [], results: {} }));

    filled = Math.max(filled, result.filled);
    if (filled >= 4) break;

    // Re-render guard: wait then retry
    await page.waitForTimeout(1500);
  }

  // Verify by reading actual input values - if any field is empty, fallback to Playwright's pressSequentially
  type FieldDef = { selector: string; value: string };
  const fields: FieldDef[] = [
    { selector: "input[name='lastname'], #lastname", value: familyName },
    { selector: "input[name='firstname'], #firstname", value: givenName },
    { selector: "input[name='email'], input[type='email']", value: profile.email },
    { selector: "input[name='phone'], input[type='tel'], #phone", value: phone },
  ];

  let verifiedCount = 0;
  for (const field of fields) {
    if (!field.value) continue;
    const loc = page.locator(field.selector).first();
    if (!(await loc.isVisible({ timeout: 1000 }).catch(() => false))) continue;

    let current = await loc.inputValue().catch(() => "");
    if (current === field.value || current.length >= field.value.length * 0.8) {
      verifiedCount += 1;
      continue;
    }

    // Field is empty/wrong → use pressSequentially as last resort
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
      await loc.click({ timeout: 3000 });
      await page.waitForTimeout(150);
      await loc.fill("", { timeout: 2000 });
      await page.waitForTimeout(100);
      await loc.pressSequentially(field.value, { delay: 80 });
      await page.waitForTimeout(300);
      // Don't press Tab - it might trigger validation/navigation
      current = await loc.inputValue().catch(() => "");
      if (current === field.value || current.length >= field.value.length * 0.8) {
        verifiedCount += 1;
      }
    } catch {
      // Continue to next field
    }
  }

  return Math.max(filled, verifiedCount);
}

export async function extractBookingCheckoutTotal(page: Page): Promise<number | null> {
  // Wait for price to be visible
  await page.waitForTimeout(1500);

  const fromScript = await runBrowserScript<{ totalVnd: number | null; source?: string }>(
    page,
    "extract-booking-total.js"
  ).catch(() => ({ totalVnd: null }));

  if (fromScript.totalVnd && fromScript.totalVnd >= 100_000) {
    return fromScript.totalVnd;
  }

  // Fallback: look for "Tổng cộng" text specifically
  const totalText = await page
    .locator("text=/Tổng cộng|Total/i")
    .first()
    .evaluate((el) => {
      const parent = el.closest("div, tr, section") as HTMLElement | null;
      return parent?.textContent || el.textContent || "";
    })
    .catch(() => "");

  const totalMatch = totalText.match(/VND\s*([\d.,]+)|([\d.,]+)\s*(?:₫|VND)/);
  if (totalMatch) {
    const priceStr = (totalMatch[1] || totalMatch[2] || "").replace(/\./g, "").replace(/,/g, "");
    const num = parseInt(priceStr, 10);
    if (num && num >= 100_000 && num <= 50_000_000) {
      return num;
    }
  }

  // Final fallback: look at sidebar price-summary
  const sidebar = page.locator('[data-testid="price-summary"], .bui-price-display__value, aside');
  const count = await sidebar.count();
  const prices: number[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    const text = await sidebar.nth(i).innerText().catch(() => "");
    const n = parsePriceVnd(text);
    if (n && n >= 100_000 && n <= 50_000_000) prices.push(n);
  }
  
  if (prices.length > 0) {
    // Sort descending, take second largest if there's a big gap (original vs discounted)
    prices.sort((a, b) => b - a);
    if (prices.length >= 2 && prices[0] > prices[1] * 1.1) {
      return prices[1]; // Second largest is likely the discounted total
    }
    return prices[0];
  }

  return null;
}
