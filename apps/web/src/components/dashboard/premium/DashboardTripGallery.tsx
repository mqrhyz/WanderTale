"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  formatTripDates,
  getTripPhase,
  getTripPhaseLabel,
  type TripRow,
} from "@/lib/dashboard";
import { cn } from "@/lib/cn";

const CARD_BACKGROUNDS = [
  "linear-gradient(160deg, #7FA9E8 0%, #1E1A16 85%)",
  "linear-gradient(160deg, #8BC48A 0%, #1E1A16 85%)",
  "linear-gradient(160deg, #B59CEB 0%, #1E1A16 85%)",
  "linear-gradient(160deg, #FF5A00 0%, #1E1A16 85%)",
  "linear-gradient(160deg, #dfa88f 0%, #1E1A16 85%)",
];

const phaseBadge: Record<ReturnType<typeof getTripPhase>, string> = {
  upcoming: "bg-premium-blue/90 text-white",
  ongoing: "bg-premium-green/90 text-white",
  completed: "bg-white/20 text-white backdrop-blur-sm",
};

type DashboardTripGalleryProps = {
  trips: TripRow[];
  showSectionHeader?: boolean;
};

function TripCard({ trip, index }: { trip: TripRow; index: number }) {
  const phase = getTripPhase(trip.start_date, trip.end_date);
  const bg = CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]!;

  return (
    <div className="w-[min(100%,320px)] shrink-0 snap-start md:w-auto [content-visibility:auto]">
      <Link href={`/trips/${trip.id}`} prefetch className="group block">
        <article
          className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-premium-border shadow-[0_12px_40px_-16px_rgba(30,26,22,0.25)] transition-transform duration-300 ease-out will-change-transform group-hover:-translate-y-1.5"
          style={{ background: bg }}
        >
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <span
            className={cn(
              "absolute left-4 top-4 z-[2] rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
              phaseBadge[phase]
            )}
          >
            {getTripPhaseLabel(phase)}
          </span>
          <div className="absolute inset-x-0 bottom-0 z-[2] p-5">
            <h3 className="font-display text-2xl text-white">{trip.destination}</h3>
            <p className="mt-1 text-sm text-white/75">{formatTripDates(trip.start_date, trip.end_date)}</p>
          </div>
        </article>
      </Link>
    </div>
  );
}

export function DashboardTripGallery({ trips, showSectionHeader = true }: DashboardTripGalleryProps) {
  if (trips.length === 0) {
    return (
      <section id="trips" className="scroll-mt-24">
        {showSectionHeader ? <SectionHeader count={0} /> : null}
        <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-dashed border-premium-border bg-premium-surface px-6 py-16 text-center">
          <p className="font-display text-2xl text-premium-ink">Chưa có chuyến đi</p>
          <p className="mt-2 max-w-md text-sm text-premium-muted">
            Tạo hành trình đầu tiên — AI gợi ý lịch trình theo ngày và ngân sách của bạn.
          </p>
          <Link
            href="/trips#plan"
            prefetch
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-premium-accent px-5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tạo chuyến với AI
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section id="trips" className="scroll-mt-24">
      {showSectionHeader ? <SectionHeader count={trips.length} /> : null}

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-2">
        {trips.map((trip, i) => (
          <TripCard key={trip.id} trip={trip} index={i} />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-premium-ink md:text-[1.75rem]">Chuyến đi gần đây</h2>
        <p className="mt-1 text-sm text-premium-muted">
          {count > 0 ? `${count} hành trình — vuốt ngang trên mobile` : "Danh sách trống"}
        </p>
      </div>
      {count > 0 ? (
        <Link href="/trips#plan" prefetch className="text-sm font-medium text-premium-accent hover:underline">
          + Thêm chuyến
        </Link>
      ) : null}
    </div>
  );
}
