"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";

type Props = {
  images: string[];
  alt: string;
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
};

export function ImageLightbox({ images, alt, open, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const count = images.length;

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, count, onClose]);

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  if (!open || count === 0) return null;

  const current = images[index % count]!;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${alt}`}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className={cn(
          "absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full",
          td.surfaceElevated,
          td.textPrimary,
          td.focusRing
        )}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className={cn(
              "absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg sm:left-6",
              td.surfaceElevated,
              td.textPrimary,
              td.focusRing
            )}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Ảnh sau"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className={cn(
              "absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full shadow-lg sm:right-6",
              td.surfaceElevated,
              td.textPrimary,
              td.focusRing
            )}
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </>
      )}

      <div
        className="relative flex max-h-[85vh] max-w-[min(960px,95vw)] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`${alt} — ${index + 1}/${count}`}
          referrerPolicy="no-referrer"
          className="max-h-[78vh] w-auto max-w-full object-contain"
        />
        {count > 1 && (
          <p className="mt-3 text-center text-sm text-white/80">
            {index + 1} / {count}
          </p>
        )}
      </div>
    </div>
  );
}
