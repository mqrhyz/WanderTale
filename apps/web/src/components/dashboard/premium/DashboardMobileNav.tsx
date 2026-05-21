"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, History, LayoutDashboard, MapPin, Plus } from "lucide-react";
import { isDashboardNavActive } from "@/lib/dashboard-nav";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true as const },
  { href: "/trips", label: "Chuyến", icon: MapPin },
  { href: "/trips#plan", label: "Tạo", icon: Plus, accent: true },
  { href: "/favorites", label: "Yêu thích", icon: Heart },
  { href: "/history", label: "Lịch sử", icon: History },
];

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-premium-border bg-premium-surface/95 px-2 py-2 backdrop-blur-md lg:hidden"
      aria-label="Điều hướng di động"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isDashboardNavActive(pathname, item);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium",
              "accent" in item && item.accent
                ? "text-premium-accent"
                : active
                  ? "text-premium-accent"
                  : "text-premium-muted"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
