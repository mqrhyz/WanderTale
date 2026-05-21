"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const easeSoft = [0.16, 1, 0.3, 1] as const;

type WordsPullUpProps = {
  text: string;
  className?: string;
  showAsterisk?: boolean;
};

export function WordsPullUp({ text, className, showAsterisk }: WordsPullUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const words = text.trim().split(/\s+/);

  return (
    <div ref={ref} className={className}>
      <span className="inline-flex flex-wrap items-baseline justify-start gap-x-[0.15em]">
        {words.map((word, wi) => {
          const isLast = wi === words.length - 1;
          return (
            <span key={`${word}-${wi}`} className="inline-flex items-baseline">
              {isLast && showAsterisk ? (
                <motion.span
                  className="relative inline-block whitespace-nowrap font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.65,
                    delay: wi * 0.08,
                    ease: easeSoft,
                  }}
                >
                  {word.length > 1 ? (
                    <>
                      <span>{word.slice(0, -1)}</span>
                      <span className="relative inline-block">
                        {word.slice(-1)}
                        <sup className="absolute -right-[0.3em] top-[0.65em] text-[0.31em] font-medium leading-none">
                          *
                        </sup>
                      </span>
                    </>
                  ) : (
                    <>
                      {word}
                      <sup className="relative -top-[0.2em] text-[0.31em]">*</sup>
                    </>
                  )}
                </motion.span>
              ) : (
                <motion.span
                  className="inline-block font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.65,
                    delay: wi * 0.08,
                    ease: easeSoft,
                  }}
                >
                  {word}
                </motion.span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}
