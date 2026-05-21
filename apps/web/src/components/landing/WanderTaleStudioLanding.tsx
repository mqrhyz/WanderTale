"use client";

import dynamic from "next/dynamic";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n";

const LandingAboutSection = dynamic(
  () => import("@/components/landing/LandingAboutSection").then((mod) => mod.LandingAboutSection),
  {
    loading: () => <div className="h-[360px] bg-black" aria-hidden />,
  }
);

const LandingFeaturesSection = dynamic(
  () => import("@/components/landing/LandingFeaturesSection").then((mod) => mod.LandingFeaturesSection),
  {
    loading: () => <div className="h-[560px] bg-black" aria-hidden />,
  }
);

export function WanderTaleStudioLanding() {
  const { t } = useI18n();

  return (
    <main className="bg-black text-[#E1E0CC]">
      <LandingHeroSection />
      <LandingAboutSection />
      <LandingFeaturesSection />
      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-content flex-col items-center gap-6">
          <BrandLogo href="/" size="lg" className="brightness-0 invert opacity-90" />
          <div className="text-center text-[10px] text-gray-500 sm:text-xs">
        <Link href="/login" className="text-primary/80 transition-colors hover:text-primary">
          {t.footer.login}
        </Link>
        <span className="mx-3 text-white/20">·</span>
        <Link href="/register" className="text-primary/80 transition-colors hover:text-primary">
          {t.footer.register}
        </Link>
        <span className="mx-3 text-white/20">·</span>
        <span>{t.footer.tagline}</span>
        <span className="mx-3 text-white/20">·</span>
        <span>{t.footer.note}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
