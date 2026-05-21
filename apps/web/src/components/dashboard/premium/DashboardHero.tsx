"use client";

import Link from "next/link";
import { CloudSun, MapPin, Plus, Ticket } from "lucide-react";
import { DashboardBgImage } from "@/components/dashboard/premium/DashboardBgImage";
import { DashboardImageVignette } from "@/components/dashboard/premium/DashboardImageVignette";

type DashboardHeroProps = {
  greeting: string;
  tripCount: number;
};

export function DashboardHero({ greeting, tripCount }: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-premium-border bg-premium-ink shadow-[0_24px_64px_-24px_rgba(30,26,22,0.35)]">
      <div className="absolute inset-0">
        <DashboardBgImage priority />
      </div>
      <DashboardImageVignette variant="hero" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[#1E1A16]/18" aria-hidden />

      <div className="relative z-[2] grid gap-8 p-6 md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Bảng điều khiển</p>
          <h1 className="font-display mt-3 text-[2rem] leading-[1.1] tracking-tight text-white md:text-[2.75rem] lg:text-[3rem]">
            {greeting}!
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/75 md:text-lg">
            {tripCount > 0
              ? `Bạn đang quản lý ${tripCount} hành trình — lịch trình, thời tiết và ưu đãi trong một nơi.`
              : "Bắt đầu chuyến đi đầu tiên — AI lên lịch theo ngày, thời tiết và bản đồ thực tế."}
          </p>
          <Link
            href="/trips#plan"
            prefetch
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-premium-accent px-6 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Tạo chuyến AI
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:min-w-[220px]">
          <HeroWidget icon={MapPin} title="Itinerary" subtitle="Theo ngày · chỉnh sửa được" />
          <HeroWidget icon={CloudSun} title="24°C" subtitle="Nắng nhẹ · gợi ý thời tiết" />
          <HeroWidget icon={Ticket} title="Voucher" subtitle="Ưu đãi đối tác trong chuyến" />
        </div>
      </div>
    </section>
  );
}

function HeroWidget({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof MapPin;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/90" aria-hidden />
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <p className="mt-1 text-xs text-white/65">{subtitle}</p>
    </div>
  );
}
