export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `từ ${start}`;
  if (end) return `đến ${end}`;
  return "";
}

export function resolveActivityTimes(
  slot: Record<string, unknown> | undefined
): { start: string; end: string } {
  const start = typeof slot?.start_time === "string" && slot.start_time.trim() ? slot.start_time.trim() : "";
  const end = typeof slot?.end_time === "string" && slot.end_time.trim() ? slot.end_time.trim() : "";
  return { start, end };
}

export function resolveWeatherNote(slot: Record<string, unknown> | undefined): string | null {
  if (typeof slot?.weather_note === "string" && slot.weather_note.trim()) return slot.weather_note.trim();
  return null;
}
