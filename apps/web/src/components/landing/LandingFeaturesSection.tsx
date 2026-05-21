"use client";

import { motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { WordsPullUpMultiStyle } from "@/components/landing/WordsPullUpMultiStyle";
import { useI18n } from "@/lib/i18n";

const easeCard = [0.22, 1, 0.36, 1] as const;

const CARD_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4";

const IMG_STORY =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85";

const IMG_CRITIQUE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85";

const IMG_CAPSULE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85";

function FeatureCardShell({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className="relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl bg-[#212121] lg:h-full lg:min-h-0"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        duration: 0.65,
        delay: index * 0.15,
        ease: easeCard,
      }}
    >
      {children}
    </motion.div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-left text-xs text-gray-400 sm:text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function LearnMoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center text-xs font-medium text-primary transition-opacity hover:opacity-80 sm:text-sm"
    >
      {children}
    </Link>
  );
}

export function LandingFeaturesSection() {
  const { t } = useI18n();
  const cards = t.features.cards;

  return (
    <section className="relative min-h-screen bg-black px-4 py-20 md:px-6 md:py-28">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <div className="mx-auto max-w-5xl text-center">
          <WordsPullUpMultiStyle
            className="text-xl font-normal sm:text-2xl md:text-3xl lg:text-4xl"
            segments={[
              { text: t.features.headline1, className: "text-[#E1E0CC]" },
              { text: t.features.headline2, className: "text-gray-500" },
            ]}
          />
        </div>

        <div className="mt-14 grid grid-cols-1 gap-3 sm:mt-16 sm:gap-2 md:mt-20 md:grid-cols-2 md:gap-1 lg:grid-cols-4 lg:h-[520px]">
          <FeatureCardShell index={0}>
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={CARD_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 mt-auto flex flex-1 flex-col justify-end gap-2 p-5 md:p-6">
              <p className="text-lg font-medium text-[#E1E0CC] md:text-xl">{cards[0].title}</p>
              <p className="max-w-md text-sm leading-relaxed text-gray-300 md:text-base">
                {"body" in cards[0] ? cards[0].body : ""}
              </p>
              <LearnMoreLink href="/trips#plan">{t.features.learnMore}</LearnMoreLink>
            </div>
          </FeatureCardShell>

          <FeatureCardShell index={1}>
            <div className="flex h-full flex-col p-5 md:p-6">
              <Image
                src={IMG_STORY}
                alt=""
                width={48}
                height={48}
                className="h-10 w-10 rounded object-cover sm:h-12 sm:w-12"
              />
              <p className="mt-4 text-sm font-medium text-[#E1E0CC] sm:text-base">{cards[1].title}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {"bullets" in cards[1] ? cards[1].bullets.map((item) => <CheckRow key={item}>{item}</CheckRow>) : null}
              </ul>
              <LearnMoreLink href="/trips#plan">{t.features.learnMore}</LearnMoreLink>
            </div>
          </FeatureCardShell>

          <FeatureCardShell index={2}>
            <div className="flex h-full flex-col p-5 md:p-6">
              <Image
                src={IMG_CRITIQUE}
                alt=""
                width={48}
                height={48}
                className="h-10 w-10 rounded object-cover sm:h-12 sm:w-12"
              />
              <p className="mt-4 text-sm font-medium text-[#E1E0CC] sm:text-base">{cards[2].title}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {"bullets" in cards[2] ? cards[2].bullets.map((item) => <CheckRow key={item}>{item}</CheckRow>) : null}
              </ul>
              <LearnMoreLink href="/dashboard">{t.features.learnMore}</LearnMoreLink>
            </div>
          </FeatureCardShell>

          <FeatureCardShell index={3}>
            <div className="flex h-full flex-col p-5 md:p-6">
              <Image
                src={IMG_CAPSULE}
                alt=""
                width={48}
                height={48}
                className="h-10 w-10 rounded object-cover sm:h-12 sm:w-12"
              />
              <p className="mt-4 text-sm font-medium text-[#E1E0CC] sm:text-base">{cards[3].title}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {"bullets" in cards[3] ? cards[3].bullets.map((item) => <CheckRow key={item}>{item}</CheckRow>) : null}
              </ul>
              <LearnMoreLink href="/profile">{t.features.learnMore}</LearnMoreLink>
            </div>
          </FeatureCardShell>
        </div>
      </div>
    </section>
  );
}
