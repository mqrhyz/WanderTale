import type { BookingSiteId, HotelOffer, SearchCriteria, SiteScanLog } from "../state.js";
import { getHotelAgentEnv, getActiveScanSites } from "../config/env.js";
import { nowIso } from "../lib/datetime.js";
import { isRealOtaUrl } from "../lib/ota-url.js";
import {
  filterSitesByCircuit,
  recordSiteScanFailure,
  recordSiteScanSuccess,
  resetSiteCircuits,
} from "../lib/site-circuit-breaker.js";
import { DEFAULT_HARD_DEADLINE_MS, perSiteTimeoutMs } from "../lib/site-scan-timeouts.js";
import { partitionScanSites, usesLiteScan } from "../lib/scan-mode.js";
import { orderSitesForScan, SITE_ADAPTERS } from "../sites/registry.js";
import { withLegacyPage, withLegacyParallelTabs, withPage, withParallelTabs } from "./playwright-browser.js";
import { extractOffersForSite, extractOffersLegacy, extractOffersLite } from "./extract-prices.js";
import { runExclusiveJob } from "../lib/concurrency.js";

export type SearchHotelInput = {
  criteria: SearchCriteria;
  sites?: BookingSiteId[];
  /** false = bỏ retry tuần tự (nhanh hơn, dùng khi tạo lịch). */
  retry?: boolean;
  /** Per-site timeout + hard deadline — dùng khi tạo lịch. */
  perSiteDeadlines?: boolean;
  hardDeadlineMs?: number;
  /** Trip flow: bỏ vào từng trang hotel lấy og:image (chậm). */
  skipImageBackfill?: boolean;
  /** Trip flow: reset circuit breaker trước khi quét. */
  resetCircuits?: boolean;
  /** Ghi đè HOTEL_AGENT_JOB_TIMEOUT_MS (ms) — trip flow nên ≥ hardDeadlineMs + 30s. */
  jobTimeoutMs?: number;
};

export type SearchHotelOutput = {
  offers: HotelOffer[];
  errors: { site: BookingSiteId; message: string }[];
  siteScans: SiteScanLog[];
  durationMs: number;
};

