import { env } from "../lib/env.js";

/** Key thật (không placeholder AIza... trong .env mẫu). */
export function isGoogleMapsConfigured(): boolean {
  const key = env.GOOGLE_MAPS_API_KEY?.trim() ?? "";
  if (key.length < 35) return false;
  if (key.includes("...")) return false;
  return key.startsWith("AIza");
}

export async function geocodeDestination(address: string): Promise<{
  lat: number;
  lng: number;
  formatted_address?: string;
  raw: unknown;
}> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }
  const params = new URLSearchParams({
    address,
    key: env.GOOGLE_MAPS_API_KEY,
  });
  const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  if (!r.ok) throw new Error(`Geocoding HTTP ${r.status}`);
  const data = (await r.json()) as {
    status: string;
    results?: Array<{ formatted_address?: string; geometry: { location: { lat: number; lng: number } } }>;
  };
  if (data.status !== "OK" || !data.results?.length) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }
  const loc = data.results[0].geometry.location;
  return {
    lat: loc.lat,
    lng: loc.lng,
    formatted_address: data.results[0].formatted_address,
    raw: data,
  };
}

export async function placesTextSearch(
  query: string,
  lat: number | null,
  lng: number | null,
  options?: { maxResultCount?: number; fieldMask?: string }
): Promise<unknown> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }
  const body: Record<string, unknown> = {
    textQuery: query,
    languageCode: "vi",
    maxResultCount: options?.maxResultCount ?? 8,
  };
  if (lat != null && lng != null) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 8000 },
    };
  }
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        options?.fieldMask ??
        "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.priceLevel,places.businessStatus",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Places search failed: ${r.status} ${t}`);
  }
  const data = (await r.json()) as { places?: Array<{ businessStatus?: string }> };
  // Loại địa điểm đã đóng cửa vĩnh viễn/tạm thời — AI không nên đề xuất.
  if (Array.isArray(data.places)) {
    data.places = data.places.filter(
      (p) => p?.businessStatus !== "CLOSED_PERMANENTLY" && p?.businessStatus !== "CLOSED_TEMPORARILY"
    );
  }
  return data;
}

export type GooglePlacePhotoCandidate = {
  placeId: string;
  displayName: string;
  photoResourceName: string;
  lat?: number;
  lng?: number;
};

/** Text Search kèm photos[] — dùng cho agenda thumbnail nhanh. */
export async function placesTextSearchPhotoCandidates(
  query: string,
  lat: number | null,
  lng: number | null,
  maxResultCount = 5
): Promise<GooglePlacePhotoCandidate[]> {
  const data = (await placesTextSearch(query, lat, lng, {
    maxResultCount,
    fieldMask: "places.id,places.displayName,places.photos,places.location,places.formattedAddress",
  })) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      photos?: Array<{ name?: string }>;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const out: GooglePlacePhotoCandidate[] = [];
  for (const p of data.places ?? []) {
    const placeId = p.id?.trim();
    const displayName = p.displayName?.text?.trim();
    const photoResourceName = p.photos?.[0]?.name?.trim();
    if (!placeId || !displayName || !photoResourceName) continue;
    out.push({
      placeId,
      displayName,
      photoResourceName,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    });
  }
  return out;
}

/** Lấy photoUri (googleusercontent) — short-lived nhưng đủ hiển thị + cache. */
export async function getPlacePhotoMediaUrl(photoResourceName: string): Promise<string | null> {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  const name = photoResourceName.replace(/\/media$/i, "");
  const params = new URLSearchParams({
    maxWidthPx: "800",
    maxHeightPx: "600",
    skipHttpRedirect: "true",
  });
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?${params}`, {
    headers: { "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { photoUri?: string };
  return data.photoUri?.trim() || null;
}

/** Static map hero (web trip detail) — key chỉ dùng server-side. */
export function buildStaticMapUrl(lat: number, lng: number): string | null {
  if (!isGoogleMapsConfigured()) return null;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "12",
    size: "960x300",
    scale: "2",
    key: env.GOOGLE_MAPS_API_KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

/** Không throw — dùng khi Google Places tùy chọn (chỉ OpenWeather + OpenAI vẫn tạo được lịch). */
export async function placesTextSearchOptional(
  query: string,
  lat: number | null,
  lng: number | null
): Promise<unknown> {
  if (!isGoogleMapsConfigured()) {
    return {
      places: [],
      status: "skipped",
      message:
        "GOOGLE_MAPS_API_KEY chưa cấu hình — gợi ý địa điểm do AI sinh từ kiến thức địa phương.",
    };
  }
  try {
    return await placesTextSearch(query, lat, lng);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[googleMaps] placesTextSearch failed:", message);
    return {
      places: [],
      status: "error",
      message,
    };
  }
}
