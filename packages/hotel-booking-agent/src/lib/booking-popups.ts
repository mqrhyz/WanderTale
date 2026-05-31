import type { Page } from "playwright";
import { dismissCookieBanner } from "./cookie-banner.js";
import { dismissOverlays } from "./page-intercept.js";

/** Nút / banner Booking.com hay chặn quét giá lần đầu vào. */
const BOOKING_DISMISS_SELECTORS = [
  '[data-testid="modal-close"]',
  '[data-testid="header-sign-in-close"]',
  'button[aria-label="Dismiss sign-in info."]',
  'button[aria-label="Close sign-in banner"]',
  'button[aria-label="Close the login banner"]',
  'button[aria-label="Close"]',
  'button[aria-label="Đóng"]',
  ".bui-modal__close",
  ".bui-modal__close-icon",
  '[data-testid="genius-popover-close"]',
  '[data-testid="close-button"]',
  'button[name="close"]',
  "#onetrust-close-btn-container button",
];

const BOOKING_DISMISS_TEXT = [
  /^Maybe later$/i,
  /^Not now$/i,
  /^Skip$/i,
  /^Để sau$/i,
  /^Bỏ qua$/i,
  /^Không, cảm ơn$/i,
  /^No thanks$/i,
  /^Continue without/i,
  /^Tiếp tục không cần/i,
];

/** Đóng popup / banner đăng nhập Genius, newsletter… trên Booking. */
export async function dismissBookingPopups(page: Page): Promise<void> {
  await dismissCookieBanner(page);

  for (let round = 0; round < 2; round++) {
    await page.keyboard.press("Escape").catch(() => undefined);

    for (const sel of BOOKING_DISMISS_SELECTORS) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 120 }).catch(() => false)) {
        await el.click({ timeout: 400, force: true }).catch(() => undefined);
      }
    }

    for (const re of BOOKING_DISMISS_TEXT) {
      const btn = page.getByRole("button", { name: re }).first();
      if (await btn.isVisible({ timeout: 100 }).catch(() => false)) {
        await btn.click({ timeout: 400, force: true }).catch(() => undefined);
      }
    }

    await dismissOverlays(page);

    await page
      .evaluate(() => {
        const hideSel = [
          '[data-testid="sign-in-banner"]',
          '[data-testid="genius-banner"]',
          '[data-testid="webcore-smart-banner"]',
          'div[role="dialog"][aria-modal="true"]',
          ".bui-overlay",
        ];
        for (const s of hideSel) {
          document.querySelectorAll(s).forEach((el) => {
            const node = el as HTMLElement;
            if (node.querySelector("[data-testid='property-card']")) return;
            node.style.setProperty("display", "none", "important");
            node.style.setProperty("pointer-events", "none", "important");
          });
        }
      })
      .catch(() => undefined);
  }
}