type SiteScanResult = {
  site: BookingSiteId;
  offers: HotelOffer[];
  siteScan: SiteScanLog;
  error: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptySiteResult(site: BookingSiteId, criteria: SearchCriteria, reason: string): SiteScanResult {
  const searchUrl = SITE_ADAPTERS[site].buildSearchUrl(criteria);
  const startedAt = nowIso();
  return {
    site,
    offers: [],
    siteScan: {
      site,
      searchUrl,
      startedAt,
      finishedAt: nowIso(),
      offerCount: 0,
      status: "error",
      error: reason,
    },
    error: reason,
  };
}

async function scanOneSite(
  page: import("playwright").Page,
  site: BookingSiteId,
  criteria: SearchCriteria
): Promise<SiteScanResult> {
  const searchUrl = SITE_ADAPTERS[site].buildSearchUrl(criteria);
  const startedAt = nowIso();

  try {
    const scraped = await extractOffersForSite(page, site, criteria, searchUrl);
    const realOffers = scraped.filter((o) => isRealOtaUrl(o.bookingUrl, site));
    const finishedAt = nowIso();

    return {
      site,
      offers: realOffers,
      siteScan: {
        site,
        searchUrl,
        startedAt,
        finishedAt,
        offerCount: realOffers.length,
        status: realOffers.length > 0 ? "ok" : "empty",
        error: realOffers.length === 0 ? "Không có offer hợp lệ" : undefined,
      },
      error: realOffers.length === 0 ? "0 offer" : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      site,
      offers: [],
      siteScan: {
        site,
        searchUrl,
        startedAt,
        finishedAt: nowIso(),
        offerCount: 0,
        status: "error",
        error: message,
      },
      error: message,
    };
  }
}

/** Quét song song nhiều tab + per-site timeout + hard deadline (trip flow). */
async function searchHotelWithDeadlines(
  sites: BookingSiteId[],
  criteria: SearchCriteria,
  hardDeadlineMs: number
): Promise<SiteScanResult[]> {
  const activeSites = filterSitesByCircuit(sites);
  const resultMap = new Map<BookingSiteId, SiteScanResult>();

  for (const site of sites) {
    if (!activeSites.includes(site)) {
      resultMap.set(site, emptySiteResult(site, criteria, "Site tạm tắt (circuit breaker)"));
    }
  }

  const toScan = activeSites.filter((s) => !resultMap.has(s));
  const { lite, legacy } = partitionScanSites(toScan);

  const withSiteTimeout = (site: BookingSiteId, scan: Promise<SiteScanResult>) =>
    Promise.race([
      scan,
      sleep(perSiteTimeoutMs(site)).then(() => {
        recordSiteScanFailure(site);
        return emptySiteResult(site, criteria, `Timeout ${Math.round(perSiteTimeoutMs(site) / 1000)}s`);
      }),
    ]);

  const runScans = async (): Promise<SiteScanResult[]> => {
    const [liteResults, legacyResults] = await Promise.all([
      lite.length > 0
        ? withParallelTabs(lite, (page, site) =>
            withSiteTimeout(site, scanOneSite(page, site, criteria))
          )
        : Promise.resolve([]),
      legacy.length > 0
        ? withLegacyParallelTabs(legacy, (page, site) =>
            withSiteTimeout(site, scanOneSite(page, site, criteria))
          )
        : Promise.resolve([]),
    ]);

    for (const r of [...liteResults, ...legacyResults]) {
      if (r.offers.length > 0) recordSiteScanSuccess(r.site);
      else recordSiteScanFailure(r.site);
      resultMap.set(r.site, r);
    }

    return orderSitesForScan(sites).map((site) => resultMap.get(site)!);
  };

  const results = await Promise.race([
    runScans(),
    sleep(hardDeadlineMs).then(() => null as SiteScanResult[] | null),
  ]);

  if (results) return results;

  for (const site of toScan) {
    if (!resultMap.has(site)) {
      resultMap.set(site, emptySiteResult(site, criteria, "Hard deadline — bỏ qua site chưa xong"));
    }
  }
  return orderSitesForScan(sites).map((site) => resultMap.get(site)!);
}

async function retrySiteLegacy(site: BookingSiteId, criteria: SearchCriteria): Promise<SiteScanResult> {
  const searchUrl = SITE_ADAPTERS[site].buildSearchUrl(criteria);
  const startedAt = nowIso();
  try {
    return await withLegacyPage(async (page) => {
      const scraped = await extractOffersLegacy(page, site, criteria, searchUrl);
      const realOffers = scraped.filter((o) => isRealOtaUrl(o.bookingUrl, site));
      return {
        site,
        offers: realOffers,
        siteScan: {
          site,
          searchUrl,
          startedAt,
          finishedAt: nowIso(),
          offerCount: realOffers.length,
          status: realOffers.length > 0 ? "ok" : ("empty" as const),
          error: realOffers.length === 0 ? "Retry legacy: 0 offer" : undefined,
        },
        error: realOffers.length === 0 ? "0 offer" : null,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptySiteResult(site, criteria, `Retry legacy: ${message}`);
  }
}

async function retrySiteLite(site: BookingSiteId, criteria: SearchCriteria): Promise<SiteScanResult> {
  const searchUrl = SITE_ADAPTERS[site].buildSearchUrl(criteria);
  const startedAt = nowIso();
  try {
    return await withPage(async (page) => {
      const scraped = await extractOffersLite(page, site, criteria, searchUrl);
      const realOffers = scraped.filter((o) => isRealOtaUrl(o.bookingUrl, site));
      return {
        site,
        offers: realOffers,
        siteScan: {
          site,
          searchUrl,
          startedAt,
          finishedAt: nowIso(),
          offerCount: realOffers.length,
          status: realOffers.length > 0 ? "ok" : ("empty" as const),
          error: realOffers.length === 0 ? "Retry lite: 0 offer" : undefined,
        },
        error: realOffers.length === 0 ? "0 offer" : null,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptySiteResult(site, criteria, `Retry lite: ${message}`);
  }
}

async function searchHotelUnsafe(input: SearchHotelInput): Promise<SearchHotelOutput> {
  const started = Date.now();
  const env = getHotelAgentEnv();
  const sites = orderSitesForScan(input.sites ?? getActiveScanSites());

  if (env.HOTEL_AGENT_DEMO_MODE) {
    throw new Error("HOTEL_AGENT_DEMO_MODE=true — tắt để quét giá thật.");
  }

  if (input.resetCircuits) {
    resetSiteCircuits(sites);
  }

  let results: SiteScanResult[];

  if (input.perSiteDeadlines) {
    const hardMs = input.hardDeadlineMs ?? DEFAULT_HARD_DEADLINE_MS;
    results = await searchHotelWithDeadlines(sites, input.criteria, hardMs);
  } else {
    const { lite, legacy } = partitionScanSites(sites);
    const [liteResults, legacyResults] = await Promise.all([
      lite.length > 0
        ? withParallelTabs(lite, (page, site) => scanOneSite(page, site, input.criteria))
        : Promise.resolve([]),
      legacy.length > 0
        ? withLegacyParallelTabs(legacy, (page, site) => scanOneSite(page, site, input.criteria))
        : Promise.resolve([]),
    ]);
    results = [...liteResults, ...legacyResults];
  }

  if ((input.retry ?? env.HOTEL_AGENT_SCAN_RETRY) && results.some((r) => r.offers.length === 0)) {
    // Retry SONG SONG các site trống (trước đây tuần tự → rất chậm khi 1 site fail).
    results = await Promise.all(
      results.map(async (r) => {
        if (r.offers.length > 0) return r;
        return usesLiteScan(r.site)
          ? retrySiteLite(r.site, input.criteria)
          : retrySiteLegacy(r.site, input.criteria);
      })
    );
  }

  const offers: HotelOffer[] = [];
  const errors: SearchHotelOutput["errors"] = [];
  const siteScans: SiteScanLog[] = [];

  for (const r of results) {
    siteScans.push(r.siteScan);
    if (r.error) errors.push({ site: r.site, message: r.error });
    offers.push(...r.offers);
  }

  return { offers, errors, siteScans, durationMs: Date.now() - started };
}

export async function searchHotel(input: SearchHotelInput): Promise<SearchHotelOutput> {
  return runExclusiveJob("hotel search", () => searchHotelUnsafe(input), input.jobTimeoutMs);
}

export { filterSitesByCircuit, isSiteCircuitOpen, resetSiteCircuits } from "../lib/site-circuit-breaker.js";
export { DEFAULT_HARD_DEADLINE_MS, PER_SITE_TIMEOUT_MS } from "../lib/site-scan-timeouts.js";
