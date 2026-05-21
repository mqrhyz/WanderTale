import Image from "next/image";
import Link from "next/link";
import { LOGO_MARK } from "@/lib/brand-assets";
import { cn } from "@/lib/cn";

type BrandLogoProps = {
  href?: string;
  /** sm: compact; md: sidebar / app nav; lg: footer / auth hero */
  size?: "sm" | "md" | "lg";
  /** Show "WanderTale" wordmark beside the logo */
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
  imageClassName?: string;
  priority?: boolean;
};

const HEIGHT = { sm: 40, md: 56, lg: 64 } as const;

const ROUNDED = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
} as const;

const LABEL_CLASS = {
  sm: "font-brand text-base font-bold tracking-tight !text-[#ff5a00]",
  md: "font-brand text-2xl font-bold tracking-tight !text-[#ff5a00]",
  lg: "font-brand text-[1.75rem] font-bold tracking-tight !text-[#ff5a00]",
} as const;

export function BrandLogo({
  href = "/",
  size = "sm",
  showLabel = false,
  className,
  labelClassName,
  imageClassName,
  priority,
}: BrandLogoProps) {
  const h = HEIGHT[size];

  const mark = (
    <span className={cn("inline-flex shrink-0 overflow-hidden", ROUNDED[size])}>
      <Image
        src={LOGO_MARK}
        alt={showLabel ? "" : "WanderTale"}
        width={800}
        height={800}
        priority={priority}
        className={cn("object-cover", ROUNDED[size], imageClassName)}
        style={{ height: h, width: h }}
        aria-hidden={showLabel || undefined}
      />
    </span>
  );

  const label = showLabel ? (
    <span
      className={cn(LABEL_CLASS[size], labelClassName)}
      style={{ fontFamily: "var(--font-brand), var(--font-sans), system-ui, sans-serif" }}
    >
      WanderTale
    </span>
  ) : null;

  const inner = (
    <>
      {mark}
      {label}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-premium-accent/40 rounded-xl",
          showLabel ? "gap-1 pl-0 pr-1" : "overflow-hidden",
          !showLabel && ROUNDED[size],
          className
        )}
        aria-label={showLabel ? undefined : "WanderTale"}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className={cn("inline-flex items-center", showLabel && "gap-1", className)}>
      {inner}
    </span>
  );
}
