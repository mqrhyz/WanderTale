/** Dismiss common OTA cookie / consent banners */
export async function dismissCookieBanner(page: import("playwright").Page): Promise<void> {
  const labels = [
    "Chấp nhận",
    "Accept all",
    "Accept",
    "Đồng ý",
    "Tôi đồng ý",
    "OK",
    "Got it",
    "Allow all",
  ];
  for (const label of labels) {
    const btn = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await btn.isVisible({ timeout: 600 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      break;
    }
  }
}
