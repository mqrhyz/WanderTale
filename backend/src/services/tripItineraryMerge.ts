/** Merge lat/lng/maps từ coordDays, giữ image_preview_* từ mediaDays. */
import type { GeneratedItinerary } from "./openaiItinerary.js";
import { getDayActivities, iterateDaySlots } from "./tripAgendaActivities.js";

function slotMediaFields(slot: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof slot.image_preview_url === "string" && slot.image_preview_url.trim()) {
    out.image_preview_url = slot.image_preview_url;
  }
  if (Array.isArray(slot.image_preview_urls) && slot.image_preview_urls.length > 0) {
    out.image_preview_urls = slot.image_preview_urls;
  }
  return out;
}

function coordFields(slot: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof slot.maps_url === "string" && slot.maps_url.trim()) out.maps_url = slot.maps_url;
  if (typeof slot.address === "string" && slot.address.trim()) out.address = slot.address;
  if (typeof slot.lat === "number" && Number.isFinite(slot.lat)) out.lat = slot.lat;
  if (typeof slot.lng === "number" && Number.isFinite(slot.lng)) out.lng = slot.lng;
  return out;
}

function findSlotByTitle(day: GeneratedItinerary["days"][number], title: string) {
  const key = title.trim().toLowerCase();
  return getDayActivities(day).find((s) => (s.title ?? "").trim().toLowerCase() === key);
}

export function mergeItineraryDaysPreserveMedia<T extends GeneratedItinerary>(
  mediaItinerary: T,
  coordItinerary: T
): T["days"] {
  return mediaItinerary.days.map((day, dayIndex) => {
    const coordDay = coordItinerary.days[dayIndex];
    if (!coordDay) return day;

    return iterateDaySlots(day, (slot) => {
      const title = String(slot.title ?? "").trim();
      const mediaSlot = slot as Record<string, unknown>;
      const coordSlot = title ? (findSlotByTitle(coordDay, title) as Record<string, unknown> | undefined) : undefined;
      if (!coordSlot) return slot;
      return {
        ...slot,
        ...coordFields(coordSlot),
        ...slotMediaFields(mediaSlot),
      } as typeof slot;
    });
  }) as T["days"];
}

export function mergeItineraryPreserveMedia<T extends GeneratedItinerary>(
  mediaItinerary: T,
  coordItinerary: T
): T {
  return {
    ...coordItinerary,
    days: mergeItineraryDaysPreserveMedia(mediaItinerary, coordItinerary),
    hotel_suggestions: coordItinerary.hotel_suggestions.map((h, i) => {
      const mediaH = mediaItinerary.hotel_suggestions[i];
      if (!mediaH) return h;
      return {
        ...h,
        ...slotMediaFields(mediaH as Record<string, unknown>),
      };
    }),
  } as T;
}
