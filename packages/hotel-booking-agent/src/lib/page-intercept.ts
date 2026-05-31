import type { BrowserContext, Page, Route } from "playwright";

/** Domain quảng cáo / analytics — chặn khi quét giá (không cần cho DOM giá). */
const TRACKER_HOST_RE =
  /(?:google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|intercom|clarity\.ms|criteo|taboola|outbrain|adservice|ads\.|analytics\.|segment\.|mixpanel|sentry\.io|newrelic|optimizely|mouseflow|fullstory|branch\.io|appsflyer|tiktok\.com\/i18n|snapchat|linkedin\.com\/px)/i;

/** Popup quảng cáo / newsletter — đóng tab mới nếu URL khớp. */
const AD_POPUP_URL_RE =
  /(?:popup|promo|newsletter|subscribe|ads\.|advert|doubleclick|fanpage|login.*modal|sign-in.*overlay)/i;

const BLOCKED_RESOURCE = new Set(["image", "media", "font", "stylesheet", "websocket"]);

/** Legacy (Agoda/Vntrip): chỉ chặn ảnh/font — giữ CSS để SPA render giá. */
const LEGACY_BLOCKED_RESOURCE = new Set(["image", "media", "font", "websocket"]);

/** URL tài nguyên trang trí — chặn kể cả khi resourceType là other. */
const DECORATIVE_URL_RE = /\.(?:css|woff2?|ttf|otf|eot|svg|png|jpe?g|gif|webp|avif|ico)(?:\?|$)/i;

const OVERLAY_CLOSE_SELECTORS = [
  '[aria-label="Close" i]',
  '[aria-label="Đóng" i]',
  '[data-testid="modal-close"]',
  '[data-testid="close-button"]',
  'button[class*="close" i]',
  'button[class*="Close" i]',
  ".modal-close",
  ".popup-close",
  '[class*="Modal"] button[class*="close" i]',
  '[class*="overlay"] button[class*="close" i]',
  '[id*="popup"] button[class*="close" i]',
  'button:has-text("Đóng")',
  'button:has-text("Close")',
  'button:has-text("Không, cảm ơn")',
  'button:has-text("No thanks")',
  'button:has-text("Maybe later")',
];

/** Có nên abort request khi quét giá (lite scan). */
export function shouldAbortScanRequest(url: string, resourceType: string): boolean {
  if (BLOCKED_RESOURCE.has(resourceType)) return true;
  if (DECORATIVE_URL_RE.test(url)) return true;
  return shouldAbortTracker(url);
}

/** Legacy scan — không chặn stylesheet. */
export function shouldAbortLegacyScanRequest(url: string, resourceType: string): boolean {
  if (LEGACY_BLOCKED_RESOURCE.has(resourceType)) return true;
  return shouldAbortTracker(url);
}

function shouldAbortTracker(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    if (TRACKER_HOST_RE.test(host)) return true;
  } catch {
    /* ignore invalid url */
  }
  return false;
}

function handleLegacyScanRoute(route: Route): void {
  const req = route.request();
  if (shouldAbortLegacyScanRequest(req.url(), req.resourceType())) {
    void route.abort();
    return;
  }
  void route.continue();
}

function handleScanRoute(route: Route): void {
  const req = route.request();
  if (shouldAbortScanRequest(req.url(), req.resourceType())) {
    void route.abort();
    return;
  }
  void route.continue();
}

function isAdPopupUrl(url: string): boolean {
  if (!url || url === "about:blank") return false;
  try {
    const u = new URL(url);
    if (AD_POPUP_URL_RE.test(u.href)) return true;
    // Tab phụ rỗng / tracking pixel
    if (u.pathname.length <= 1 && !u.search && u.hostname.includes("ads")) return true;
  } catch {
    return false;
  }
  return false;
}

/** Tự dismiss alert/confirm/prompt — tránh Chromium treo chờ user. */
export function attachPageGuards(page: Page): void {
  page.on("dialog", (dialog) => {
    void dialog.dismiss().catch(() => undefined);
  });
}

