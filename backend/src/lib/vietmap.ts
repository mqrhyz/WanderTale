import { env } from "./env.js";
import { OTA_CITY_LABELS, resolveCityFocus, resolveCityKey } from "@wander-tale/hotel-booking-agent";
import { getCachedValue, setCachedValue } from "../services/externalApiCache.js";

const VIETMAP_BASE = "https://maps.vietmap.vn/api";
const VIETMAP_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Trung tâm VN — bias khi chưa có focus GPS. */
export const VIETMAP_DEFAULT_FOCUS = { lat: 16.047079, lng: 108.20623 };

export type VietmapSearchHit = {
  ref_id: string;
  display: string;
  name?: string;
  address?: string;
  distance?: number;
  lat?: number;
  lng?: number;
  categories?: string[];
  entry_points?: unknown[];
};

export type VietmapMatrixResult = {
  distances: number[][];
  durations: number[][];
};

export type VietmapPlace = {
  lat: number;
  lng: number;
  display: string;
  name?: string;
  address?: string;
  city?: string;
  ward?: string;
};

export function isVietmapConfigured(): boolean {
  const key = env.VIETMAP_API_KEY?.trim() ?? "";
  return key.length >= 20;
}

/** Khoảng cách chim bay (km). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function resolveHitCoords(hit: VietmapSearchHit): Promise<{ lat: number; lng: number } | null> {
  if (
    hit.lat != null &&
    hit.lng != null &&
    Number.isFinite(hit.lat) &&
    Number.isFinite(hit.lng)
  ) {
    return { lat: hit.lat, lng: hit.lng };
  }
  try {
    const place = await placeV4(hit.ref_id);
    return { lat: place.lat, lng: place.lng };
  } catch {
    return null;
  }
}

function focusParam(focus?: { lat: number; lng: number } | null): string {
  const f = focus ?? VIETMAP_DEFAULT_FOCUS;
  return `${f.lat},${f.lng}`;
}

async function vietmapGet<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!isVietmapConfigured()) {
    throw new Error("VIETMAP_API_KEY is not configured");
  }
  const qs = new URLSearchParams({ ...params, apikey: env.VIETMAP_API_KEY.trim() });
  const r = await fetch(`${VIETMAP_BASE}${path}?${qs}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`VietMap HTTP ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json() as Promise<T>;
}

function stableVietmapCacheKey(kind: string, params: Record<string, string>): string {
  const entries = Object.entries(params)
    .map(([k, v]) => [k, v.trim().toLowerCase()] as const)
    .sort(([a], [b]) => a.localeCompare(b));
  return `vietmap:${kind}:${entries.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

export async function autocompleteV4(
  text: string,
  focus?: { lat: number; lng: number } | null
): Promise<VietmapSearchHit[]> {
  const q = text.trim();
  if (q.length < 2) return [];
  const params = {
    text: q,
    focus: focusParam(focus),
    display_type: "6",
  };
  const key = stableVietmapCacheKey("autocomplete", params);
  const cached = await getCachedValue<VietmapSearchHit[]>(key);
  if (cached) return cached;
  const data = await vietmapGet<VietmapSearchHit[]>("/autocomplete/v4", params);
  if (Array.isArray(data)) await setCachedValue(key, data, VIETMAP_CACHE_TTL_SECONDS, "vietmap_autocomplete");
  return Array.isArray(data) ? data : [];
}

function normalizeLoc(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim();
}

function addressCitySegment(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function isCityLevelHit(hit: VietmapSearchHit, cityLabel: string): boolean {
  const nameRaw = hit.name && hit.name.trim().length > 0 ? hit.name : (hit.display.split(",")[0] ?? "");
  const firstSeg = normalizeLoc(nameRaw);
  const core = normalizeLoc(cityLabel).replace(/^thanh pho /, "").replace(/^tinh /, "").trim();
  // Chỉ là cấp thành phố/tỉnh khi ĐOẠN ĐẦU (tên) chính là đơn vị hành chính,
  // tránh nhầm POI như "Vườn Hoa Thành Phố Đà Lạt" thành cấp thành phố.
  const isAdminFirst = /^(thanh pho|tinh|thi xa|quan|huyen)\b/.test(firstSeg);
  return isAdminFirst && core.length > 0 && firstSeg.includes(core);
}

/** POI phải thuộc đúng thành phố (theo đoạn cuối địa chỉ), tránh "Phở Hà Nội" ở Đà Nẵng. */
function hitMatchesDestinationCity(
  hit: VietmapSearchHit,
  cityKey: string,
  cityLabel: string
): boolean {
  if (isCityLevelHit(hit, cityLabel)) return true;

  const addrCity = normalizeLoc(addressCitySegment(hit.address || hit.display));
  const label = normalizeLoc(cityLabel);
  const key = normalizeLoc(cityKey);

  if (addrCity.includes(label)) return true;
  if (key.split(" ").every((part) => part.length > 2 && addrCity.includes(part))) return true;

  for (const [otherKey, otherLabel] of Object.entries(OTA_CITY_LABELS) as Array<[string, string]>) {
    if (otherKey === cityKey) continue;
    const otherNorm = normalizeLoc(otherLabel);
    if (addrCity.includes(otherNorm) || addrCity.includes(normalizeLoc(otherKey))) return false;
  }

  return false;
}

