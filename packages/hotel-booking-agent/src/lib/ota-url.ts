import type { BookingSiteId, SearchCriteria } from "../state.js";

const SITE_HOSTS: Record<BookingSiteId, string[]> = {
  booking: ["booking.com"],
  agoda: ["agoda.com"],
  vntrip: ["vntrip.vn"],
};

export function isRealOtaUrl(url: string, site?: BookingSiteId): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("example.com") || host === "localhost") return false;
    if (!site) {
      return Object.values(SITE_HOSTS).flat().some((h) => host.includes(h));
    }
    return SITE_HOSTS[site].some((h) => host.includes(h));
  } catch {
    return false;
  }
}

/** URL đã vào bước đặt phòng / thanh toán (không chỉ trang khách sạn) */
export function isCheckoutUrl(url: string, site: BookingSiteId): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const qs = u.search.toLowerCase();

    switch (site) {
      case "booking":
        if (u.hostname.includes("secure.booking.com")) return true;
        if (path.includes("book.html")) return true;
        if (qs.includes("stage=") || qs.includes("b_stage=")) return true;
        if (path.includes("/book") && !path.includes("/hotel/")) return true;
        return false;
      case "agoda":
        return /book|checkout|payment|guest/i.test(path + qs);
      case "vntrip":
        return /dat-phong|checkout|payment|book/i.test(path + qs);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export function isHotelPropertyUrl(url: string, site: BookingSiteId): boolean {
  try {
    const u = new URL(url);
    switch (site) {
      case "booking":
        return /\/hotel\//i.test(u.pathname) && !isCheckoutUrl(url, site);
      case "agoda":
        return /\/hotel\//i.test(u.pathname) || /property/i.test(u.pathname);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/** Gắn checkin/checkout/guests vào URL khách sạn nếu thiếu */
export function enrichHotelUrl(url: string, site: BookingSiteId, criteria: SearchCriteria): string {
  try {
    const u = new URL(url);
    if (site === "booking") {
      if (!u.searchParams.has("checkin")) u.searchParams.set("checkin", criteria.checkIn);
      if (!u.searchParams.has("checkout")) u.searchParams.set("checkout", criteria.checkOut);
      if (!u.searchParams.has("group_adults")) u.searchParams.set("group_adults", String(criteria.adults));
      if (!u.searchParams.has("group_children")) u.searchParams.set("group_children", String(criteria.children));
      if (!u.searchParams.has("no_rooms")) u.searchParams.set("no_rooms", String(criteria.rooms));
      u.searchParams.set("lang", "vi");
    }
    return u.href;
  } catch {
    return url;
  }
}
