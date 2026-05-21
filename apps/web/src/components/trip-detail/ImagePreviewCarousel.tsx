"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";

type Props = {
  images: string[];
  alt: string;
  fallback: string;
  onOpen?: () => void;
  className?: string;
  /** contain = hiện trọn ảnh; cover = fill crop */
  fit?: "contain" | "cover";
};

export function ImagePreviewCarousel({
  images,
  alt,
  fallback,
  onOpen,
  className,
  fit = "contain",
}: Props) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const initial = fallback.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const safeIndex = count > 0 ? index % count : 0;

  const go = useCallback(
    (delta: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  if (count === 0) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center text-xl font-semibold",
          td.surfaceElevated,
          td.accent,
          className
        )}
      >
        {initial}
      </div>
    );
  }

  const current = images[safeIndex]!;

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? (count > 1 ? `Xem ${count} ảnh` : "Xem ảnh") : undefined}
      onClick={
        onOpen
          ? (e) => {
              e.stopPropagation();
              e.preventDefault();
              onOpen();
            }
          : undefined
      }
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }
            }
          : undefined
      }
      className={cn(
        "group relative flex h-full w-full items-center justify-center",
        td.surfaceElevated,
        onOpen && "cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={`${alt} — ảnh ${safeIndex + 1}/${count}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn(
          "max-h-full max-w-full",
          fit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain object-center"
        )}
      />

      {count > 1 && (
        <>
          <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Images className="h-3 w-3" aria-hidden />
            {count}
          </span>
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={(e) => go(-1, e)}
            className="absolute left-0.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Ảnh sau"
            onClick={(e) => go(1, e)}
            className="absolute right-0.5 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

export function slotImages(slot: Record<string, unknown> | undefined): string[] {
  const urls = slot?.image_preview_urls;
  if (Array.isArray(urls) && urls.length > 0) {
    return urls.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  const single = slot?.image_preview_url;
  if (typeof single === "string" && single.length > 0) return [single];
  return [];
}
