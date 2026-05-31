"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import { PlaceCard } from "@/components/trip-detail/PlaceCard";
import { formatSlotClock, type DayBlockData } from "@/lib/trip-agenda-activities";

type Props = {
  day: DayBlockData;
  destinationInitial: string;
  destination?: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
};

export function DayBlock({
  day,
  destinationInitial,
  destination,
  defaultExpanded = true,
  collapsible = true,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isOpen = collapsible ? expanded : true;

  const header = (
    <div className="min-w-0 flex-1">
      <p className={cn("text-lg font-semibold", td.textPrimary)}>
        Ngày {day.day_index}: {day.trip_date}
      </p>
      {day.theme && <p className={cn("mt-1 text-sm", td.textSecondary)}>{day.theme}</p>}
    </div>
  );

  return (
    <section className={cn("overflow-hidden rounded-xl border", td.border, td.surface)}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={isOpen}
          className={cn(
            "flex w-full items-start gap-3 border-l-[3px] border-[#F97316] px-4 py-4 text-left transition-colors",
            "hover:bg-black/[0.02] dark:hover:bg-[#1C1C1C]",
            td.focusRing
          )}
        >
          {header}
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 transition-transform duration-200 ease-out",
              td.textSecondary,
              isOpen && "rotate-180"
            )}
            aria-hidden
          />
        </button>
      ) : (
        <div className="border-l-[3px] border-[#F97316] px-4 py-4">{header}</div>
      )}

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className={cn("relative ml-5 border-l-2 px-5 pb-5 pt-1", td.timeline)}>
            <div className="space-y-6">
              {day.activities.map((slot, index) => (
                <ActivityTimelineItem
                  key={`${day.day_index}-${index}-${slot.title ?? index}`}
                  slot={slot as Record<string, unknown>}
                  clock={formatSlotClock(slot.start_time)}
                  destinationInitial={destinationInitial}
                  destination={destination}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActivityTimelineItem({
  slot,
  clock,
  destinationInitial,
  destination,
}: {
  slot: Record<string, unknown>;
  clock: string;
  destinationInitial: string;
  destination?: string;
}) {
  return (
    <div className="relative">
      <span
        className={cn(
          "absolute -left-[27px] top-[9px] rounded-lg bg-[#F97316] px-2 py-1 text-[11px] font-semibold text-white",
          td.timelineDotRing
        )}
      >
        {clock}
      </span>
      <PlaceCard
        slot={slot}
        destinationInitial={destinationInitial}
        destination={destination}
      />
    </div>
  );
}
