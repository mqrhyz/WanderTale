"use client";

import { useState } from "react";
import { Clock, CloudSun, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import {
  formatTimeRange,
  resolveActivityTimes,
  resolveWeatherNote,
} from "@/lib/trip-agenda";
import { formatVnd, inferPlaceCategory } from "@/components/trip-detail/trip-detail-utils";
import { buildMapsSearchUrl } from "@/components/trip-detail/buildMapsUrl";
import { ImageLightbox } from "@/components/trip-detail/ImageLightbox";
import { ImagePreviewCarousel, slotImages } from "@/components/trip-detail/ImagePreviewCarousel";

type Props = {
  slot: Record<string, unknown> | undefined;
  destinationInitial: string;
  destination?: string;
};

export function PlaceCard({ slot, destinationInitial, destination }: Props) {
  const title = typeof slot?.title === "string" ? slot.title : "—";
  const summary = typeof slot?.summary === "string" ? slot.summary : null;
  const cost =
    typeof slot?.estimated_cost === "number"
      ? slot.estimated_cost
      : typeof slot?.price_vnd === "number"
        ? slot.price_vnd
        : null;
  const images = slotImages(slot).slice(0, 1);
  const mapsUrl =
    typeof slot?.maps_url === "string"
      ? slot.maps_url
      : title !== "—"
        ? buildMapsSearchUrl(destination ? `${title} ${destination}` : title)
        : null;
  const { start, end } = resolveActivityTimes(slot);
  const weatherNote = resolveWeatherNote(slot);
  const category = inferPlaceCategory(title, summary);
  const thumbInitial = title !== "—" ? title.charAt(0).toUpperCase() : destinationInitial;

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = () => {
    if (images.length === 0) return;
    setLightboxOpen(true);
  };

  return (
    <article
      className={cn(
        "group flex flex-col gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-stretch",
        td.border,
        td.surfaceRaised,
        td.borderHover
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={cn("text-[15px] font-semibold leading-snug", td.textPrimary)}>{title}</h4>
          <span
            className={cn("rounded-md px-2 py-0.5 text-xs", td.surfaceElevated, td.textSecondary)}
          >
            {category}
          </span>
        </div>

        {summary && (
          <p className={cn("mt-2 line-clamp-2 text-sm leading-relaxed", td.textSecondary)}>
            {summary}
          </p>
        )}

        {weatherNote && (
          <p className={cn("mt-2 flex items-start gap-1.5 text-xs leading-relaxed", td.textSecondary)}>
            <CloudSun className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", td.accent)} aria-hidden />
            <span>{weatherNote}</span>
          </p>
        )}

        <div className={cn("mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", td.textSecondary)}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatTimeRange(start, end)}
          </span>
          {cost != null && (
            <span className={cn("inline-flex items-center gap-1 font-medium", td.accent)}>
              <Tag className="h-3.5 w-3.5" aria-hidden />
              {formatVnd(cost)}
            </span>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center gap-1 font-medium", td.accent, td.focusRing)}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Maps
            </a>
          )}
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
            images={images}
            alt={title}
            fallback={thumbInitial}
            onOpen={images.length > 0 ? openLightbox : undefined}
            fit="contain"
          />
        </div>
      </div>

      {images.length > 0 && (
        <ImageLightbox
          images={images}
          alt={title}
          open={lightboxOpen}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}
