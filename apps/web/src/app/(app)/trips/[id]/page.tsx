"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AiSuggestionsSection } from "@/components/trip-detail/AiSuggestionsSection";
import { DayBlock } from "@/components/trip-detail/DayBlock";
import { HotelSection } from "@/components/trip-detail/HotelSection";
import { td } from "@/components/trip-detail/trip-detail-theme";
import { TripDetailHeader } from "@/components/trip-detail/TripDetailHeader";
import { TripHeroMap } from "@/components/trip-detail/TripHeroMap";
import { TripSummaryRow } from "@/components/trip-detail/TripSummaryRow";
import { cn } from "@/lib/cn";
import {
  countItineraryPlaces,
  summarizeWeatherFromActivities,
  agendaNeedsSpecificPlaces,
  agendaNeedsPlaceMedia,
  buildDayBlockData,
  buildDayBlockFromLegacy,
  type DayBlockData,
} from "@/lib/trip-agenda-activities";
import { apiFetch } from "@/lib/api";
import { useTripStream } from "@/hooks/useTripStream";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedItinerary } from "@wander-tale/shared/types";

interface TripDetail {
  id: string;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  summary: string | null;
  budget: number | null;
  start_date: string;
  end_date: string;
  total_estimated_cost: number | null;
  risk_warnings: string[] | null;
  itinerary_json: GeneratedItinerary | null;
  generation_status?: string | null;
  hotel_pricing_status?: string | null;
  map_preview_url?: string | null;
  trip_days: Array<{
    id: string;
    day_index: number;
    trip_date: string;
    theme: string | null;
    morning: Record<string, unknown>;
    afternoon: Record<string, unknown>;
    evening: Record<string, unknown>;
  }>;
}

