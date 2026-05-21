"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { DASHBOARD_NAV, isDashboardNavActive } from "@/lib/dashboard-nav";
import { cn } from "@/lib/cn";

export function DashboardNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-[240px] flex-col border-r border-premium-border bg-premium-surface",
        className
      )}
    >
      <div className="flex h-full flex-col px-4 py-6">
        <BrandLogo href="/dashboard" size="md" showLabel priority className="-ml-1" />

        <nav className="mt-8 flex-1 space-y-0.5 overflow-y-auto" aria-label="Điều hướng chính">
          {DASHBOARD_NAV.map((item) => {
            const active = isDashboardNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                scroll={false}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-premium-accent/10 text-premium-accent"
                    : "text-premium-muted hover:bg-premium-bg hover:text-premium-ink"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-2xl border border-premium-border bg-premium-bg p-4">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-premium-accent" aria-hidden />
            <p className="text-sm font-semibold text-premium-ink">WanderTale Pro</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-premium-muted">
            Itinerary không giới hạn, ưu đãi đối tác và gợi ý AI nâng cao.
          </p>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-premium-ink py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </aside>
  );
}
