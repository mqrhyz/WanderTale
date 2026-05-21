"use client";

import { motion, useInView } from "framer-motion";
import { useMemo, useRef } from "react";

const easeSoft = [0.16, 1, 0.3, 1] as const;

export type MultiStyleSegment = { text: string; className: string };

type WordsPullUpMultiStyleProps = {
  segments: MultiStyleSegment[];
  className?: string;
};

export function WordsPullUpMultiStyle({ segments, className }: WordsPullUpMultiStyleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const flat = useMemo(() => {
    const out: { word: string; className: string; key: string }[] = [];
    let i = 0;
    for (const seg of segments) {
      const words = seg.text.trim().split(/\s+/);
      for (const w of words) {
        if (!w) continue;
        out.push({ word: w, className: seg.className, key: `${i++}-${w}` });
      }
    }
    return out;
  }, [segments]);

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className ?? ""}`}>
      {flat.map(({ word, className: cn, key }, wi) => (
        <motion.span
          key={key}
          className={`inline-block ${wi < flat.length - 1 ? "mr-[0.28em]" : ""} ${cn}`}
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
      ))}
    </div>
  );
}
