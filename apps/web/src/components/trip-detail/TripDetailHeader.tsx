"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";
import { formatVnd } from "@/components/trip-detail/trip-detail-utils";
import { isFavoriteTripId, toggleFavoriteTripId } from "@/lib/favorites";

type Props = {
  tripId: string;
  destination: string;
  dayCount: number;
  budget: number | null;
  otaPending: boolean;
};

export function TripDetailHeader({ tripId, destination, dayCount, budget, otaPending }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSaved(isFavoriteTripId(tripId));
  }, [tripId]);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const next = toggleFavoriteTripId(tripId);
    setSaved(next.includes(tripId));
    setSaving(false);
  }

  const subtitle = [
    `${dayCount} ngày`,
    budget != null ? `Budget ${formatVnd(budget)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("sticky top-0 z-20 -mx-4 border-b px-4 sm:-mx-6 sm:px-6", td.header)}>
      <div className="flex max-h-20 min-h-[72px] items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <Link href="/dashboard" className={cn("text-xs transition-colors", td.link, td.focusRing)}>
            ← Dashboard
          </Link>
          <h1 className={cn("truncate text-2xl font-semibold leading-tight", td.textPrimary)}>
            {destination}
          </h1>
          <p className={cn("truncate text-sm", td.textSecondary)}>{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/trips")}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-colors",
              td.btnOutline,
              td.focusRing
            )}
            aria-label="Sửa chuyến đi"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Sửa
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex h-9 min-w-[72px] items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors disabled:opacity-80",
              td.btnPrimary,
              td.focusRing
            )}
            aria-label={saved ? "Đã lưu vào yêu thích" : "Lưu chuyến đi"}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : saved ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Đã lưu
              </>
            ) : (
              "Lưu"
            )}
          </button>
        </div>
      </div>

      {otaPending && (
        <p className={cn("flex items-center gap-2 pb-3 text-xs", td.accent)}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang quét giá OTA (Booking / Agoda / Vntrip)…
        </p>
      )}
    </div>
  );
}
