import { env } from "../lib/env.js";
import { resolveCityFocus } from "@wander-tale/hotel-booking-agent";
import { geocodeText, isVietmapConfigured } from "../lib/vietmap.js";
import { geocodeDestination as googleGeocodeDestination, isGoogleMapsConfigured } from "./googleMaps.js";

/** OpenWeather direct geocoding — không cần Google Maps API */
export async function geocodeWithOpenWeather(query: string): Promise<{
  lat: number;
  lng: number;
  formatted_address?: string;
}> {
  if (!env.OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY is not configured");
  }
  const params = new URLSearchParams({
    q: query.trim(),
    limit: "1",
    appid: env.OPENWEATHER_API_KEY,
  });
  const r = await fetch(`https://api.openweathermap.org/geo/1.0/direct?${params}`);
  const raw = (await r.json()) as
    | Array<{ name: string; lat: number; lon: number; country?: string; state?: string }>
    | { cod?: number | string; message?: string };
  if (!r.ok || (!Array.isArray(raw) && raw.cod != null)) {
    const err = !Array.isArray(raw) ? raw : null;
    const msg = err?.message ?? `HTTP ${r.status}`;
    if (String(err?.cod) === "401") {
      throw new Error(
        "OpenWeather API key không hợp lệ hoặc chưa kích hoạt (key mới có thể mất ~2 giờ). Kiểm tra OPENWEATHER_API_KEY trong .env."
      );
    }
    throw new Error(`OpenWeather geocoding: ${msg}`);
  }
  const data = raw as Array<{ name: string; lat: number; lon: number; country?: string; state?: string }>;
  if (!Array.isArray(data) || !data.length) {
    throw new Error(`Không tìm thấy tọa độ cho "${query}" — thử "Đà Nẵng, VN" hoặc "Hanoi, Vietnam".`);
  }
  const hit = data[0];
  const label = [hit.name, hit.state, hit.country].filter(Boolean).join(", ");
  return { lat: hit.lat, lng: hit.lon, formatted_address: label || query };
}

/** Ưu tiên centroid thành phố → VietMap (focus đúng) → OpenWeather → Google. */
export async function resolveDestinationCoords(destination: string): Promise<{
  lat: number;
  lng: number;
  formatted_address?: string;
}> {
  const known = resolveCityFocus(destination);
  if (known) {
    return { lat: known.lat, lng: known.lng, formatted_address: known.label };
  }

  if (isVietmapConfigured()) {
    try {
      const v = await geocodeText(destination, null);
      return { lat: v.lat, lng: v.lng, formatted_address: v.formatted_address };
    } catch (vietmapErr) {
      console.warn("[geocode] VietMap failed, fallback:", vietmapErr);
    }
  }
  if (env.OPENWEATHER_API_KEY) {
    try {
      return await geocodeWithOpenWeather(destination);
    } catch (openWeatherErr) {
      if (!isGoogleMapsConfigured()) {
        throw openWeatherErr;
      }
    }
  }
  if (isGoogleMapsConfigured()) {
    const g = await googleGeocodeDestination(destination);
    return { lat: g.lat, lng: g.lng, formatted_address: g.formatted_address };
  }
  throw new Error("Cần OPENWEATHER_API_KEY hoặc GOOGLE_MAPS_API_KEY trong .env");
}

export async function fetchWeatherForecast(lat: number, lon: number): Promise<unknown> {
  if (!env.OPENWEATHER_API_KEY) {
    throw new Error("OPENWEATHER_API_KEY is not configured");
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: env.OPENWEATHER_API_KEY,
    units: "metric",
    cnt: "40",
  });
  const r = await fetch(`https://api.openweathermap.org/data/2.5/forecast?${params}`);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenWeatherMap error ${r.status}: ${t}`);
  }
  return r.json();
}
