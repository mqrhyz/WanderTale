"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardPageHeader } from "@/components/dashboard/premium/DashboardPageHeader";
import { DashboardTripGallery } from "@/components/dashboard/premium/DashboardTripGallery";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { getFavoriteTripIds, toggleFavoriteTripId } from "@/lib/favorites";

export default function FavoritesPage() {
  const { filterTrips } = useDashboardShell();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(getFavoriteTripIds());
  }, []);

  const favoriteTrips = filterTrips((t) => favoriteIds.includes(t.id));

  const handleToggle = useCallback((id: string) => {
    setFavoriteIds(toggleFavoriteTripId(id));
  }, []);

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        kicker="Đã lưu"
        title="Yêu thích"
        description="Chuyến đi bạn đánh dấu — lưu trên trình duyệt này."
      />

      {favoriteTrips.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-premium-border bg-premium-surface px-6 py-16 text-center">
          <Heart className="mx-auto h-8 w-8 text-premium-muted" aria-hidden />
          <p className="mt-4 font-display text-xl text-premium-ink">Chưa có yêu thích</p>
          <p className="mt-2 text-sm text-premium-muted">
            Mở một chuyến đi và nhấn ♥ để lưu, hoặc tạo chuyến mới.
          </p>
          <Link
            href="/trips"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-premium-accent px-5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Xem chuyến đi
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <ul className="flex flex-wrap gap-2">
            {favoriteTrips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => handleToggle(t.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-premium-border bg-premium-surface px-3 py-1.5 text-xs font-medium text-premium-ink hover:border-premium-accent/40"
                >
                  <Heart className="h-3.5 w-3.5 fill-premium-accent text-premium-accent" aria-hidden />
                  {t.destination}
                  <span className="text-premium-muted">×</span>
                </button>
              </li>
            ))}
          </ul>
          <DashboardTripGallery trips={favoriteTrips} />
        </div>
      )}
    </DashboardPageFrame>
  );
}