function buildDayBlocks(trip: TripDetail): DayBlockData[] {
  const it = trip.itinerary_json;
  if (it?.days && it.days.length > 0) {
    return it.days.map((d) => buildDayBlockData(d));
  }
  return trip.trip_days.map((d) =>
    buildDayBlockFromLegacy(d.day_index, d.trip_date, d.theme, d.morning, d.afternoon, d.evening)
  );
}

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTrip(signal?: AbortSignal) {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error("Chưa đăng nhập");
    const data = (await apiFetch(`/api/trips/${params.id}`, token, { signal })) as TripDetail;
    setTrip(data);
    return data;
  }

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        await loadTrip(ac.signal);
      } catch (e) {
        if (!cancelled && !ac.signal.aborted) setErr(e instanceof Error ? e.message : "Lỗi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [params.id]);

  const needsLiveUpdates = useMemo(() => {
    if (!trip) return false;
    const otaPending =
      trip.generation_status === "pricing_pending" ||
      trip.generation_status === "generating" ||
      trip.hotel_pricing_status === "pending";
    const hotels = trip.itinerary_json?.hotel_suggestions ?? [];
    const waitingGallery =
      hotels.length > 0 &&
      hotels.some((h) => !h.image_preview_urls || h.image_preview_urls.length < 1);
    return (
      otaPending ||
      waitingGallery ||
      agendaNeedsSpecificPlaces(trip.itinerary_json) ||
      agendaNeedsPlaceMedia(trip.itinerary_json)
    );
  }, [trip]);

  const reloadTrip = useCallback(() => {
    void loadTrip().catch(() => undefined);
  }, [params.id]);

  const { failed: streamFailed } = useTripStream(params.id, {
    enabled: needsLiveUpdates,
    onReload: reloadTrip,
  });

  useEffect(() => {
    if (!needsLiveUpdates || !streamFailed) return;
    const started = Date.now();
    const maxMs = 240_000;
    const id = setInterval(() => {
      if (Date.now() - started > maxMs) {
        clearInterval(id);
        return;
      }
      void loadTrip().catch(() => undefined);
    }, 2500);
    return () => clearInterval(id);
  }, [needsLiveUpdates, streamFailed, params.id]);

  const derived = useMemo(() => {
    if (!trip) return null;
    const dayBlocks = buildDayBlocks(trip);
    const it = trip.itinerary_json;
    const otaPending =
      trip.generation_status === "pricing_pending" ||
      trip.generation_status === "generating" ||
      trip.hotel_pricing_status === "pending";
    const mapUrl = trip.map_preview_url ?? null;

    return {
      dayBlocks,
      it,
      otaPending,
      mapUrl,
      dayCount: dayBlocks.length || 1,
      placeCount: countItineraryPlaces(it),
      weatherSummary: summarizeWeatherFromActivities(it),
      destinationInitial: trip.destination.charAt(0).toUpperCase() || "W",
    };
  }, [trip]);

  if (loading) {
    return (
      <div className={cn("-mx-4 min-h-[40vh] px-4 sm:-mx-6 sm:px-6", td.page)}>
        <div className={cn("mt-8 h-20 animate-pulse rounded-xl", td.skeleton)} />
        <div className={cn("mt-6 h-32 animate-pulse rounded-xl", td.skeleton)} />
      </div>
    );
  }

  if (err || !trip || !derived) {
    return <p className={cn("text-sm", td.errorText)}>{err ?? "Không tìm thấy chuyến đi"}</p>;
  }

  const { dayBlocks, it, otaPending, mapUrl, dayCount, placeCount, weatherSummary, destinationInitial } =
    derived;

  return (
    <div
      className={cn(
        "-mx-4 min-h-screen px-4 pb-16 font-sans text-sm leading-relaxed sm:-mx-6 sm:px-6",
        td.page
      )}
    >
      <TripDetailHeader
        tripId={trip.id}
        destination={trip.destination}
        dayCount={dayCount}
        budget={trip.budget}
        otaPending={otaPending}
      />

      <div className="mt-6 space-y-12">
        {mapUrl && <TripHeroMap mapUrl={mapUrl} destination={trip.destination} />}

        {trip.summary && (
          <p className={cn("max-w-3xl text-sm leading-relaxed", td.textSecondary)}>{trip.summary}</p>
        )}

        <TripSummaryRow
          totalCost={trip.total_estimated_cost}
          dayCount={dayCount}
          placeCount={placeCount}
          weatherSummary={weatherSummary}
        />

        {trip.risk_warnings && trip.risk_warnings.length > 0 && (
          <div className={cn("rounded-xl border p-4", td.warningBox)}>
            <p className={cn("flex items-center gap-2 text-sm font-medium", td.warningText)}>
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Cảnh báo rủi ro
            </p>
            <ul className={cn("mt-3 space-y-1.5 text-sm", td.warningBody)}>
              {trip.risk_warnings.map((w) => (
                <li key={w}>· {w}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="space-y-6">
          <div>
            <h2 className={cn("text-lg font-semibold", td.textPrimary)}>Agenda theo ngày</h2>
            <p className={cn("mt-1 text-sm", td.textSecondary)}>
              Lịch dọc theo khung giờ — gợi ý địa điểm phù hợp thời tiết từng buổi.
            </p>
          </div>
          <div className="space-y-6">
            {dayBlocks.map((day) => (
              <DayBlock
                key={`${day.day_index}-${day.trip_date}`}
                day={day}
                destinationInitial={destinationInitial}
                destination={trip.destination}
              />
            ))}
          </div>
        </section>

        <HotelSection hotels={it?.hotel_suggestions ?? []} otaPending={otaPending} destination={trip.destination} />

        {it?.pricing_meta?.suggested_places && it.pricing_meta.suggested_places.length > 0 && (
          <AiSuggestionsSection places={it.pricing_meta.suggested_places} destination={trip.destination} />
        )}

        <div className={cn("flex flex-wrap gap-2 border-t pt-6", td.footerBorder)}>
          <button
            type="button"
            onClick={async () => {
              const supabase = createClient();
              const { data: session } = await supabase.auth.getSession();
              const token = session.session?.access_token;
              if (!token) return;
              const dup = (await apiFetch(`/api/trips/${params.id}/duplicate`, token, {
                method: "POST",
              })) as { id: string };
              router.push(`/trips/${dup.id}`);
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs transition-colors",
              td.border,
              td.textSecondary,
              td.borderHover,
              "hover:text-[#1A1A1A] dark:hover:text-[#F2F2F2]",
              td.focusRing
            )}
          >
            Nhân đôi chuyến
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Xóa chuyến này?")) return;
              const supabase = createClient();
              const { data: session } = await supabase.auth.getSession();
              const token = session.session?.access_token;
              if (!token) return;
              await apiFetch(`/api/trips/${params.id}`, token, { method: "DELETE" });
              router.push("/dashboard");
            }}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs transition-colors",
              td.errorBorder,
              td.errorText,
              td.errorHover,
              td.focusRing
            )}
          >
            Xóa chuyến
          </button>
        </div>
      </div>
    </div>
  );
}
