import { getCachedCoords, setCachedCoords } from "./placeCoordsCache.js";
import { geocodeNearFocus, geocodeText, isVietmapConfigured } from "./vietmap.js";
import { otaSearchLabel, resolveCityFocus } from "@wander-tale/hotel-booking-agent";

const USER_AGENT = "WanderTale/1.0 (travel-planner; contact@wandertale.app)";
let lastRequestAt = 0;

async function throttleNominatim(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastRequestAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/** OSM Nominatim — free, no API key. Max ~1 req/s. */
export async function resolveCoordinates(
  title: string,
  destination: string,
  focus?: { lat: number; lng: number } | null
): Promise<{ lat: number; lng: number; display_name?: string } | null> {
  const cached = await getCachedCoords(title, destination);
  if (cached) return cached;

  const q = `${title}, ${otaSearchLabel(destination)}`.trim();

  if (isVietmapConfigured()) {
    try {
      const cityFocus = resolveCityFocus(destination);
      const geocodeFocus = cityFocus ?? focus ?? null;
      const geo = geocodeFocus
        ? await geocodeNearFocus(q, geocodeFocus, { maxRadiusKm: 50 })
        : await geocodeText(q, null);
      const coords = {
        lat: geo.lat,
        lng: geo.lng,
        display_name: geo.formatted_address,
      };
      void setCachedCoords(title, destination, coords).catch(console.error);
      return coords;
    } catch (e) {
      console.warn("[vietmap] slot geocode failed, fallback Nominatim:", q, e);
    }
  }

  await throttleNominatim();
  const nominatimQ = `${title}, ${destination}, Vietnam`.trim();
  const params = new URLSearchParams({
    q: nominatimQ,
    format: "json",
    limit: "1",
    addressdetails: "0",
  });

  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return null;

    const data = (await r.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const hit = data[0];
    if (!hit) return null;

    const coords = {
      lat: Number.parseFloat(hit.lat),
      lng: Number.parseFloat(hit.lon),
      display_name: hit.display_name,
    };
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

    void setCachedCoords(title, destination, coords).catch(console.error);
    return coords;
  } catch (e) {
    console.warn("[nominatim] resolve failed:", q, e);
    return null;
  }
}
