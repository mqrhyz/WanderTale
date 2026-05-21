"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { td } from "@/components/trip-detail/trip-detail-theme";

type Props = {
  mapUrl: string;
  destination: string;
};

export function TripHeroMap({ mapUrl, destination }: Props) {
  return (
    <div className="relative aspect-[16/5] w-full overflow-hidden rounded-xl">
      <Image
        src={mapUrl}
        alt={`Bản đồ ${destination}`}
        fill
        className="object-cover grayscale"
        unoptimized
        sizes="(max-width: 1200px) 100vw, 1200px"
      />
      <div className={cn("pointer-events-none absolute inset-0", td.heroOverlay)} aria-hidden />
    </div>
  );
}
