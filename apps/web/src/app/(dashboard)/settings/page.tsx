"use client";

import { Bell, Moon } from "lucide-react";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardPageHeader } from "@/components/dashboard/premium/DashboardPageHeader";
import { useDashboardShell } from "@/components/dashboard/premium/DashboardShellProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUiStore } from "@/stores/uiStore";

export default function SettingsPage() {
  const { displayName } = useDashboardShell();
  const theme = useUiStore((s) => s.theme);

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        kicker="Tùy chọn"
        title="Cài đặt"
        description={displayName ? `Đang đăng nhập với ${displayName}` : "Quản lý tài khoản và tùy chọn ứng dụng."}
      />

      <div className="mt-8 max-w-lg">
        <section className="rounded-3xl border border-premium-border bg-premium-surface p-4">
          <h2 className="text-sm font-semibold text-premium-ink">Tùy chọn</h2>
          <ul className="mt-3 space-y-3">
            <li className="flex items-center justify-between gap-4 rounded-2xl bg-premium-bg px-4 py-3">
              <span className="flex items-center gap-3 text-sm text-premium-ink">
                <Bell className="h-4 w-4 text-premium-muted" aria-hidden />
                Thông báo chuyến đi
              </span>
              <span className="text-xs text-premium-muted">Sắp có</span>
            </li>
            <li className="flex items-center justify-between gap-4 rounded-2xl bg-premium-bg px-4 py-3">
              <span className="flex items-center gap-3 text-sm text-premium-ink">
                <Moon className="h-4 w-4 text-premium-muted" aria-hidden />
                Giao diện {theme === "dark" ? "tối" : "sáng"}
              </span>
              <ThemeToggle />
            </li>
          </ul>
        </section>
        <p className="mt-4 text-xs text-premium-muted">
          Đăng xuất từ menu tài khoản ở góc phải trên cùng.
        </p>
      </div>
    </DashboardPageFrame>
  );
}
