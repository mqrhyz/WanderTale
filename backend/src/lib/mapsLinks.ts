export function buildGoogleMapsSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Google Maps — ghim đúng tọa độ (ưu tiên hơn search theo tên). */
export function buildGoogleMapsCoordUrl(lat: number, lng: number, label?: string): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return buildGoogleMapsSearchUrl(label ?? "");
  }
  const coords = `${lat},${lng}`;
  const q = label?.trim() ? `${coords} (${label.trim()})` : coords;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** URL Maps: tọa độ VietMap → Google Maps; không có tọa độ → search fallback. */
export function buildMapsUrl(title: string, coords?: { lat: number; lng: number } | null): string {
  const label = title.trim();
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    return buildGoogleMapsCoordUrl(coords.lat, coords.lng, label);
  }
  return buildGoogleMapsSearchUrl(label);
}
