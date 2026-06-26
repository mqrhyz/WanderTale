import { mkdir } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { BookingSiteId } from "../state.js";
import { getHotelAgentEnv } from "../config/env.js";
import {
  attachPageGuards,
  installFormInterceptors,
  installLegacyScanInterceptors,
  installMapsMediaInterceptors,
  installScanInterceptors,
} from "../lib/page-intercept.js";

let browser: Browser | null = null;
let legacyBrowser: Browser | null = null;

const BROWSER_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-notifications",
  "--disable-gpu",
  "--disable-extensions",
  "--disable-software-rasterizer",
];

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    const env = getHotelAgentEnv();
    browser = await chromium.launch({
      headless: env.HOTEL_AGENT_HEADLESS,
      args: [...BROWSER_ARGS, "--blink-settings=imagesEnabled=false"],
    });
  }
  return browser;
}

/** Browser headless cho Agoda/Vntrip — giữ CSS, không hiện cửa sổ. */
export async function getLegacyBrowser(): Promise<Browser> {
  if (!legacyBrowser) {
    const env = getHotelAgentEnv();
    legacyBrowser = await chromium.launch({
      headless: env.HOTEL_AGENT_HEADLESS_LEGACY,
      args: BROWSER_ARGS,
    });
  }
  return legacyBrowser;
}

/** Context quét giá — intercept tracker + popup, chặn tài nguyên nặng. */
export async function createLiteScanContext(): Promise<BrowserContext> {
  const b = await getBrowser();

  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  ];
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)]!;

  const ctx = await b.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    userAgent: ua,
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true,
    bypassCSP: true,
    serviceWorkers: "block",
    extraHTTPHeaders: {
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", {
      get: () => ["vi-VN", "vi", "en-US", "en"],
    });
  });

  await installScanInterceptors(ctx);

  return ctx;
}

/** Context legacy — giữ CSS, chặn tracker + ảnh/font. */
export async function createLegacyScanContext(): Promise<BrowserContext> {
  const b = await getLegacyBrowser();

  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  ];
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)]!;

  const ctx = await b.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    userAgent: ua,
    viewport: { width: 1366, height: 900 },
    javaScriptEnabled: true,
    bypassCSP: true,
    serviceWorkers: "block",
    extraHTTPHeaders: {
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", {
      get: () => ["vi-VN", "vi", "en-US", "en"],
    });
  });

  await installLegacyScanInterceptors(ctx);

  return ctx;
}

export async function newContext(): Promise<BrowserContext> {
  const b = await getBrowser();
  const ctx = await b.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 900 },
  });

  installFormInterceptors(ctx);

  const env = getHotelAgentEnv();
  if (env.HOTEL_AGENT_BLOCK_RESOURCES) {
    await installScanInterceptors(ctx);
  }

  return ctx;
}

export async function createMapsMediaContext(): Promise<BrowserContext> {
  const b = await getLegacyBrowser();
  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  ];
  const ua = userAgents[Math.floor(Math.random() * userAgents.length)]!;

  const ctx = await b.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    userAgent: ua,
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true,
    bypassCSP: true,
    serviceWorkers: "block",
    extraHTTPHeaders: {
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "languages", {
      get: () => ["vi-VN", "vi", "en-US", "en"],
    });
  });

  await installMapsMediaInterceptors(ctx);
  return ctx;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const ctx = await newContext();
  const page = await ctx.newPage();
  attachPageGuards(page);
  const env = getHotelAgentEnv();
  page.setDefaultTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
  try {
    return await fn(page);
  } finally {
    if (env.HOTEL_AGENT_HEADLESS) {
      await ctx.close();
    } else {
      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 15 * 60 * 1000);
    }
  }
}

/** Tạo nhiều page trong cùng một context để chạy song song. */
export async function withPages<T>(count: number, fn: (pages: Page[]) => Promise<T>): Promise<T> {
  if (count <= 0) return fn([]);
  const ctx = await newContext();
  const env = getHotelAgentEnv();
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const page = await ctx.newPage();
    attachPageGuards(page);
    page.setDefaultTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
    pages.push(page);
  }
  try {
    return await fn(pages);
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
    if (env.HOTEL_AGENT_HEADLESS) {
      await ctx.close();
    } else {
      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 15 * 60 * 1000);
    }
  }
}

export async function withLegacyPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const ctx = await createLegacyScanContext();
  const page = await ctx.newPage();
  attachPageGuards(page);
  const env = getHotelAgentEnv();
  page.setDefaultTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
  try {
    return await fn(page);
  } finally {
    if (env.HOTEL_AGENT_HEADLESS_LEGACY) {
      await ctx.close();
    } else {
      setTimeout(() => {
        ctx.close().catch(() => undefined);
      }, 15 * 60 * 1000);
    }
  }
}

export async function withParallelTabs<T>(
  sites: BookingSiteId[],
  fn: (page: Page, site: BookingSiteId) => Promise<T>
): Promise<T[]> {
  if (sites.length === 0) return [];
  const ctx = await createLiteScanContext();
  const env = getHotelAgentEnv();
  const pages = await Promise.all(
    sites.map(async () => {
      const page = await ctx.newPage();
      attachPageGuards(page);
      page.setDefaultTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
      return page;
    })
  );

  try {
    return await Promise.all(sites.map((site, i) => fn(pages[i]!, site)));
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
    await ctx.close().catch(() => undefined);
  }
}

export async function withLegacyParallelTabs<T>(
  sites: BookingSiteId[],
  fn: (page: Page, site: BookingSiteId) => Promise<T>
): Promise<T[]> {
  if (sites.length === 0) return [];
  const ctx = await createLegacyScanContext();
  const env = getHotelAgentEnv();
  const pages = await Promise.all(
    sites.map(async () => {
      const page = await ctx.newPage();
      attachPageGuards(page);
      page.setDefaultTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS);
      return page;
    })
  );

  try {
    return await Promise.all(sites.map((site, i) => fn(pages[i]!, site)));
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
    await ctx.close().catch(() => undefined);
  }
}

export async function ensureScreenshotDir(): Promise<string> {
  const dir = getHotelAgentEnv().HOTEL_AGENT_SCREENSHOT_DIR;
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (legacyBrowser) {
    await legacyBrowser.close();
    legacyBrowser = null;
  }
}
