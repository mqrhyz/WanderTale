import { cn } from "@/lib/cn";

type DashboardImageVignetteProps = {
  /** Hero banner uses ink; trip cards use darker black vignettes. */
  variant?: "hero" | "card";
  className?: string;
};

export function DashboardImageVignette({ variant = "hero", className }: DashboardImageVignetteProps) {
  const isHero = variant === "hero";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[1] w-[min(50%,380px)] bg-gradient-to-r to-transparent",
          isHero ? "from-[#1E1A16]/96 via-[#1E1A16]/58" : "from-black/85 via-black/45",
          className
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[1] w-[min(46%,340px)] bg-gradient-to-l to-transparent",
          isHero ? "from-[#1E1A16]/94 via-[#1E1A16]/52" : "from-black/80 via-black/40",
          className
        )}
        aria-hidden
      />
    </>
  );
}
