import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const TRUST_PILLS = ["Đồng bộ đa thiết bị", "Lịch trình thông minh", "Bản đồ thời gian thực"] as const;

/** Branding column — background is on AuthBackground (login.png). */
export function AuthHeroAside() {
  return (
    <aside className="flex w-full max-w-lg flex-col justify-center md:max-w-md md:flex-1 lg:max-w-xl">
      <BrandLogo href="/" size="lg" className="brightness-0 invert" priority />
      <p className="mt-8 text-[clamp(1.75rem,4vw,2.375rem)] font-normal leading-[1.15] tracking-[-0.03em] text-white drop-shadow-sm">
        Mỗi chuyến đi,
        <br />
        <span className="text-white/75">một câu chuyện riêng.</span>
      </p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
        Lịch trình, bản đồ và kỷ niệm — đồng bộ trên mọi thiết bị.
      </p>
      <ul className="mt-8 flex flex-wrap gap-2" aria-label="Tính năng">
        {TRUST_PILLS.map((label) => (
          <li key={label} className="wt-auth-glass-chip px-3.5 py-1.5 text-xs text-white/85">
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-10 hidden font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 md:block">© WanderTale</p>
    </aside>
  );
}
