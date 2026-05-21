"use client";

import { DashboardMobileNav } from "./DashboardMobileNav";
import { DashboardNav } from "./DashboardNav";
import { DashboardTopBar } from "./DashboardTopBar";

type DashboardAppShellProps = {
  children?: React.ReactNode;
  displayName: string | null;
  search: string;
  onSearchChange: (q: string) => void;
};

export function DashboardAppShell({ children, displayName, search, onSearchChange }: DashboardAppShellProps) {
  return (
    <div className="flex min-h-screen">
      <DashboardNav className="hidden lg:flex" />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[240px]">
        <DashboardTopBar displayName={displayName} search={search} onSearchChange={onSearchChange} />

        <main className="flex-1 pb-24 lg:pb-8 [contain:layout]">{children}</main>
      </div>

      <DashboardMobileNav />
    </div>
  );
}
