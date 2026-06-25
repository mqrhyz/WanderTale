/** Helpers for day agenda: prefer `activities[]`, fallback legacy morning/afternoon/evening. */

export type ItineraryActivityCategory =
  | "landmark"
  | "hotel"
  | "restaurant"
  | "cafe"
  | "nature"
  | "activity";

export type ItineraryCuisineType = "pho" | "bun_bo" | "com" | "banh" | "cafe" | "other";

export type SlotLike = {
  title?: string;
  summary?: string;
  place_id?: string;
  start_time?: string;
  end_time?: string;
  suggested_duration_minutes?: number;
  estimated_cost?: number;
  price_vnd?: number;
  price_source?: string;
  notes?: string;
  weather_note?: string;
  crowdedness_hint?: string;
  category?: ItineraryActivityCategory;
  cuisine_type?: ItineraryCuisineType;
  image_preview_url?: string;
  image_preview_urls?: string[];
  maps_url?: string;
};

export type DayPlanLike = {
  day: number;
  date: string;
  theme: string;
  activities?: SlotLike[];
  morning?: SlotLike;
  afternoon?: SlotLike;
  evening?: SlotLike;
};

export type AgendaSlotBucket = "morning" | "afternoon" | "evening";

const LEGACY_SLOT_KEYS: AgendaSlotBucket[] = ["morning", "afternoon", "evening"];

export function parseTimeToMinutes(time?: string | null): number {
  if (!time?.trim()) return 24 * 60;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 24 * 60;
  return Number.parseInt(m[1]!, 10) * 60 + Number.parseInt(m[2]!, 10);
}

export function slotHasContent(slot?: SlotLike | null): boolean {
  const title = slot?.title?.trim() ?? "";
  return title.length > 0 && title !== "—";
}

export function inferSlotBucket(startTime?: string | null): AgendaSlotBucket {
  const mins = parseTimeToMinutes(startTime ?? undefined);
  if (mins < 11 * 60 + 30) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

export function legacySlotsToActivities(day: DayPlanLike): SlotLike[] {
  const out: SlotLike[] = [];
  for (const key of LEGACY_SLOT_KEYS) {
    const slot = day[key];
    if (slotHasContent(slot)) out.push({ ...slot! });
  }
  return out;
}

export function sortActivitiesByTime(activities: SlotLike[]): SlotLike[] {
  return [...activities].sort(
    (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
  );
}

/** Primary read path for UI + enrichment. */
export function getDayActivities(day: DayPlanLike): SlotLike[] {
  const fromArray = day.activities?.filter(slotHasContent) ?? [];
  if (fromArray.length > 0) return sortActivitiesByTime(fromArray);
  return legacySlotsToActivities(day);
}

export function ensureDayActivities(day: DayPlanLike): DayPlanLike & { activities: SlotLike[] } {
  const activities = getDayActivities(day);
  return { ...day, activities };
}

/** Keep legacy JSON fields for older clients / trip_days columns. */
export function syncLegacyDaySlots(day: DayPlanLike & { activities: SlotLike[] }): DayPlanLike & {
  activities: SlotLike[];
} {
  const byBucket: Partial<Record<AgendaSlotBucket, SlotLike>> = {};
  for (const activity of day.activities) {
    const bucket = inferSlotBucket(activity.start_time);
    if (!byBucket[bucket]) byBucket[bucket] = activity;
  }
  return {
    ...day,
    morning: byBucket.morning ?? day.morning ?? { title: "", summary: "" },
    afternoon: byBucket.afternoon ?? day.afternoon ?? { title: "", summary: "" },
    evening: byBucket.evening ?? day.evening ?? { title: "", summary: "" },
  };
}

export function finalizeDayPlan(day: DayPlanLike): DayPlanLike & { activities: SlotLike[] } {
  return syncLegacyDaySlots(ensureDayActivities(day));
}

export function iterateDaySlots(
  day: DayPlanLike,
  fn: (slot: SlotLike, index: number) => SlotLike
): DayPlanLike & { activities: SlotLike[] } {
  const base = finalizeDayPlan(day);
  const activities = base.activities.map(fn);
  return finalizeDayPlan({ ...base, activities });
}

export function countItineraryPlaces(days: DayPlanLike[]): number {
  let n = 0;
  for (const day of days) {
    n += getDayActivities(day).length;
  }
  return n;
}

export function targetActivitiesPerDay(pace: string): { min: number; max: number } {
  const p = pace.toLowerCase();
  if (p === "relaxed" || p.includes("relax") || p.includes("nhẹ")) return { min: 3, max: 4 };
  if (p === "packed" || p.includes("pack") || p.includes("dày") || p.includes("nhanh") || p.includes("fast")) return { min: 6, max: 8 };
  return { min: 5, max: 6 };
}
