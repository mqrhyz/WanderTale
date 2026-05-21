import type { GeneratedItinerary, ItineraryDayPlan, ItinerarySlot } from "@wander-tale/shared/types";

export function parseTimeToMinutes(time?: string | null): number {
  if (!time?.trim()) return 24 * 60;
  const m = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 24 * 60;
  return Number.parseInt(m[1]!, 10) * 60 + Number.parseInt(m[2]!, 10);
}

export function slotHasContent(slot?: ItinerarySlot | null): boolean {
  const title = slot?.title?.trim() ?? "";
  return title.length > 0 && title !== "—";
}

export function legacySlotsToActivities(day: ItineraryDayPlan): ItinerarySlot[] {
  return [day.morning, day.afternoon, day.evening].filter(slotHasContent);
}

export function getDayActivities(day: ItineraryDayPlan): ItinerarySlot[] {
  const fromArray = day.activities?.filter(slotHasContent) ?? [];
  if (fromArray.length > 0) {
    return [...fromArray].sort(
      (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
    );
  }
  return legacySlotsToActivities(day);
}

export function formatSlotClock(time?: string | null): string {
  const trimmed = time?.trim() ?? "";
  if (trimmed.length >= 5 && trimmed[2] === ":") return trimmed.slice(0, 5);
  return trimmed || "—";
}

export function countItineraryPlaces(it?: GeneratedItinerary | null): number {
  let n = 0;
  for (const d of it?.days ?? []) n += getDayActivities(d).length;
  return n;
}

export function summarizeWeatherFromActivities(it?: GeneratedItinerary | null): string {
  const notes: string[] = [];
  for (const d of it?.days ?? []) {
    for (const slot of getDayActivities(d)) {
      const note = slot.weather_note?.trim();
      if (note && !notes.includes(note)) notes.push(note);
    }
  }
  if (notes.length === 0) return "Theo từng khung giờ";
  if (notes.length === 1) return notes[0]!.length > 28 ? `${notes[0]!.slice(0, 26)}…` : notes[0]!;
  return `${notes.length} điều kiện`;
}

const GENERIC_AGENDA =
  /^(buổi sáng|buổi chiều|buổi tối|tham quan|khám phá|hoạt động|ăn trưa|phố đi bộ|check-in|điểm check-in|công viên|công viên \/ view|thư giãn|ẩm thực)/i;

export function agendaNeedsSpecificPlaces(it?: GeneratedItinerary | null): boolean {
  if (!it?.days?.length) return false;
  for (const d of it.days) {
    for (const slot of getDayActivities(d)) {
      const title = slot.title?.trim() ?? "";
      if (!title || title === "—") return true;
      if (GENERIC_AGENDA.test(title)) return true;
      if (/buổi (sáng|chiều|tối)/i.test(title)) return true;
    }
  }
  return false;
}

export function agendaNeedsPlaceMedia(it?: GeneratedItinerary | null): boolean {
  if (!it?.days?.length) return false;
  if (agendaNeedsSpecificPlaces(it)) return false;
  for (const d of it.days) {
    for (const slot of getDayActivities(d)) {
      const title = slot.title?.trim() ?? "";
      if (!title || title === "—") continue;
      const count = slot.image_preview_urls?.length ?? (slot.image_preview_url ? 1 : 0);
      if (count < 1) return true;
    }
  }
  return false;
}

export type DayBlockData = {
  day_index: number;
  trip_date: string;
  theme: string | null;
  activities: ItinerarySlot[];
};

export function buildDayBlockData(day: ItineraryDayPlan): DayBlockData {
  return {
    day_index: day.day,
    trip_date: day.date,
    theme: day.theme,
    activities: getDayActivities(day),
  };
}

export function buildDayBlockFromLegacy(
  day_index: number,
  trip_date: string,
  theme: string | null,
  morning: Record<string, unknown>,
  afternoon: Record<string, unknown>,
  evening: Record<string, unknown>
): DayBlockData {
  const plan: ItineraryDayPlan = {
    day: day_index,
    date: trip_date,
    theme: theme ?? "",
    morning: morning as ItinerarySlot,
    afternoon: afternoon as ItinerarySlot,
    evening: evening as ItinerarySlot,
  };
  return buildDayBlockData(plan);
}
