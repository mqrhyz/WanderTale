"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { TripRow } from "@/lib/dashboard";

const FALLBACK = [
  { title: "Đà Lạt — Mộng Mơ", tag: "Nghỉ dưỡng", gradient: "linear-gradient(135deg, #8BC48A, #7FA9E8)" },
  { title: "Nhật Bản Mùa Thu", tag: "Văn hóa", gradient: "linear-gradient(135deg, #B59CEB, #FF5A00)" },
  { title: "Bangkok — Thái Lan", tag: "Ẩm thực", gradient: "linear-gradient(135deg, #FF5A00, #dfa88f)" },
];

type DashboardAiRecommendationsProps = {
  trips: TripRow[];
};

export function DashboardAiRecommendations({ trips }: DashboardAiRecommendationsProps) {
  const fromTrips = [...new Set(trips.map((t) => t.destination))].slice(0, 3).map((dest, i) => ({
    title: dest,
    tag: "Dựa trên lịch sử",
    gradient: FALLBACK[i % FALLBACK.length]!.gradient,
  }));

  const items = fromTrips.length >= 2 ? fromTrips : FALLBACK;

  return (
    <section aria-labelledby="ai-rec-heading">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-premium-accent" aria-hidden />
        <div>
          <h2 id="ai-rec-heading" className="font-display text-2xl tracking-tight text-premium-ink md:text-[1.75rem]">
            Gợi ý dành riêng cho bạn
          </h2>
          <p className="text-sm text-premium-muted">Điểm đến AI đề xuất từ sở thích và chuyến đi trước.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href="/trips#plan"
            prefetch
            className="block overflow-hidden rounded-3xl border border-premium-border bg-premium-surface shadow-[0_8px_24px_-12px_rgba(30,26,22,0.12)] transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="h-28" style={{ background: item.gradient }} />
            <div className="p-4">
              <span className="rounded-full bg-premium-accent/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-premium-accent">
                {item.tag}
              </span>
              <p className="mt-2 font-display text-xl text-premium-ink">{item.title}</p>
              <p className="mt-1 text-sm text-premium-muted">Tạo itinerary với AI →</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
