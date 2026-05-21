"use client";

import { Bell, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardUserMenu } from "@/components/dashboard/premium/DashboardUserMenu";

type DashboardTopBarProps = {
  displayName: string | null;
  search: string;
  onSearchChange: (q: string) => void;
};

export function DashboardTopBar({ displayName, search, onSearchChange }: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-premium-border bg-premium-surface/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6 lg:px-8">
        <div className="relative mx-auto hidden w-full max-w-xl flex-1 md:flex">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-premium-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm chuyến đi, địa điểm…"
            className="h-11 w-full rounded-2xl border border-premium-border bg-premium-bg pl-11 pr-20 text-sm text-premium-ink placeholder:text-premium-muted focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/20"
            aria-label="Tìm kiếm chuyến đi"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-premium-border bg-premium-surface px-2 py-0.5 font-mono text-[10px] text-premium-muted sm:inline">
            ⌘ K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-premium-border text-premium-muted transition-colors hover:bg-premium-bg hover:text-premium-ink"
            aria-label="Thông báo"
          >
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <DashboardUserMenu displayName={displayName} />
        </div>
      </div>
    </header>
  );
}
