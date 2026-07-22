/**
 * Lightweight pure-logic smoke checks for Sprint A/B subscription + enrichment rules.
 * Run: pnpm exec tsx backend/scripts/smoke-sprint-ab.ts
 */
import assert from "node:assert/strict";

// ---- free trip limit (mirror service constants) ----
const FREE_MONTHLY_TRIP_LIMIT = 5;
function canCreateTrip(isPremium: boolean, monthlyCount: number, monthlyLimit: number | null): boolean {
  if (isPremium || monthlyLimit == null) return true;
  return monthlyCount < (monthlyLimit ?? FREE_MONTHLY_TRIP_LIMIT);
}
assert.equal(canCreateTrip(false, 4, 5), true);
assert.equal(canCreateTrip(false, 5, 5), false);
assert.equal(canCreateTrip(true, 99, null), true);

// ---- gift voucher applicability ----
function giftAppliesToPackage(billingCycle: "monthly" | "yearly", giftDays: number, discountPercent: number): boolean {
  const fullFree = giftDays > 0 || discountPercent >= 100;
  if (!fullFree) return true;
  // full free gift only monthly
  return billingCycle === "monthly";
}
assert.equal(giftAppliesToPackage("monthly", 90, 100), true);
assert.equal(giftAppliesToPackage("yearly", 90, 100), false);

// ---- premium package expiry ----
function packageActive(status: string, endsAt: string, now = Date.now()): boolean {
  if (status !== "active") return false;
  return new Date(endsAt).getTime() > now;
}
assert.equal(packageActive("active", new Date(Date.now() + 86400000).toISOString()), true);
assert.equal(packageActive("active", new Date(Date.now() - 86400000).toISOString()), false);
assert.equal(packageActive("expired", new Date(Date.now() + 86400000).toISOString()), false);

// ---- enrichment job retry policy ----
const MAX_ATTEMPTS = 5;
function canRetryJob(status: string, attempts: number): boolean {
  if (status === "complete" || status === "running") return false;
  return attempts < MAX_ATTEMPTS && (status === "queued" || status === "failed");
}
assert.equal(canRetryJob("queued", 0), true);
assert.equal(canRetryJob("failed", 4), true);
assert.equal(canRetryJob("failed", 5), false);
assert.equal(canRetryJob("complete", 1), false);

console.log("smoke-sprint-ab: all assertions passed");
