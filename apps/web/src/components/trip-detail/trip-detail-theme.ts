/** Semantic class tokens — light default, dark via `html.dark`. */
export const td = {
  page: "bg-[#FAFAF9] text-[#1A1A1A] dark:bg-[#0F0F0F] dark:text-[#F2F2F2]",

  textPrimary: "text-[#1A1A1A] dark:text-[#F2F2F2]",
  textSecondary: "text-[#6B6B6B] dark:text-[#9A9A9A]",
  textMuted: "text-[#9A9A9A] dark:text-[#5A5A5A]",

  border: "border-black/[0.08] dark:border-white/[0.08]",
  borderHover: "hover:border-black/[0.14] dark:hover:border-white/[0.14]",
  borderSubtle: "border-black/[0.06] dark:border-white/[0.06]",
  borderDashed: "border-dashed border-black/[0.08] dark:border-white/[0.08]",

  surface: "bg-white dark:bg-[#181818]",
  surfaceRaised: "bg-[#F7F7F5] dark:bg-[#1C1C1C]",
  surfaceElevated: "bg-[#EFEFED] dark:bg-[#222222]",
  surfacePill: "bg-[#F3F3F1] dark:bg-[#1A1A1A]",

  header:
    "border-black/[0.08] bg-[#FAFAF9]/95 backdrop-blur-sm dark:border-white/[0.08] dark:bg-[#0F0F0F]/95",

  accent: "text-[#F97316]",
  accentBorder: "border-[#F97316]/40 dark:border-[#F97316]/30",
  accentBgSoft: "bg-[#F97316]/10 dark:bg-[#F97316]/15",

  focusRing:
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F97316] focus-visible:outline-offset-2",

  timeline: "border-black/10 dark:border-white/10",
  timelineDotRing: "ring-[#FAFAF9] dark:ring-[#181818]",

  btnOutline:
    "border-black/[0.08] text-[#1A1A1A] hover:border-black/[0.14] hover:bg-[#F3F3F1] dark:border-white/[0.08] dark:text-[#F2F2F2] dark:hover:border-white/[0.14] dark:hover:bg-[#181818]",

  btnPrimary: "bg-[#F97316] text-white hover:bg-[#ea580c] dark:text-[#0F0F0F]",

  link: "text-[#6B6B6B] hover:text-[#1A1A1A] dark:text-[#9A9A9A] dark:hover:text-[#F2F2F2]",

  warningBox:
    "border-amber-200/80 bg-amber-50/90 dark:border-[#F59E0B]/30 dark:bg-[#181818]",
  warningText: "text-amber-800 dark:text-[#F59E0B]",
  warningBody: "text-amber-900/70 dark:text-[#9A9A9A]",

  errorText: "text-red-600 dark:text-[#EF4444]",
  errorBorder: "border-red-200 dark:border-[#EF4444]/30",
  errorHover: "hover:bg-red-50 dark:hover:bg-[#EF4444]/10",

  hotelRecommended:
    "border-[#F97316]/40 bg-orange-50/60 dark:border-[#F97316]/30 dark:bg-[#222222]",
  hotelAlt:
    "border-black/[0.08] bg-white hover:border-[#F97316]/40 hover:bg-orange-50/40 dark:border-white/[0.08] dark:bg-[#1C1C1C] dark:hover:border-[#F97316]/40 dark:hover:bg-[#262626]",

  heroOverlay: "bg-[#F97316]/15 mix-blend-multiply dark:bg-[#F97316]/20",

  skeleton: "bg-[#EFEFED] dark:bg-[#181818]",

  footerBorder: "border-black/[0.08] dark:border-white/[0.08]",
} as const;
