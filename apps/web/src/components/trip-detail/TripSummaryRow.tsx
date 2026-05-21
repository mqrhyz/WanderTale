"use client";

import { CalendarDays, CloudSun, MapPin, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import { formatVnd } from "@/components/trip-detail/trip-detail-utils";
import { useCountUp } from "@/components/trip-detail/useCountUp";

type PillProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function MetricPill({ icon, label, value }: PillProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-[20px] border px-3.5 py-2",
        td.border,
        td.surfacePill
      )}
    >
      <span
        className={cn(
          "flex h-[34px] w-[34px] items-center justify-center rounded-[10px]",
          td.surfaceElevated,
          td.accent
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn("text-xs", td.textSecondary)}>{label}</p>
        <p className={cn("truncate text-sm font-medium", td.textPrimary)}>{value}</p>
      </div>
    </div>
  );
}

type Props = {
  totalCost: number | null;
  dayCount: number;
  placeCount: number;
  weatherSummary: string;
};

export function TripSummaryRow({ totalCost, dayCount, placeCount, weatherSummary }: Props) {
  const animatedCost = useCountUp(totalCost);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
      <div className="flex gap-3">
        <MetricPill
          icon={<Wallet className="h-4 w-4" aria-hidden />}
          label="Tổng chi phí"
          value={totalCost != null ? formatVnd(animatedCost) : "—"}
        />
        <MetricPill
          icon={<CalendarDays className="h-4 w-4" aria-hidden />}
          label="Số ngày"
          value={`${dayCount} ngày`}
        />
        <MetricPill
          icon={<MapPin className="h-4 w-4" aria-hidden />}
          label="Số địa điểm"
          value={`${placeCount} điểm`}
        />
        <MetricPill
          icon={<CloudSun className="h-4 w-4" aria-hidden />}
          label="Thời tiết"
          value={weatherSummary}
        />
      </div>
    </div>
  );
}
