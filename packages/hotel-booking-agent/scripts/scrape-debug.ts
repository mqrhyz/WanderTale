import "dotenv/config";
import { extractOffersLite } from "../src/tools/extract-prices.js";
import { withPage, closeBrowser } from "../src/tools/playwright-browser.js";
import { SITE_ADAPTERS } from "../src/sites/registry.js";

const criteria = {
  city: "Đà Lạt",
  checkIn: "2026-06-16",
  checkOut: "2026-06-18",
  adults: 2,
  children: 0,
  rooms: 1,
};

const site = (process.argv[2] ?? "booking") as "booking" | "agoda" | "vntrip";

process.env.HOTEL_AGENT_BLOCK_RESOURCES = "false";
process.env.HOTEL_AGENT_SCAN_WAIT_MS = "18000";

const url = SITE_ADAPTERS[site].buildSearchUrl(criteria);
console.log("URL:", url);
const t0 = Date.now();
try {
  const offers = await withPage((page) => extractOffersLite(page, site, criteria, url));
  console.log("OK", offers.length, `(${Date.now() - t0}ms)`);
  console.log(JSON.stringify(offers.slice(0, 2), null, 2));
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e, `(${Date.now() - t0}ms)`);
} finally {
  await closeBrowser().catch(() => undefined);
}