/** Autocomplete điểm đến — bias theo thành phố, lọc POI sai tỉnh/thành. */
export async function autocompleteTripDestination(
  text: string,
  userFocus?: { lat: number; lng: number } | null
): Promise<VietmapSearchHit[]> {
  const q = text.trim();
  if (q.length < 2) return [];

  const cityFocus = resolveCityFocus(q);
  const focus =
    userFocus ?? (cityFocus ? { lat: cityFocus.lat, lng: cityFocus.lng } : null);

  let hits = await autocompleteV4(q, focus);

  if (cityFocus) {
    const inCity = hits.filter((h) =>
      hitMatchesDestinationCity(h, cityFocus.key, cityFocus.label)
    );
    if (inCity.length > 0) hits = inCity;

    const qNorm = normalizeLoc(q);
    const labelNorm = normalizeLoc(cityFocus.label);
    const keyNorm = normalizeLoc(resolveCityKey(q));

    // Bỏ từ hành chính trước khi đếm token (tránh "Thành Phố Đà Lạt" bị tính 4 token).
    const adminWords = /\b(thanh pho|tinh|thi xa|tp|quan|huyen|phuong|xa)\b/g;
    const qCore = qNorm.replace(adminWords, "").replace(/\s+/g, " ").trim();
    const labelCore = labelNorm.replace(adminWords, "").replace(/\s+/g, " ").trim();
    const qCoreTokens = qCore ? qCore.split(" ").length : 0;
    const labelCoreTokens = labelCore ? labelCore.split(" ").length : 1;

    // Nếu user chỉ nhập tên thành phố (phần lõi ≈ tên thành phố) → chỉ trả city-level (hoặc rỗng).
    const isSimpleCityQuery =
      qCoreTokens <= labelCoreTokens + 1 &&
      (qCore.includes(labelCore) || qNorm.includes(keyNorm) || labelCore.includes(qCore));

    if (isSimpleCityQuery) {
      const cityHits = hits.filter((h) => isCityLevelHit(h, cityFocus.label));
      if (cityHits.length > 0) return cityHits.slice(0, 4);
      return [];
    }
  }

  return hits.slice(0, 6);
}

export async function searchV4(
  text: string,
  focus?: { lat: number; lng: number } | null
): Promise<VietmapSearchHit[]> {
  const q = text.trim();
  if (!q) return [];
  const params = {
    text: q,
    focus: focusParam(focus),
    display_type: "6",
  };
  const key = stableVietmapCacheKey("search", params);
  const cached = await getCachedValue<VietmapSearchHit[]>(key);
  if (cached) return cached;
  const data = await vietmapGet<VietmapSearchHit[]>("/search/v4", params);
  if (Array.isArray(data)) await setCachedValue(key, data, VIETMAP_CACHE_TTL_SECONDS, "vietmap_search");
  return Array.isArray(data) ? data : [];
}

export async function placeV4(refId: string): Promise<VietmapPlace> {
  const key = `vietmap:place:${refId.trim().toLowerCase()}`;
  const cached = await getCachedValue<VietmapPlace>(key);
  if (cached) return cached;
  const data = await vietmapGet<VietmapPlace & { ref_id?: string }>("/place/v4", {
    refid: refId,
  });
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
    throw new Error("VietMap Place v4: missing coordinates");
  }
  await setCachedValue(key, data, VIETMAP_CACHE_TTL_SECONDS, "vietmap_place");
  return data;
}

export async function reverseV4(
  lat: number,
  lng: number
): Promise<VietmapSearchHit[]> {
  const data = await vietmapGet<VietmapSearchHit[]>("/reverse/v4", {
    lat: String(lat),
    lng: String(lng),
    display_type: "6",
  });
  return Array.isArray(data) ? data : [];
}

/** Resolve text → lat/lng via Search v4 + Place v4. */
export async function geocodeText(
  text: string,
  focus?: { lat: number; lng: number } | null
): Promise<{ lat: number; lng: number; formatted_address: string; ref_id?: string }> {
  const hits = await searchV4(text, focus);
  const hit = hits[0];
  if (!hit) {
    throw new Error(`Không tìm thấy tọa độ cho "${text}" trên VietMap.`);
  }
  const coords = await resolveHitCoords(hit);
  if (!coords) {
    throw new Error(`Không lấy được tọa độ cho "${text}" trên VietMap.`);
  }
  return {
    lat: coords.lat,
    lng: coords.lng,
    formatted_address: hit.display,
    ref_id: hit.ref_id,
  };
}

