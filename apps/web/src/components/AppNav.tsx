"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trips", label: "Chuyến đi" },
  { href: "/trips#plan", label: "Lên kế hoạch" },
  { href: "/admin", label: "Admin" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 h-[4.25rem] border-b border-wt-hairline bg-wt-canvas/90 backdrop-blur-md supports-[backdrop-filter]:bg-wt-canvas/75 dark:border-wt-night-border dark:bg-wt-night/90 dark:supports-[backdrop-filter]:bg-wt-night/75">
      <div className="wt-container flex h-full max-w-content items-center justify-between gap-4">
        <BrandLogo href="/dashboard" size="md" showLabel />
        <nav className="hidden flex-1 justify-center gap-1.5 md:flex">
          {links.map((l) => {
            const active =
              pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2.5 text-[14px] font-medium leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wt-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-wt-canvas dark:focus-visible:ring-offset-wt-night",
                  active
                    ? "bg-wt-surface text-wt-ink ring-1 ring-wt-hairline dark:bg-wt-night-elevated dark:text-wt-night-ink dark:ring-wt-night-border"
                    : "text-wt-body hover:bg-wt-hairline-soft hover:text-wt-ink dark:hover:bg-wt-night-elevated dark:hover:text-wt-night-ink"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="labeled" />
          <button
            type="button"
            onClick={logout}
            className="h-10 rounded-full bg-wt-ink px-5 text-[14px] font-medium text-wt-canvas transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wt-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-wt-canvas dark:bg-wt-night-ink dark:text-wt-night dark:focus-visible:ring-wt-night-ink/50 dark:focus-visible:ring-offset-wt-night"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
