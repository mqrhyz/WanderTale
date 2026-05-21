"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DashboardHero } from "@/components/dashboard/premium/DashboardHero";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardTripGallery } from "@/components/dashboard/premium/DashboardTripGallery";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { apiFetch, describeApiLoadError } from "@/lib/api";
import type { DashboardStats as Stats } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/client";

const DashboardMetrics = dynamic(
  () => import("@/components/dashboard/premium/DashboardMetrics").then((m) => m.DashboardMetrics),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-3xl bg-premium-border/30" /> }
);

const DashboardRightPanel = dynamic(
  () => import("@/components/dashboard/premium/DashboardRightPanel").then((m) => m.DashboardRightPanel),
  { ssr: false, loading: () => <div className="hidden h-64 w-[300px] animate-pulse rounded-3xl bg-premium-border/30 xl:block" /> }
);

const DashboardAiRecommendations = dynamic(
  () =>
    import("@/components/dashboard/premium/DashboardAiRecommendations").then((m) => m.DashboardAiRecommendations),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-3xl bg-premium-border/30" /> }
);

export default function DashboardPage() {
  const { displayName, filterTrips, trips } = useDashboardShell();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  const sortedTrips = filterTrips();
  const greeting = displayName ? `Xin chào, ${displayName}` : "Xin chào";
  const tripCount = trips.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;
        const dash = (await apiFetch("/api/dashboard", token)) as Stats;
        if (!cancelled) setStats(dash);
      } catch (e) {
        if (!cancelled) setStatsErr(describeApiLoadError(e).summary);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardPageFrame>
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-8">
        <div className="min-w-0 flex-1 space-y-10 md:space-y-12">
          <DashboardHero greeting={greeting} tripCount={tripCount} />
          {stats ? <DashboardMetrics stats={stats} /> : null}
          {statsErr ? <p className="text-sm text-premium-muted">{statsErr}</p> : null}
          <DashboardTripGallery trips={sortedTrips} />
          <DashboardAiRecommendations trips={trips} />
        </div>
        <DashboardRightPanel />
      </div>
    </DashboardPageFrame>
  );
}
