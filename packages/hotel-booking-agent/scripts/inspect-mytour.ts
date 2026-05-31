import "dotenv/config";
import { withPage, closeBrowser } from "../src/tools/playwright-browser.js";

const url =
  "https://mytour.vn/khach-san/td155/khach-san-tai-thanh-pho-da-lat.html?check_in=2026-06-16&check_out=2026-06-18&adult=2&children=0&room=1";
console.log("URL:", url);

try {
  await withPage(async (page) => {
    // Sniff XHR
    page.on("response", (resp) => {
      const u = resp.url();
      if (/api|graphql|search|hotel|price/i.test(u) && resp.status() === 200) {
        const ct = resp.headers()["content-type"] || "";
        if (ct.includes("json")) console.log("XHR JSON:", resp.status(), u.slice(0, 160));
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 25_000 }).catch(() => undefined);
    await page.waitForTimeout(5000);
    await page.evaluate(() => window.scrollBy(0, 1200));
    await page.waitForTimeout(4000);

    const found = await page.evaluate(() => {
      const out: { sel: string; sample: string; count: number }[] = [];
      const tests = [
        "[class*='price']",
        "[class*='Price']",
        "[class*='hotel']",
        "[class*='Hotel']",
        "[data-price]",
        "[class*='card']",
        "a[href*='/khach-san/']",
      ];
      for (const sel of tests) {
        const els = document.querySelectorAll(sel);
        const txt = els[0] ? (els[0].textContent || "").trim().slice(0, 80).replace(/\s+/g, " ") : "";
        out.push({ sel, count: els.length, sample: txt });
      }
      return out;
    });
    for (const f of found) console.log(`${f.count.toString().padStart(4)}  ${f.sel.padEnd(28)}  ${f.sample}`);

    const priceTexts = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("body *").forEach((el) => {
        const t = (el.textContent || "").trim();
        if (/[\d]{1,3}[.,]\d{3}\s*(₫|VND|đ)/.test(t) && t.length < 200) {
          out.push(t.slice(0, 100).replace(/\s+/g, " "));
        }
      });
      return Array.from(new Set(out)).slice(0, 20);
    });
    console.log("\nPrice-text candidates:");
    for (const t of priceTexts) console.log("  ", t);
  });
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e);
} finally {
  await closeBrowser().catch(() => undefined);
}
