import type { BookingSiteId, SearchCriteria } from "../state.js";
import {
  AGODA_CITY_IDS,
  VNTRIP_CITY_SLUGS,
  otaSearchLabel,
  resolveCityKey,
} from "./city-ids.js";

export type SiteAdapter = {
  id: BookingSiteId;
  label: string;
  buildSearchUrl: (criteria: SearchCriteria) => string;
  priceSelectors: string[];
  nameSelectors: string[];
};

function searchText(c: SearchCriteria): string {
  const city = otaSearchLabel(c.city);
  const hint = c.hotelNameHint?.trim();
  if (hint) return `${hint} ${city}`.trim();
  return city;
}

function cityKey(c: SearchCriteria): string {
  return resolveCityKey(c.city);
}

export const SITE_ADAPTERS: Record<BookingSiteId, SiteAdapter> = {
  booking: {
    id: "booking",
    label: "Booking.com",
    buildSearchUrl: (c) => {
      const params = new URLSearchParams({
        ss: searchText(c),
        checkin: c.checkIn,
        checkout: c.checkOut,
        group_adults: String(c.adults),
        group_children: String(c.children),
        no_rooms: String(c.rooms),
        lang: "vi",
        selected_currency: "VND",
      });
      return `https://www.booking.com/searchresults.html?${params}`;
    },
    priceSelectors: [
      "[data-testid='price-for-x-nights']",
      "[data-testid='price-and-discounted-price']",
      ".bui-price-display__value",
    ],
    nameSelectors: ["[data-testid='title']", ".de576f5064", "h3 a"],
  },
  agoda: {
    id: "agoda",
    label: "Agoda",
    buildSearchUrl: (c) => {
      const key = cityKey(c);
      const cityId = AGODA_CITY_IDS[key];
      const params = new URLSearchParams({
        checkIn: c.checkIn,
        checkOut: c.checkOut,
        adults: String(c.adults),
        children: String(c.children),
        rooms: String(c.rooms),
        priceCur: "VND",
        currency: "VND",
        los: String(Math.max(1, daysBetween(c.checkIn, c.checkOut))),
        textToSearch: searchText(c),
      });
      if (cityId) params.set("city", String(cityId));
      return `https://www.agoda.com/vi-vn/search?${params}`;
    },
    priceSelectors: [
      "[data-element-name='final-price']",
      "[data-selenium='display-price']",
      "[data-selenium='hotel-price']",
      "[data-testid='price-text']",
      "[class*='PropertyCardPrice']",
    ],
    nameSelectors: [
      "[data-selenium='hotel-name']",
      "[data-element-name='property-card-title']",
      "h3",
      "[data-testid='hotel-name']",
    ],
  },
  vntrip: {
    id: "vntrip",
    label: "Vntrip.vn",
    buildSearchUrl: (c) => {
      const key = cityKey(c);
      const slug = VNTRIP_CITY_SLUGS[key] ?? key.replace(/\s+/g, "-");
      const keyword = c.hotelNameHint?.trim()
        ? `${normalizeHotelSlug(c.hotelNameHint)}-${slug}`
        : slug;
      const checkInCompact = c.checkIn.replace(/-/g, "");
      const nights = Math.max(1, daysBetween(c.checkIn, c.checkOut));
      const params = new URLSearchParams({
        checkInDate: checkInCompact,
        keyword,
        nights: String(nights),
        adults: String(c.adults),
        rooms: String(c.rooms),
      });
      return `https://app.vntrip.vn/tim-khach-san?${params}`;
    },
    priceSelectors: [
      ".listHotel__item [class*='price']",
      ".listHotel__item [class*='Price']",
      "[class*='hotelPrice']",
      "[class*='hotel-price']",
    ],
    nameSelectors: [
      ".listHotel__item h3",
      ".listHotel__item [class*='hotelName']",
      ".listHotel__item [class*='HotelName']",
      ".listHotel__item a[href*='/hotel/']",
    ],
  },
};

function normalizeHotelSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysBetween(checkIn: string, checkOut: string): number {
  try {
    const a = new Date(`${checkIn}T00:00:00Z`).getTime();
    const b = new Date(`${checkOut}T00:00:00Z`).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
    return Math.round((b - a) / 86_400_000);
  } catch {
    return 1;
  }
}

export const ALL_SITES: BookingSiteId[] = ["booking", "agoda", "vntrip"];

/** Booking trước (nhanh + ổn định nhất), sau đó Agoda, Vntrip */
export function orderSitesForScan(sites: BookingSiteId[]): BookingSiteId[] {
  const priority: BookingSiteId[] = ["booking", "agoda", "vntrip"];
  return [...sites].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
}
