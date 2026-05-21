"use client";

import { TripPlannerHub } from "@/components/dashboard/premium/TripPlannerHub";
import { DashboardAiRecommendations } from "@/components/dashboard/premium/DashboardAiRecommendations";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardPageHeader } from "@/components/dashboard/premium/DashboardPageHeader";
import { DashboardTripGallery } from "@/components/dashboard/premium/DashboardTripGallery";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";

export default function TripsPage() {
  const { filterTrips, trips } = useDashboardShell();
  const sortedTrips = filterTrips();

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        kicker="Hành trình"
        title="Chuyến đi"
        description="Lên kế hoạch với AI — lịch trình, thời tiết, đặt phòng — rồi quản lý các chuyến đã tạo."
      />

      <div className="mt-8 space-y-14">
        <TripPlannerHub />

        {sortedTrips.length > 0 ? (
          <section>
            <h2 className="mb-6 font-display text-xl text-premium-ink md:text-2xl">Chuyến đi của bạn</h2>
            <DashboardTripGallery trips={sortedTrips} showSectionHeader={false} />
          </section>
        ) : null}

        <DashboardAiRecommendations trips={trips} />
      </div>
    </DashboardPageFrame>
  );
}