/** Chọn hit gần focus nhất trong bán kính — tránh POI cùng tên ở tỉnh khác. */
export async function geocodeNearFocus(
  text: string,
  focus: { lat: number; lng: number },
  options?: { maxRadiusKm?: number; maxHits?: number }
): Promise<{ lat: number; lng: number; formatted_address: string; ref_id?: string }> {
  const maxRadiusKm = options?.maxRadiusKm ?? 50;
  const maxHits = options?.maxHits ?? 8;
  const hits = await searchV4(text, focus);

  type BestRow = {
    lat: number;
    lng: number;
    formatted_address: string;
    ref_id?: string;
    dist: number;
  };
  let bestInRadius: BestRow | null = null;
  let bestAny: BestRow | null = null;

  for (const hit of hits.slice(0, maxHits)) {
    const coords = await resolveHitCoords(hit);
    if (!coords) continue;
    const dist = haversineKm(focus, coords);
    const row = {
      lat: coords.lat,
      lng: coords.lng,
      formatted_address: hit.display,
      ref_id: hit.ref_id,
      dist,
    };
    if (!bestAny || dist < bestAny.dist) bestAny = row;
    if (dist <= maxRadiusKm && (!bestInRadius || dist < bestInRadius.dist)) {
      bestInRadius = row;
    }
  }

  const picked = bestInRadius ?? bestAny;
  if (!picked) {
    throw new Error(`Không tìm thấy tọa độ cho "${text}" trên VietMap.`);
  }
  if (picked.dist > maxRadiusKm * 2.5) {
    throw new Error(
      `"${text}" quá xa điểm đến (~${Math.round(picked.dist)} km) — bỏ qua geocode.`
    );
  }

  return {
    lat: picked.lat,
    lng: picked.lng,
    formatted_address: picked.formatted_address,
    ref_id: picked.ref_id,
  };
}

/** POI / địa điểm quanh điểm đến — thay Google Places cho LLM context. */
export async function placesSearchOptional(
  query: string,
  lat: number | null,
  lng: number | null
): Promise<unknown> {
  if (!isVietmapConfigured()) {
    return {
      places: [],
      status: "skipped",
      message: "VIETMAP_API_KEY chưa cấu hình — gợi ý địa điểm do AI sinh.",
    };
  }
  try {
    const focus = lat != null && lng != null ? { lat, lng } : null;
    const hits = await searchV4(query, focus);
    const top = hits.slice(0, 8);
    const places = await Promise.all(
      top.map(async (hit) => {
        try {
          const place = await placeV4(hit.ref_id);
          return {
            name: hit.name || place.name || hit.display,
            formattedAddress: hit.display,
            location: { latitude: place.lat, longitude: place.lng },
            ref_id: hit.ref_id,
          };
        } catch {
          return {
            name: hit.name || hit.display,
            formattedAddress: hit.display,
            ref_id: hit.ref_id,
          };
        }
      })
    );
    return { places, status: "ok", provider: "vietmap" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[vietmap] placesSearch failed:", message);
    return { places: [], status: "error", message };
  }
}

/** Ma trận khoảng cách/thời gian lái xe (mét / giây) giữa các điểm. */
export async function matrixRoutes(
  points: Array<{ lat: number; lng: number }>,
  vehicle = "car"
): Promise<VietmapMatrixResult> {
  if (!isVietmapConfigured()) {
    throw new Error("VIETMAP_API_KEY is not configured");
  }
  if (points.length < 2) {
    throw new Error("Matrix cần ít nhất 2 điểm");
  }
  const parts = [`apikey=${encodeURIComponent(env.VIETMAP_API_KEY.trim())}`, `vehicle=${encodeURIComponent(vehicle)}`];
  for (const p of points) {
    parts.push(`point=${encodeURIComponent(`${p.lat},${p.lng}`)}`);
  }
  const r = await fetch(`${VIETMAP_BASE}/matrix?${parts.join("&")}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`VietMap Matrix HTTP ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = (await r.json()) as {
    code?: string;
    distances?: number[][];
    durations?: number[][];
  };
  if (data.code !== "OK" || !data.distances || !data.durations) {
    throw new Error("VietMap Matrix: response không hợp lệ");
  }
  return { distances: data.distances, durations: data.durations };
}

/** Static map PNG — gọi từ backend (key trong form body). */
export async function fetchStaticMapPng(
  lat: number,
  lng: number,
  opts?: { zoom?: number; size?: string; address?: string }
): Promise<ArrayBuffer | null> {
  if (!isVietmapConfigured()) return null;
  const form = new FormData();
  form.set("lat", String(lat));
  form.set("lng", String(lng));
  form.set("apikey", env.VIETMAP_API_KEY.trim());
  form.set("zoom", String(opts?.zoom ?? 12));
  form.set("size", opts?.size ?? "960x300");
  if (opts?.address) form.set("address", opts.address);

  try {
    const r = await fetch(`${VIETMAP_BASE}/maps/statics/tm`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    return r.arrayBuffer();
  } catch (e) {
    console.warn("[vietmap] static map failed:", e);
    return null;
  }
}
