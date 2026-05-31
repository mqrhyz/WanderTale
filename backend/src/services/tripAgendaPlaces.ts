import type { GeneratedItinerary } from "./openaiItinerary.js";
import type { SuggestedPlace } from "./tripSuggestPlaces.js";
import { iterateDaySlots } from "./tripAgendaActivities.js";
import { isGenericAgendaTitle } from "./tripAgendaUtils.js";

function placesForDay(places: SuggestedPlace[], dayNum: number): SuggestedPlace[] {
  const onDay = places.filter((p) => p.day === dayNum);
  return onDay.length > 0 ? onDay : places;
}

function pickPlace(
  places: SuggestedPlace[],
  dayIndex: number,
  activityIndex: number,
  used: Set<string>
): SuggestedPlace | undefined {
  const dayNum = dayIndex + 1;
  const dayPlaces = placesForDay(places, dayNum);
  const ordered = [
    dayPlaces[activityIndex],
    ...dayPlaces,
    places[dayIndex * 5 + activityIndex],
    ...places.filter((p) => !used.has(p.name)),
  ];
  for (const p of ordered) {
    if (p && !used.has(p.name)) return p;
  }
  return undefined;
}

/** Gắn tên địa điểm cụ thể vào từng activity trong agenda. */
export function applySpecificPlacesToAgenda(
  itinerary: GeneratedItinerary,
  places: SuggestedPlace[]
): GeneratedItinerary {
  if (places.length === 0) return itinerary;

  const used = new Set<string>();
  const days = itinerary.days.map((day, dayIndex) =>
    iterateDaySlots(day, (slot, activityIndex) => {
      const title = typeof slot.title === "string" ? slot.title : "";
      if (!isGenericAgendaTitle(title)) return slot;

      const place = pickPlace(places, dayIndex, activityIndex, used);
      if (!place) return slot;

      used.add(place.name);
      return {
        ...slot,
        title: place.name,
        summary: slot.summary || place.note || "",
        estimated_cost: slot.estimated_cost ?? place.estimated_cost_vnd,
        suggested_duration_minutes: slot.suggested_duration_minutes ?? place.duration_minutes,
      };
    })
  );

  return { ...itinerary, days: days as GeneratedItinerary["days"] };
}
