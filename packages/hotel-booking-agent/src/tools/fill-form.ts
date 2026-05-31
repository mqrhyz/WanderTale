import { join } from "node:path";
import type { FormFillResult, HotelOffer, SearchCriteria, UserProfile } from "../state.js";
import { formatVietnamDateTime, nowIso } from "../lib/datetime.js";
import { enrichHotelUrl, isCheckoutUrl, isHotelPropertyUrl, isRealOtaUrl } from "../lib/ota-url.js";
import { dismissCookieBanner } from "../lib/cookie-banner.js";
import { SITE_ADAPTERS } from "../sites/registry.js";
import { advanceToCheckout, fillGuestFieldsForSite } from "../sites/checkout/index.js";
import { extractBookingCheckoutTotal } from "../sites/checkout/booking.js";
import { ensureScreenshotDir, withPage } from "./playwright-browser.js";
import { getHotelAgentEnv } from "../config/env.js";
import { runExclusiveJob } from "../lib/concurrency.js";

export type FillFormInput = {
  offer: HotelOffer;
  profile: UserProfile;
  criteria?: SearchCriteria | null;
};

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

async function fillFormUnsafe(input: FillFormInput): Promise<FormFillResult> {
  const { offer, profile, criteria } = input;
  const startedAt = nowIso();
  const searchPriceVnd = offer.priceVnd;

  let targetUrl = offer.bookingUrl;
  if (criteria && isHotelPropertyUrl(targetUrl, offer.site)) {
    targetUrl = enrichHotelUrl(targetUrl, offer.site, criteria);
  }

  if (!isRealOtaUrl(targetUrl, offer.site)) {
    return {
      site: offer.site,
      success: false,
      stoppedBeforePayment: true,
      paymentUrl: targetUrl,
      checkoutReached: false,
      searchPriceVnd,
      startedAt,
      finishedAt: nowIso(),
      message: `Link không hợp lệ. Chỉ hỗ trợ URL từ ${SITE_ADAPTERS[offer.site].label}.`,
    };
  }

  const dir = await ensureScreenshotDir();
  const screenshotPath = join(dir, `checkout-${offer.site}-${Date.now()}.png`);
  const env = getHotelAgentEnv();

  try {
    return await withPage(async (page) => {
      await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS,
      });
      await dismissCookieBanner(page);

      const advance = await advanceToCheckout(page, offer);

      // Sử dụng checkoutPage được trả về từ advanceToCheckout (có thể là popup mới)
      let workPage = advance.checkoutPage ?? page;
      if (offer.site === "booking") {
        // Re-scan context một lần nữa để chắc chắn lấy đúng popup checkout
        const pages = page.context().pages();
        for (const p of pages) {
          const u = p.url();
          if (/secure\.booking\.com|book\.html/i.test(u)) {
            workPage = p;
            break;
          }
        }
        // Đưa popup lên foreground
        await workPage.bringToFront().catch(() => undefined);
        await workPage.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
        await workPage.waitForTimeout(2000);
      }

      let filledCount = 0;
      let checkoutTotalVnd: number | undefined;

      const onGuestForm =
        advance.reachedCheckout ||
        isCheckoutUrl(workPage.url(), offer.site) ||
        (offer.site === "booking" &&
          (await workPage
            .locator("input[name='firstname'], input[name='lastname'], input[type='email']")
            .first()
            .isVisible({ timeout: 3000 })
            .catch(() => false)));

      if (onGuestForm && !advance.blockedByLogin) {
        filledCount = await fillGuestFieldsForSite(workPage, offer.site, profile);
        if (offer.site === "booking") {
          checkoutTotalVnd = (await extractBookingCheckoutTotal(workPage)) ?? undefined;
        }
      }

      await workPage.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

      const paymentUrl = workPage.url();
      const finishedAt = nowIso();
      const checkoutReached =
        isCheckoutUrl(paymentUrl, offer.site) ||
        (offer.site === "booking" && filledCount >= 3 && onGuestForm);
      const onHotelOnly = isHotelPropertyUrl(paymentUrl, offer.site) && !checkoutReached;

      const priceCompare =
        checkoutTotalVnd && checkoutTotalVnd !== searchPriceVnd
          ? ` Giá quét: ${formatVnd(searchPriceVnd)} → **giá checkout thực tế: ${formatVnd(checkoutTotalVnd)}** (đã gồm thuế/phí, loại phòng đã chọn).`
          : checkoutTotalVnd
            ? ` Tổng checkout: ${formatVnd(checkoutTotalVnd)}.`
            : offer.priceNote
              ? ` (${offer.priceNote})`
              : "";

      if (advance.blockedByLogin) {
        return {
          site: offer.site,
          success: false,
          stoppedBeforePayment: true,
          paymentUrl: targetUrl,
          screenshotPath,
          checkoutReached: false,
          searchPriceVnd,
          fieldsFilled: filledCount,
          startedAt,
          finishedAt,
          message: `Booking.com yêu cầu đăng nhập. Đăng nhập rồi hoàn tất thủ công.`,
          qrHint: targetUrl,
        };
      }

      if (onHotelOnly || filledCount < 2) {
        return {
          site: offer.site,
          success: false,
          stoppedBeforePayment: true,
          paymentUrl,
          screenshotPath,
          checkoutReached: false,
          searchPriceVnd,
          fieldsFilled: filledCount,
          startedAt,
          finishedAt,
          message:
            filledCount < 2
              ? `Chưa điền đủ form khách (Họ/Tên/email/SĐT: ${filledCount}/4). Có thể vẫn ở trang chọn phòng — chọn phòng, bấm "Tôi sẽ đặt". (${advance.steps.join(" → ") || "—"})`
              : `Chưa vào checkout. (${advance.steps.join(" → ") || "—"})`,
          qrHint: paymentUrl,
        };
      }

      const fillOk = filledCount >= 3;
      return {
        site: offer.site,
        success: checkoutReached && fillOk,
        stoppedBeforePayment: true,
        paymentUrl,
        screenshotPath,
        checkoutReached,
        checkoutTotalVnd,
        searchPriceVnd,
        fieldsFilled: filledCount,
        startedAt,
        finishedAt,
        qrHint: env.HOTEL_AGENT_HEADLESS
          ? "Lưu ý: Agent chạy headless — link bạn mở sẽ trống. Đặt HOTEL_AGENT_HEADLESS=false trong .env để thấy form đã điền sẵn trên cửa sổ thật."
          : "Cửa sổ Booking đã được agent mở sẵn với form điền đầy đủ. Vui lòng chuyển sang cửa sổ đó để xác nhận và thanh toán (đừng dùng link copy — link mở browser khác sẽ trống).",
        message: checkoutReached
          ? `Đã vào checkout, điền ${filledCount}/4 trường (${formatVietnamDateTime(finishedAt)}).${priceCompare}${fillOk ? "" : " Một số ô có thể cần bạn điền tay trên cửa sổ agent đã mở."}`
          : `Đã điền ${filledCount} trường.${priceCompare}`,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      site: offer.site,
      success: false,
      stoppedBeforePayment: true,
      paymentUrl: targetUrl,
      screenshotPath,
      checkoutReached: false,
      searchPriceVnd,
      startedAt,
      finishedAt: nowIso(),
      message: `Không hoàn tất checkout: ${message}`,
      qrHint: targetUrl,
    };
  }
}

export async function fillForm(input: FillFormInput): Promise<FormFillResult> {
  return runExclusiveJob("hotel form fill", () => fillFormUnsafe(input));
}
