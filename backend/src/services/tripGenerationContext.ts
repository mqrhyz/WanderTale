import { getSupabase } from "../lib/supabase.js";
import type { TripGenerateInput } from "../schemas/trip.js";
import { searchPlacesOptional } from "../lib/placesProvider.js";
import { fetchWeatherForecast, resolveDestinationCoords } from "./weatherService.js";

export interface TripGenerationContext {
  dates: string[];
  lat: number;
  lng: number;
  weather: unknown;
  places: unknown;
  traffic: unknown;
  vouchers: unknown[];
}

export function enumerateTripDates(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = new Date(`${start}T12:00:00.000Z`);
  const last = new Date(`${end}T12:00:00.000Z`);
  if (cur > last) throw new Error("end_date must be on or after start_date");
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86400000);
  }
  return out;
}

async function loadVouchersForPrompt(): Promise<unknown[]> {
  const sb = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("vouchers")
    .select("id, code, title, description, discount_percent, discount_amount, valid_from, valid_until, partners(name)")
    .lte("valid_from", today)
    .gte("valid_until", today);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function buildTripGenerationContext(
  body: TripGenerateInput,
  opts?: { onWeatherReady?: (ctx: TripGenerationContext) => void }
): Promise<TripGenerationContext> {
  const dates = enumerateTripDates(body.start_date, body.end_date);
  const geo = await resolveDestinationCoords(body.destination);
  const lat = geo.lat;
  const lng = geo.lng;

  const weather = await fetchWeatherForecast(lat, lng);
  const partial: TripGenerationContext = {
    dates,
    lat,
    lng,
    weather,
    places: { status: "loading" },
    traffic: { status: "skipped" },
    vouchers: [],
  };
  opts?.onWeatherReady?.(partial);

  const [places, vouchers] = await Promise.all([
    searchPlacesOptional(`${body.destination} attractions food culture`, lat, lng),
    loadVouchersForPrompt(),
  ]);

  return {
    ...partial,
    places,
    vouchers,
  };
}

/** P2 skeleton: chỉ geo + thời tiết (~1–2s), bỏ Google Places/voucher trước response. */
export async function buildMinimalTripContextForSkeleton(body: TripGenerateInput): Promise<TripGenerationContext> {
  const dates = enumerateTripDates(body.start_date, body.end_date);
  const geo = await resolveDestinationCoords(body.destination);
  const weather = await fetchWeatherForecast(geo.lat, geo.lng);
  return {
    dates,
    lat: geo.lat,
    lng: geo.lng,
    weather,
    places: { status: "skipped" },
    traffic: { status: "skipped" },
    vouchers: [],
  };
}
