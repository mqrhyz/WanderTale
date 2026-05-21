"use client";

import { motion } from "framer-motion";
import { LandingScrollRevealParagraph } from "@/components/landing/LandingScrollRevealParagraph";
import { useI18n } from "@/lib/i18n";

const easeSoft = [0.16, 1, 0.3, 1] as const;

const view = { once: true, margin: "-56px" } as const;

export function LandingAboutSection() {
  const { t } = useI18n();

  return (
    <section id="about" className="scroll-mt-4 bg-black px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/[0.06] bg-[#101010] px-6 py-14 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] md:rounded-3xl md:px-10 md:py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[min(100%,22rem)] text-center sm:max-w-xl lg:max-w-2xl">
          <motion.p
            className="font-almarai text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/88"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={view}
            transition={{ duration: 0.55, ease: easeSoft }}
          >
            {t.about.kicker}
          </motion.p>

          <div className="mt-7 space-y-4 md:mt-9 md:space-y-5">
            <motion.p
              className="font-display text-balance text-[clamp(1.0625rem,2.75vw,1.6875rem)] font-normal leading-[1.42] tracking-[-0.018em] text-[#E1E0CC]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: 0.62, delay: 0.05, ease: easeSoft }}
            >
              {t.about.line1}
            </motion.p>

            <motion.p
              className="font-serif text-balance text-[clamp(1rem,2.5vw,1.5rem)] italic leading-[1.48] text-primary md:leading-[1.42]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: 0.62, delay: 0.11, ease: easeSoft }}
            >
              {t.about.line2}
            </motion.p>

            <motion.p
              className="font-display text-balance text-[clamp(1.0625rem,2.75vw,1.6875rem)] font-normal leading-[1.42] tracking-[-0.018em] text-[#E1E0CC]"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={view}
              transition={{ duration: 0.62, delay: 0.17, ease: easeSoft }}
            >
              {t.about.line3}
            </motion.p>
          </div>

          <div className="mx-auto mt-9 max-w-md md:mt-11">
            <div className="mx-auto mb-6 h-px w-9 bg-primary/18" aria-hidden />
            <LandingScrollRevealParagraph
              text={t.about.reveal}
              className="text-center text-[13px] font-light leading-relaxed text-[#DEDBC8]/88 sm:text-sm md:text-[0.9375rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
