import { cn } from "@/lib/cn";
import * as React from "react";

type Variant = "primary" | "secondary" | "ink" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-wt-primary text-wt-on-primary hover:bg-wt-primary-active disabled:opacity-50 border border-transparent",
  secondary:
    "border border-wt-hairline-strong bg-wt-surface text-wt-ink hover:bg-wt-canvas-soft dark:border-wt-night-border dark:bg-wt-night-elevated dark:text-wt-night-ink dark:hover:bg-wt-night",
  ink: "bg-wt-ink text-wt-canvas hover:opacity-90 dark:bg-wt-night-ink dark:text-wt-night",
  danger:
    "border border-wt-error/30 bg-wt-surface text-wt-error hover:bg-wt-error/[0.06] dark:border-wt-error/40 dark:bg-wt-night-elevated dark:text-wt-error",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-wt px-[18px] text-sm font-medium leading-none transition-colors",
        variants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
