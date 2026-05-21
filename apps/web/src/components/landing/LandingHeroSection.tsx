"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WordsPullUp } from "@/components/landing/WordsPullUp";
import { useI18n } from "@/lib/i18n";

const easeSoft = [0.16, 1, 0.3, 1] as const;

const HERO_IMAGE = "/homepage.png";

const navLinks = [
  { key: "story", href: "/#about" },
  { key: "dashboard", href: "/dashboard" },
  { key: "createTrip", href: "/trips#plan" },
  { key: "signUp", href: "/register" },
] as const;

export function LandingHeroSection() {
  const { locale, t, toggleLocale } = useI18n();

  return (
    <section className="relative h-screen bg-black p-4 md:p-6">
      <div className="relative isolate h-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            quality={82}
            className="object-cover"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[min(62vh,460px)]"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.58) 28%, rgba(0,0,0,0.22) 58%, rgba(0,0,0,0) 100%)",
          }}
          aria-hidden
        />

        <nav
          className="absolute left-1/2 top-0 z-20 flex max-w-[min(100%,calc(100vw-2rem))] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-b-2xl bg-black px-3 py-2 sm:gap-x-6 md:gap-x-8 md:rounded-b-3xl md:px-6 lg:gap-x-10 lg:px-8"
          aria-label="Điều hướng chính"
        >
          {navLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-[10px] transition-colors hover:text-[#E1E0CC] sm:text-xs md:text-sm"
              style={{ color: "rgba(225, 224, 204, 0.8)" }}
            >
              {t.hero.nav[item.key]}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggleLocale}
          className="absolute right-4 top-4 z-30 inline-flex h-9 items-center rounded-full border border-white/15 bg-black/75 px-3 text-[11px] font-medium text-[#E1E0CC] backdrop-blur transition-colors hover:bg-black md:right-6 md:top-6 md:h-10 md:px-4 md:text-xs"
          aria-label={t.hero.langLabel}
        >
          <span className={locale === "vi" ? "text-primary" : "text-[#E1E0CC]/60"}>VI</span>
          <span className="mx-2 h-3 w-px bg-white/20" aria-hidden />
          <span className={locale === "en" ? "text-primary" : "text-[#E1E0CC]/60"}>EN</span>
        </button>

        <div className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-1 items-end gap-8 px-4 pb-8 pt-24 md:grid-cols-12 md:gap-6 md:px-8 md:pb-12 lg:px-10">
          <div className="min-w-0 md:col-span-8">
            <WordsPullUp
              text="WanderTale"
              showAsterisk
              className="text-[clamp(1.875rem,10vw,4.25rem)] font-medium leading-[0.88] tracking-[-0.06em] text-[#E1E0CC] sm:text-[clamp(2rem,8.5vw,4.75rem)] md:text-[clamp(2.125rem,7.25vw,5.25rem)] lg:text-[clamp(2.25rem,6.25vw,5.75rem)] xl:text-[clamp(2.5rem,5.5vw,6.25rem)] 2xl:text-[clamp(2.5rem,5vw,6.75rem)]"
            />
          </div>

          <div className="flex flex-col justify-end gap-6 md:col-span-4">
            <motion.p
              className="text-xs leading-[1.2] text-primary/80 sm:text-sm md:text-base"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.5, ease: easeSoft }}
            >
              {t.hero.body}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: 0.7, ease: easeSoft }}
            >
              <Link
                href="/login?next=/dashboard"
                className="group inline-flex items-center gap-2 rounded-full bg-primary py-2.5 pl-5 pr-2 text-sm font-medium text-black transition-[gap] duration-300 hover:gap-3 sm:gap-2 sm:py-3 sm:pl-6 sm:pr-2.5 sm:text-base"
              >
                <span>{t.hero.cta}</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10">
                  <ArrowRight className="h-4 w-4 text-primary sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} />
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
