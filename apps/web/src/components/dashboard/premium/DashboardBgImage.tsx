"use client";

import Image from "next/image";
import { DASHBOARD_BG_IMAGE } from "@/lib/dashboard-assets";
import { cn } from "@/lib/cn";

type DashboardBgImageProps = {
  priority?: boolean;
  className?: string;
};

/** Optimized hero/map background — one decode, responsive sizes. */
export function DashboardBgImage({ priority, className }: DashboardBgImageProps) {
  return (
    <Image
      src={DASHBOARD_BG_IMAGE}
      alt=""
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
      quality={65}
      className={cn("object-cover object-center", className)}
    />
  );
}
