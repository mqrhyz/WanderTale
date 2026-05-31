import {
  closeBrowser,
  comparePrices,
  otaSearchLabel,
  searchHotel,
  type BookingSiteId,
  type ComparisonResult,
  type HotelOffer,
  type SearchCriteria,
  type SiteScanLog,
} from "@wander-tale/hotel-booking-agent";
import { env } from "../lib/env.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import { getOtaCache, otaCacheKey, otaCacheTtlSeconds, setOtaCache } from "./otaCacheService.js";
import type { TripRouteOptimization } from "./tripHotelLocationService.js";

export type TripHotelPricingResult = {
  status: "ok" | "empty" | "error" | "skipped" | "timeout" | "cached";
  message?: string;
  criteria?: SearchCriteria;
  offers: HotelOffer[];
  comparison: ComparisonResult | null;
  siteScans: SiteScanLog[];
  errors: Array<{ site: string; message: string }>;
  route_optimization?: TripRouteOptimization;
};

function cityFromDestination(destination: string): string {
  return otaSearchLabel(destination);
}

function tripOtaSites(): BookingSiteId[] {
  const raw = env.TRIP_OTA_SITES.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const valid = raw.filter((s): s is BookingSiteId => s === "booking" || s === "agoda" || s === "vntrip");
  return valid.length > 0 ? valid : ["booking"];
}

function emptyPricing(criteria: SearchCriteria, message: string, status: TripHotelPricingResult["status"]): TripHotelPricingResult {
  return {
    status,
    message,
    criteria,
    offers: [],
    comparison: null,
    siteScans: [],
    errors: [],
  };
}

function offersIncludeAllSites(offers: HotelOffer[], sites: BookingSiteId[]): boolean {
  const found = new Set(offers.map((o) => o.site));
  return sites.every((s) => found.has(s));
}

async function scrapeOtaLive(criteria: SearchCriteria, sites: BookingSiteId[]): Promise<TripHotelPricingResult> {
  const hardDeadlineMs = env.TRIP_OTA_HARD_DEADLINE_MS;
  /** Job timeout phải lớn hơn hard deadline (3 tab song song + VietMap sau). */
  const jobTimeoutMs = hardDeadlineMs + 60_000;

  try {
    const { offers, siteScans, errors } = await searchHotel({
      criteria,
      sites,
      retry: true,
      perSiteDeadlines: true,
      hardDeadlineMs,
      jobTimeoutMs,
      resetCircuits: true,
    });

    console.info(`[trip-ota] city=${criteria.city} sites=${sites.join(",")} offers=${offers.length}`);

    if (offers.length === 0) {
      return {
        status: "empty",
        message: "Không quét được giá phòng từ OTA.",
        criteria,
        offers: [],
        comparison: null,
        siteScans,
        errors: errors.map((e) => ({ site: e.site, message: e.message })),
      };
    }

    const comparison = await comparePrices({ offers, criteria });
    return {
      status: "ok",
      criteria,
      offers,
      comparison,
      siteScans,
      errors: errors.map((e) => ({ site: e.site, message: e.message })),
    };
  } catch (e) {
    await closeBrowser().catch(() => undefined);
    const message = e instanceof Error ? e.message : String(e);
    if (/timeout/i.test(message)) {
      return {
        status: "timeout",
        message: `Quét OTA quá thời gian cho phép (~${Math.round(jobTimeoutMs / 1000)}s). Thử lại sau hoặc giảm TRIP_OTA_SITES.`,
        criteria,
        offers: [],
        comparison: null,
        siteScans: [],
        errors: [{ site: "ota", message }],
      };
    }
    return emptyPricing(criteria, message, "error");
  }
}

/** Quét OTA theo thành phố (agent Playwright) — như luồng cũ. */
export async function fetchHotelPricingForTrip(body: TripGenerateInput): Promise<TripHotelPricingResult> {
  const criteria: SearchCriteria = {
    city: cityFromDestination(body.destination),
    checkIn: body.start_date,
    checkOut: body.end_date,
    adults: body.travelers,
    children: body.children ?? 0,
    rooms: body.rooms ?? 1,
    budgetVnd: body.budget > 50_000 ? body.budget : undefined,
  };

  const sites = tripOtaSites();
  const cacheKey = otaCacheKey(criteria, sites);

  if (env.TRIP_OTA_CACHE_ENABLED) {
    const cached = await getOtaCache(cacheKey);
    if (cached && cached.offers.length > 0) {
      const cachedOffers = cached.offers as HotelOffer[];
      if (offersIncludeAllSites(cachedOffers, sites)) {
        return {
          status: "cached",
          criteria,
          offers: cachedOffers,
          comparison: cached.comparison as ComparisonResult | null,
          siteScans: cached.siteScans as SiteScanLog[],
          errors: cached.errors,
          message: "Giá OTA từ cache",
        };
      }
    }
  }

  const result = await scrapeOtaLive(criteria, sites);

  if (env.TRIP_OTA_CACHE_ENABLED && result.offers.length > 0 && offersIncludeAllSites(result.offers, sites)) {
    await setOtaCache(
      cacheKey,
      {
        status: result.status,
        message: result.message,
        offers: result.offers,
        comparison: result.comparison,
        siteScans: result.siteScans,
        errors: result.errors,
      },
      otaCacheTtlSeconds(criteria.checkIn)
    ).catch(() => undefined);
  }

  return result;
}
