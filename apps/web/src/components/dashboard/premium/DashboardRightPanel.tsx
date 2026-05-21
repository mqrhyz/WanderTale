"use client";

import Link from "next/link";
import { Cloud, FileUp, Plus, Sparkles, Sun } from "lucide-react";

const FORECAST = [
  { day: "T2", temp: "24°", icon: Sun },
  { day: "T3", temp: "26°", icon: Sun },
  { day: "T4", temp: "22°", icon: Cloud },
  { day: "T5", temp: "21°", icon: Cloud },
];

export function DashboardRightPanel() {
  return (
    <aside className="space-y-5 xl:w-[300px] xl:shrink-0">
      <div className="rounded-3xl border border-premium-border bg-premium-surface p-5 shadow-[0_8px_30px_-12px_rgba(30,26,22,0.1)]">
        <h3 className="text-sm font-semibold text-premium-ink">Hành động nhanh</h3>
        <ul className="mt-4 space-y-2">
          <QuickAction href="/trips#plan" icon={Plus} label="Lên kế hoạch AI" primary />
          <QuickAction href="/trips#plan" icon={Sparkles} label="Đặt phòng & lịch trình" />
        </ul>
      </div>

      <div className="rounded-3xl border border-premium-border bg-premium-bg p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-premium-accent" aria-hidden />
          <h3 className="text-sm font-semibold text-premium-ink">Mẹo du lịch</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-premium-muted">
          Đặt ngân sách trước khi generate — AI sẽ ưu tiên điểm tham quan và nhà hàng phù hợp với mức chi tiêu của bạn.
        </p>
        <Link href="/trips#plan" prefetch className="mt-3 inline-block text-sm font-medium text-premium-accent hover:underline">
          Bắt đầu lên kế hoạch →
        </Link>
      </div>

      <div className="rounded-3xl border border-premium-border bg-premium-surface p-5">
        <h3 className="text-sm font-semibold text-premium-ink">Thời tiết gợi ý</h3>
        <p className="mt-1 text-xs text-premium-muted">Dự báo mẫu cho chuyến sắp tới</p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="font-display text-4xl text-premium-ink">24°</p>
            <p className="text-sm text-premium-muted">Nắng nhẹ · Đà Lạt</p>
          </div>
          <Sun className="h-10 w-10 text-premium-accent" aria-hidden />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {FORECAST.map((d) => (
            <div key={d.day} className="rounded-xl bg-premium-bg px-2 py-2 text-center">
              <p className="text-[10px] font-medium text-premium-muted">{d.day}</p>
              <d.icon className="mx-auto my-1 h-4 w-4 text-premium-muted" aria-hidden />
              <p className="text-xs font-medium text-premium-ink">{d.temp}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className={
          primary
            ? "flex items-center gap-3 rounded-2xl bg-premium-accent px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            : "flex items-center gap-3 rounded-2xl border border-premium-border bg-premium-surface px-4 py-3 text-sm font-medium text-premium-ink transition-colors hover:bg-premium-bg"
        }
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </Link>
    </li>
  );
}
