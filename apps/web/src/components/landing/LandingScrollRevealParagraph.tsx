"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";

function CharOpacity({
  char,
  index,
  total,
  scrollYProgress,
}: {
  char: string;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}) {
  const t = Math.max(total, 1);
  const charProgress = index / t;
  const start = Math.max(0, charProgress - 0.1);
  let end = Math.min(1, charProgress + 0.05);
  if (end <= start) end = Math.min(1, start + 0.02);
  const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);

  return (
    <motion.span className="inline-block" style={{ opacity }}>
      {char === " " ? "\u00a0" : char}
    </motion.span>
  );
}

type LandingScrollRevealParagraphProps = {
  text: string;
  className?: string;
};

export function LandingScrollRevealParagraph({ text, className }: LandingScrollRevealParagraphProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });

  const chars = useMemo(() => Array.from(text), [text]);

  return (
    <p ref={ref} className={className}>
      {chars.map((char, i) => (
        <CharOpacity key={`${i}-${char}`} char={char} index={i} total={chars.length} scrollYProgress={scrollYProgress} />
      ))}
    </p>
  );
}
