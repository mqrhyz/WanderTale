"use client";

import { CalendarRange, Coins, MapPin, Route } from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard";
import { formatBudget } from "@/lib/dashboard";

const METRICS = [
  {
    key: "total_trips" as const,
    label: "Chuyến đi",
    hint: "Tổng hành trình đã lên kế hoạch",
    icon: CalendarRange,
    badge: "bg-premium-blue/20 text-premium-ink",
  },
  {
    key: "total_budget_planned" as const,
    label: "Ngân sách",
    hint: "Tổng ngân sách kế hoạch",
    icon: Coins,
    badge: "bg-premium-accent/15 text-premium-accent",
    format: formatBudget,
  },
  {
    key: "unique_destinations" as const,
    label: "Điểm đến",
    hint: "Địa điểm khác nhau",
    icon: MapPin,
    badge: "bg-premium-green/25 text-premium-ink",
  },
  {
    key: "places_in_itineraries" as const,
    label: "Điểm trong lịch",
    hint: "Hoạt động trong itinerary",
    icon: Route,
    badge: "bg-premium-purple/25 text-premium-ink",
  },
];

export function DashboardMetrics({ stats }: { stats: DashboardStats }) {
  return (
    <section aria-labelledby="metrics-heading">
      <div className="mb-6">
        <h2 id="metrics-heading" className="font-display text-2xl tracking-tight text-premium-ink md:text-[1.75rem]">
          Tổng quan
        </h2>
        <p className="mt-1 text-sm text-premium-muted md:text-base">Số liệu tổng hợp từ các chuyến đi của bạn.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => {
          const Icon = m.icon;
          const raw = stats[m.key];
          const value = "format" in m && m.format ? m.format(raw) : String(raw);
          return (
            <article
              key={m.key}
              className="rounded-3xl border border-premium-border bg-premium-surface p-6 shadow-[0_8px_30px_-12px_rgba(30,26,22,0.12)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${m.badge}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-premium-muted">{m.label}</p>
              <p className="mt-2 font-display text-3xl tracking-tight text-premium-ink">{value}</p>
              <p className="mt-2 text-sm text-premium-muted">{m.hint}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