async function handleSpawnedPage(popup: Page, parentUrl?: string): Promise<void> {
  attachPageGuards(popup);
  await popup.waitForLoadState("domcontentloaded", { timeout: 2500 }).catch(() => undefined);

  const url = popup.url();
  if (isAdPopupUrl(url)) {
    await popup.close().catch(() => undefined);
    return;
  }

  // Popup cross-origin nhỏ (thường là quảng cáo) — giữ popup checkout cùng OTA
  if (parentUrl && url !== "about:blank") {
    try {
      const parentHost = new URL(parentUrl).hostname.replace(/^www\./, "");
      const popupHost = new URL(url).hostname.replace(/^www\./, "");
      const otaHosts = ["booking.com", "agoda.com", "vntrip.vn"];
      const parentIsOta = otaHosts.some((h) => parentHost.endsWith(h));
      const popupIsOta = otaHosts.some((h) => popupHost.endsWith(h));
      if (parentIsOta && !popupIsOta) {
        await popup.close().catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Intercept Playwright cho luồng quét giá:
 * - route: chặn tracker / ảnh / font / websocket
 * - dialog: auto dismiss
 * - page mới: đóng popup quảng cáo
 */
export async function installScanInterceptors(ctx: BrowserContext): Promise<void> {
  await ctx.route("**/*", handleScanRoute);

  ctx.on("page", (popup) => {
    const pages = ctx.pages();
    const parent = pages.find((p) => p !== popup);
    void handleSpawnedPage(popup, parent?.url());
  });
}

/** Agoda/Vntrip — chặn tracker + ảnh, giữ CSS/JS đầy đủ. */
export async function installLegacyScanInterceptors(ctx: BrowserContext): Promise<void> {
  await ctx.route("**/*", handleLegacyScanRoute);

  ctx.on("page", (popup) => {
    const pages = ctx.pages();
    const parent = pages.find((p) => p !== popup);
    void handleSpawnedPage(popup, parent?.url());
  });
}

/** Google Maps media — giữ ảnh/CSS, chỉ chặn tracker. */
function handleMapsMediaRoute(route: Route): void {
  const req = route.request();
  if (shouldAbortTracker(req.url())) {
    void route.abort();
    return;
  }
  void route.continue();
}

export async function installMapsMediaInterceptors(ctx: BrowserContext): Promise<void> {
  await ctx.route("**/*", handleMapsMediaRoute);

  ctx.on("page", (popup) => {
    const pages = ctx.pages();
    const parent = pages.find((p) => p !== popup);
    void handleSpawnedPage(popup, parent?.url());
  });
}

/** Intercept nhẹ cho form fill (chỉ dialog + modal, không chặn popup checkout). */
export function installFormInterceptors(ctx: BrowserContext): void {
  ctx.on("page", (popup) => {
    attachPageGuards(popup);
  });
}

/** Bấm đóng modal / newsletter / overlay sau cookie banner. */
export async function dismissOverlays(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);

  for (const sel of OVERLAY_CLOSE_SELECTORS) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 250 }).catch(() => false)) {
      await el.click({ timeout: 800 }).catch(() => undefined);
      await page.waitForTimeout(150);
    }
  }

  // Một số OTA dùng div overlay clickable
  const backdrop = page.locator('[class*="backdrop" i], [class*="overlay" i]').first();
  if (await backdrop.isVisible({ timeout: 200 }).catch(() => false)) {
    await page.keyboard.press("Escape").catch(() => undefined);
  }
}

/** Timeout chờ card/giá — quét nhanh Booking (lite). */
export function scanWaitMsForSite(site: string, envDefault: number): number {
  switch (site) {
    case "booking":
      return Math.min(envDefault, 5_000);
    case "agoda":
      return Math.min(envDefault, 6_000);
    case "vntrip":
      return Math.min(envDefault, 6_000);
    default:
      return Math.min(envDefault, 6_000);
  }
}

/** Timeout chờ card/giá — Agoda/Vntrip legacy (networkidle + SPA). */
export function scanWaitMsForSiteLegacy(site: string, envDefault: number): number {
  switch (site) {
    case "agoda":
      return Math.min(envDefault, 10_000);
    case "vntrip":
      return Math.min(envDefault, 10_000);
    default:
      return Math.min(envDefault, 8_000);
  }
}

/** networkidle timeout — Agoda/Vntrip legacy. */
export function networkIdleTimeoutForSite(site: string): number {
  switch (site) {
    case "agoda":
      return 5_000;
    case "vntrip":
      return 5_000;
    default:
      return 4_000;
  }
}
