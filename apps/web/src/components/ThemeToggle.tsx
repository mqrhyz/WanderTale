"use client";

import { Moon, Sun } from "lucide-react";
import { applyThemeClass } from "@/lib/theme";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

type ThemeToggleProps = {
  /** Icon-only for top bars; labeled shows text on larger screens. */
  variant?: "icon" | "labeled";
  className?: string;
};

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const isDark = theme === "dark";

  function handleToggle() {
    const next = isDark ? "light" : "dark";
    applyThemeClass(next);
    setTheme(next);
  }

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-wt-hairline-strong bg-wt-surface px-3.5 py-2 text-[13px] font-medium text-wt-ink transition-colors hover:bg-wt-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wt-primary/30 dark:border-wt-night-border dark:bg-wt-night-elevated dark:text-wt-night-ink dark:hover:bg-wt-night",
          className
        )}
        aria-label={isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      >
        {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
        <span>{isDark ? "Sáng" : "Tối"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border border-premium-border text-premium-muted transition-colors hover:bg-premium-bg hover:text-premium-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-premium-accent/25",
        className
      )}
      aria-label={isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
    </button>
  );
}
