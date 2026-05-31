export function buildMapsSearchUrl(query: string): string {
  const q = query.trim();
  if (!q) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function buildMapsCoordUrl(lat: number, lng: number, label?: string): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return buildMapsSearchUrl(label ?? "");
  }
  const coords = `${lat},${lng}`;
  const q = label?.trim() ? `${coords} (${label.trim()})` : coords;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Ưu tiên tọa độ nếu có (lat/lng từ backend VietMap). */
export function buildMapsUrlForPlace(
  name: string,
  destination?: string,
  coords?: { lat?: number; lng?: number } | null,
  mapsUrl?: string | null
): string {
  if (mapsUrl?.includes("query=") && mapsUrl.match(/query=[^&]*\d+\.\d+/)) {
    return mapsUrl;
  }
  if (coords?.lat != null && coords?.lng != null) {
    return buildMapsCoordUrl(coords.lat, coords.lng, name);
  }
  if (mapsUrl) return mapsUrl;
  return buildMapsSearchUrl(destination ? `${name} ${destination}` : name);
}
