import "dotenv/config";
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

const site = (process.argv[2] ?? "vntrip") as "booking" | "agoda" | "vntrip";
const url = SITE_ADAPTERS[site].buildSearchUrl(criteria);
console.log("URL:", url);

try {
  await withPage(async (page) => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => undefined);
    await page.waitForTimeout(5000);
    // Scroll to trigger lazy-load
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(3000);

    // Find likely card-like containers with VND text
    const found = await page.evaluate(() => {
      const els = document.querySelectorAll("body *");
      const result: { tag: string; cls: string; id: string; len: number; sample: string }[] = [];
      const seen = new Set<string>();
      for (const el of Array.from(els)) {
        const t = (el.textContent || "").trim();
        if (t.length < 30 || t.length > 800) continue;
        if (!/₫|VND/.test(t)) continue;
        const e = el as HTMLElement;
        const sig = `${e.tagName}|${e.className}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        result.push({
          tag: e.tagName,
          cls: String(e.className).slice(0, 100),
          id: e.id,
          len: t.length,
          sample: t.slice(0, 120).replace(/\s+/g, " "),
        });
        if (result.length >= 15) break;
      }
      return result;
    });
    console.log("Candidates with VND text:");
    for (const c of found) console.log("  -", c.tag, c.cls || "(no class)", "| len:", c.len, "|", c.sample);
  });
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e);
} finally {
  await closeBrowser().catch(() => undefined);
}
