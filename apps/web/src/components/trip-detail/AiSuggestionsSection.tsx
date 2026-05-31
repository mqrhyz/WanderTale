"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import { formatVnd } from "@/components/trip-detail/trip-detail-utils";
import type { SuggestedPlace } from "@wander-tale/shared/types";
import { buildMapsUrlForPlace } from "@/components/trip-detail/buildMapsUrl";

type Props = {
  places: SuggestedPlace[];
  destination?: string;
};

export function AiSuggestionsSection({ places, destination }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (places.length === 0) return null;

  return (
    <section className={cn("rounded-xl border border-dashed", td.borderSubtle, td.surface)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn("flex w-full items-center justify-between px-4 py-4 text-left", td.focusRing)}
      >
        <h2 className={cn("text-lg font-semibold", td.textPrimary)}>Địa điểm AI gợi ý</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform duration-200 ease-out",
            td.textSecondary,
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <ul className={cn("grid gap-3 border-t p-4 sm:grid-cols-2", td.borderSubtle)}>
            {places.map((p) => (
              <li
                key={p.name}
                className={cn("rounded-lg border p-3", td.borderSubtle, td.surfaceRaised)}
              >
                <div className="flex gap-3">
                  {p.image_preview_url && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_preview_url}
                        alt={p.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", td.textPrimary)}>{p.name}</p>
                    {p.note && (
                      <p className={cn("mt-1 line-clamp-2 text-xs", td.textSecondary)}>{p.note}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {p.day != null && (
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs",
                            td.surfaceElevated,
                            td.textSecondary
                          )}
                        >
                          Ngày {p.day}
                        </span>
                      )}
                      {p.duration_minutes != null && (
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-xs",
                            td.surfaceElevated,
                            td.textSecondary
                          )}
                        >
                          ~{p.duration_minutes} phút
                        </span>
                      )}
                      {p.estimated_cost_vnd != null && (
                        <span className={cn("text-xs font-medium", td.accent)}>
                          {formatVnd(p.estimated_cost_vnd)}
                        </span>
                      )}
                      {(p.maps_url || p.name) && (
                        <a
                          href={buildMapsUrlForPlace(
                            p.name,
                            destination,
                            { lat: p.lat, lng: p.lng },
                            p.maps_url
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("text-xs font-medium", td.accent, td.focusRing)}
                        >
                          Maps →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
