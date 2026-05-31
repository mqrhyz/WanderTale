"use client";

import { useState } from "react";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildMapsSearchUrl } from "@/components/trip-detail/buildMapsUrl";
import { ImageLightbox } from "@/components/trip-detail/ImageLightbox";
import { ImagePreviewCarousel } from "@/components/trip-detail/ImagePreviewCarousel";
import { td } from "@/components/trip-detail/trip-detail-theme";
import {
  formatVnd,
  parseHotelRating,
  siteLabel,
  splitHotels,
} from "@/components/trip-detail/trip-detail-utils";
import { useCountUp } from "@/components/trip-detail/useCountUp";
import { dedupeRoomAmenities } from "@/lib/room-amenities";

const MAX_HOTEL_CARDS = 6;

function HotelStars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn("text-sm leading-none", i < count ? "text-amber-400" : "text-neutral-300")}
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}

function hotelImages(hotel: BookingSuggestion): string[] {
  if (hotel.image_preview_urls?.length) return hotel.image_preview_urls;
  if (hotel.image_preview_url) return [hotel.image_preview_url];
  return [];
}

function hotelMapsUrl(hotel: BookingSuggestion, destination?: string): string {
  if (hotel.maps_url) return hotel.maps_url;
  return buildMapsSearchUrl(destination ? `${hotel.name} ${destination}` : hotel.name);
}

function HotelCard({
  hotel,
  destination,
}: {
  hotel: BookingSuggestion;
  destination?: string;
}) {
  const stars = parseHotelRating(hotel.reason, hotel.price_level);
  const animatedPrice = useCountUp(hotel.price_vnd);
  const images = hotelImages(hotel);
  const mapsUrl = hotelMapsUrl(hotel, destination);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index = 0) => {
    if (images.length === 0) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const amenities = dedupeRoomAmenities(hotel.room_amenities, hotel.room_name);

  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-stretch", td.hotelAlt)}>
      <div className="flex min-w-0 flex-1 flex-col">
        <h4 className={cn("text-[15px] font-semibold leading-snug", td.textPrimary)}>{hotel.name}</h4>
        <p className={cn("mt-1 text-xs", td.textSecondary)}>{siteLabel(hotel.site)}</p>
        <div className="mt-1.5">
          <HotelStars count={stars} />
        </div>
        {hotel.room_name ? (
          <p className={cn("mt-2 text-sm font-medium leading-snug", td.textPrimary)}>{hotel.room_name}</p>
        ) : null}
        {amenities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amenities.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] leading-tight",
                  td.border,
                  td.textSecondary
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {hotel.avg_distance_km != null && (
          <p className={cn("mt-2 text-xs", td.textSecondary)}>
            Khoảng cách TB:{" "}
            <span className={cn("font-medium tabular-nums", td.textPrimary)}>
              {hotel.avg_distance_km} km
            </span>
          </p>
        )}
        {hotel.price_vnd != null && (
          <p className="mt-2">
            <span className={cn("text-lg font-semibold", td.accent)}>{formatVnd(animatedPrice)}</span>
            <span className={cn("ml-1 text-xs", td.textSecondary)}>/ đêm</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {hotel.url && (
            <a
              href={hotel.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                td.border,
                td.textPrimary,
                td.borderHover,
                td.focusRing
              )}
            >
              Xem phòng
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              td.border,
              td.textSecondary,
              td.borderHover,
              td.focusRing
            )}
          >
            Maps
            <MapPin className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>

      <div className="w-full shrink-0 sm:w-[148px]">
        <div
          className={cn(
            "aspect-[4/3] w-full overflow-hidden rounded-lg sm:aspect-auto sm:h-full sm:min-h-[148px]",
            td.surfaceElevated
          )}
        >
          <ImagePreviewCarousel
            key={`${hotel.url ?? hotel.name}-${images.length}`}
            images={images}
            alt={hotel.name}
            fallback={hotel.name.charAt(0).toUpperCase() || "H"}
            onOpen={() => openLightbox(0)}
            fit="contain"
          />
        </div>
      </div>

      <ImageLightbox
        images={images}
        alt={hotel.name}
        open={lightboxOpen}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </article>
  );
}

type Props = {
  hotels: BookingSuggestion[];
  otaPending: boolean;
  destination?: string;
  routeOptimization?: {
    status?: string;
    places?: Array<{ name: string }>;
    recommended_hotel_names?: string[];
  };
};

export function HotelSection({ hotels, otaPending, destination, routeOptimization }: Props) {
  const { recommended, alternatives } = splitHotels(hotels);
  const ordered = [...(recommended ? [recommended] : []), ...alternatives].slice(0, MAX_HOTEL_CARDS);
  const count = hotels.length;
  const siteSet = [...new Set(ordered.map((h) => h.site).filter(Boolean))];

  if (!otaPending && count === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={cn("text-lg font-semibold", td.textPrimary)}>Khách sạn (qua OTA)</h2>
        {count > 0 && (
          <span className={cn("rounded-md px-2 py-0.5 text-xs", td.surfaceElevated, td.textSecondary)}>
            {count} lựa chọn
          </span>
        )}
        {siteSet.map((s) => (
          <span
            key={s}
            className={cn("rounded-md px-2 py-0.5 text-xs font-medium", td.accentBgSoft, td.accent)}
          >
            {siteLabel(s)}
          </span>
        ))}
      </div>

      {routeOptimization?.status === "ok" && (routeOptimization.places?.length ?? 0) > 0 && (
        <p className={cn("text-sm", td.textSecondary)}>
          Agent quét giá trên Booking/Agoda/Vntrip, sau đó VietMap Matrix chọn khách sạn{" "}
          <span className={cn("font-medium", td.textPrimary)}>gần {routeOptimization.places!.length} điểm tham quan</span>
          {routeOptimization.recommended_hotel_names?.[0] && (
            <>
              {" "}
              — ưu tiên{" "}
              <span className={cn("font-medium", td.textPrimary)}>
                {routeOptimization.recommended_hotel_names[0]}
              </span>
            </>
          )}
          .
        </p>
      )}

      {otaPending && count === 0 ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-sm",
            td.border,
            td.surface,
            td.textSecondary
          )}
        >
          <Loader2 className={cn("h-4 w-4 animate-spin", td.accent)} aria-hidden />
          Giá phòng sẽ hiện sau vài giây…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ordered.map((h, i) => (
            <HotelCard key={`${h.name}-${h.site ?? ""}-${i}`} hotel={h} destination={destination} />
          ))}
        </div>
      )}
    </section>
  );
}
