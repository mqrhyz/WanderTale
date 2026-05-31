"use client";

import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import type { DayBlockData } from "@/lib/trip-agenda-activities";

type Props = {
  days: DayBlockData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function formatDayShort(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
}

export function DaySchedulePicker({ days, selectedIndex, onSelect }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      <div className="flex gap-2" role="tablist" aria-label="Chọn ngày trong lịch trình">
        {days.map((day, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={`${day.day_index}-${day.trip_date}`}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(index)}
              className={cn(
                "flex w-[80px] shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-colors",
                td.focusRing,
                selected
                  ? cn("border-[#F97316] bg-[#F97316]/10", td.accentBorder)
                  : cn(td.border, td.surface, td.borderHover, "hover:bg-black/[0.02] dark:hover:bg-[#1C1C1C]")
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  selected ? td.accent : td.textSecondary
                )}
              >
                Ngày {day.day_index}
              </span>
              <span className={cn("mt-0.5 whitespace-nowrap text-[13px] font-semibold", td.textPrimary)}>
                {formatDayShort(day.trip_date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
