import type { Page } from "playwright";
import { getHotelAgentEnv } from "../config/env.js";
import { runBrowserScript } from "../browser/run-browser-script.js";
import { dismissCookieBanner } from "../lib/cookie-banner.js";
import { createMapsMediaContext } from "./playwright-browser.js";
import { attachPageGuards } from "../lib/page-intercept.js";
import { runExclusiveJob } from "../lib/concurrency.js";

export type MapsPlaceMedia = {
  maps_url: string;
  image_preview_url?: string;
  image_preview_urls?: string[];
};

function fallbackSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildMapsSearchUrl(query: string, lat?: number, lng?: number): string {
  const q = query.trim();
  const encoded = encodeURIComponent(q);
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/${encoded}/@${lat},${lng},17z`;
  }
  return `https://www.google.com/maps/search/${encoded}`;
}

function mergeUrls(...lists: (string[] | undefined)[]): string[] {
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

const MAPS_NAV_TIMEOUT_MS = 14_000;

/** Agent Playwright: Google Maps web → link + gallery ảnh. */
export async function resolveMapsPlaceViaBrowser(
  page: Page,
  query: string,
  maxPhotos = 5,
  coords?: { lat: number; lng: number }
): Promise<MapsPlaceMedia> {
  const searchUrl = buildMapsSearchUrl(query, coords?.lat, coords?.lng);
  const env = getHotelAgentEnv();

  await page.waitForTimeout(800 + Math.floor(Math.random() * 1200));

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: Math.min(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS, MAPS_NAV_TIMEOUT_MS),
  });

  await dismissCookieBanner(page);

  await page
    .locator('a[href*="/maps/place/"], div[role="feed"]')
    .first()
    .waitFor({ state: "attached", timeout: 5000 })
    .catch(() => undefined);

  await page.waitForTimeout(maxPhotos <= 1 ? 600 : 1200);

  await page
    .locator('a.hfpxzc[href*="/maps/place/"], a[href*="/maps/place/"]')
    .first()
    .click({ timeout: maxPhotos <= 1 ? 2500 : 4000 })
    .catch(() => undefined);

  await page.waitForTimeout(maxPhotos <= 1 ? 500 : 1000);

  let result = await runBrowserScript<MapsPlaceMedia>(page, "extract-maps-place.js", {
    query,
    max: maxPhotos,
  });

  const placeUrl = result.maps_url;
  const needMore =
    placeUrl.includes("/maps/place/") &&
    mergeUrls(result.image_preview_urls, result.image_preview_url ? [result.image_preview_url] : undefined)
      .length < maxPhotos;

  if (needMore && maxPhotos > 1) {
    try {
      await page.goto(placeUrl, {
        waitUntil: "domcontentloaded",
        timeout: Math.min(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS, 12_000),
      });
      await dismissCookieBanner(page);
      await page.waitForTimeout(1500);
      const detail = await runBrowserScript<MapsPlaceMedia>(page, "extract-maps-place.js", {
        query,
        max: maxPhotos,
      });
      const urls = mergeUrls(
        result.image_preview_urls,
        result.image_preview_url ? [result.image_preview_url] : undefined,
        detail.image_preview_urls,
        detail.image_preview_url ? [detail.image_preview_url] : undefined
      ).slice(0, maxPhotos);
      result = {
        maps_url: detail.maps_url || placeUrl,
        image_preview_urls: urls.length > 0 ? urls : undefined,
        image_preview_url: urls[0],
      };
    } catch {
      /* giữ kết quả search */
    }
  }

  const urls = mergeUrls(
    result.image_preview_urls,
    result.image_preview_url ? [result.image_preview_url] : undefined
  ).slice(0, maxPhotos);

  return {
    maps_url: result.maps_url || fallbackSearchUrl(query),
    image_preview_url: urls[0],
    image_preview_urls: urls.length > 0 ? urls : undefined,
  };
}

/** Một phiên browser — quét nhiều địa điểm liên tiếp trên Google Maps. */
export async function resolveMapsPlacesBatchViaBrowser(
  page: Page,
  queries: Array<{ query: string; maxPhotos?: number; lat?: number; lng?: number }>
): Promise<Map<string, MapsPlaceMedia>> {
  const out = new Map<string, MapsPlaceMedia>();
  for (const { query, maxPhotos = 5, lat, lng } of queries) {
    const q = query.trim();
    if (!q) continue;
    const coords =
      lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng }
        : undefined;
    try {
      out.set(q, await resolveMapsPlaceViaBrowser(page, q, maxPhotos, coords));
    } catch (e) {
      console.warn("[maps-agent] failed:", q, e);
      out.set(q, { maps_url: fallbackSearchUrl(q) });
    }
  }
  return out;
}

/** Nhiều tab song song — nhanh hơn tuần tự, không cần Places API. */
export async function resolveMapsPlacesBatchParallel(
  queries: Array<{ query: string; maxPhotos?: number; lat?: number; lng?: number }>,
  concurrency = 3
): Promise<Map<string, MapsPlaceMedia>> {
  return runExclusiveJob("maps media", () => resolveMapsPlacesBatchParallelUnsafe(queries, concurrency));
}

async function resolveMapsPlacesBatchParallelUnsafe(
  queries: Array<{ query: string; maxPhotos?: number; lat?: number; lng?: number }>,
  concurrency = 3
): Promise<Map<string, MapsPlaceMedia>> {
  const items = queries
    .map(({ query, maxPhotos, lat, lng }) => ({
      query: query.trim(),
      maxPhotos: maxPhotos ?? 1,
      lat,
      lng,
    }))
    .filter(({ query }) => query.length > 0);

  const out = new Map<string, MapsPlaceMedia>();
  if (items.length === 0) return out;

  const workers = Math.min(Math.max(1, concurrency), items.length);
  const ctx = await createMapsMediaContext();
  const env = getHotelAgentEnv();
  const navTimeout = Math.min(env.HOTEL_AGENT_PLAYWRIGHT_TIMEOUT_MS, MAPS_NAV_TIMEOUT_MS);

  const pages = await Promise.all(
    Array.from({ length: workers }, async () => {
      const page = await ctx.newPage();
      attachPageGuards(page);
      page.setDefaultTimeout(navTimeout);
      page.setDefaultNavigationTimeout(navTimeout);
      return page;
    })
  );

  let next = 0;
  const t0 = Date.now();

  async function worker(page: Page) {
    while (next < items.length) {
      const idx = next++;
      const { query, maxPhotos, lat, lng } = items[idx]!;
      const coords =
        lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
          ? { lat, lng }
          : undefined;
      try {
        out.set(query, await resolveMapsPlaceViaBrowser(page, query, maxPhotos, coords));
      } catch (e) {
        console.warn("[maps-agent] parallel failed:", query, e);
        out.set(query, { maps_url: fallbackSearchUrl(query) });
      }
    }
  }

  try {
    await Promise.all(pages.map((page) => worker(page)));
    console.info(`[maps-agent] parallel n=${items.length} workers=${workers} ${Date.now() - t0}ms`);
  } finally {
    await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
    await ctx.close().catch(() => undefined);
  }

  return out;
}
