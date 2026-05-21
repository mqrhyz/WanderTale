"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardPageHeader } from "@/components/dashboard/premium/DashboardPageHeader";
import { DashboardTripGallery } from "@/components/dashboard/premium/DashboardTripGallery";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { getTripPhase } from "@/lib/dashboard";

export default function HistoryPage() {
  const { filterTrips } = useDashboardShell();
  const pastTrips = filterTrips((t) => getTripPhase(t.start_date, t.end_date) === "completed");

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        kicker="Đã qua"
        title="Lịch sử"
        description="Các chuyến đi đã kết thúc — xem lại itinerary và gợi ý cho lần sau."
      />

      {pastTrips.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-premium-border bg-premium-surface px-6 py-16 text-center">
          <History className="mx-auto h-8 w-8 text-premium-muted" aria-hidden />
          <p className="mt-4 font-display text-xl text-premium-ink">Chưa có lịch sử</p>
          <p className="mt-2 text-sm text-premium-muted">Chuyến đi đã qua sẽ xuất hiện tại đây.</p>
          <Link href="/trips#plan" className="mt-6 inline-block text-sm font-medium text-premium-accent hover:underline">
            Lên kế hoạch chuyến mới →
          </Link>
        </div>
      ) : (
        <div className="mt-10">
          <DashboardTripGallery trips={pastTrips} />
        </div>
      )}
    </DashboardPageFrame>
  );
}
