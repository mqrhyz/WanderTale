"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type DashboardUserMenuProps = {
  displayName: string | null;
};

export function DashboardUserMenu({ displayName }: DashboardUserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = (displayName?.[0] ?? "W").toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-premium-border py-1.5 pl-1.5 pr-2 transition-colors hover:bg-premium-bg"
        aria-label="Menu tài khoản"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-premium-accent/15 text-sm font-medium text-premium-accent">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-premium-ink sm:block">
          {displayName ?? "Khách"}
        </span>
        <ChevronDown
          className={cn("hidden h-4 w-4 text-premium-muted transition-transform sm:block", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-premium-border bg-premium-surface py-1 shadow-[0_12px_40px_-12px_rgba(30,26,22,0.2)]"
        >
          <MenuLink href="/profile" icon={User} label="Hồ sơ" onNavigate={() => setOpen(false)} />
          <MenuLink href="/settings" icon={Settings} label="Cài đặt" onNavigate={() => setOpen(false)} />
          <div className="my-1 border-t border-premium-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-premium-ink transition-colors hover:bg-premium-bg"
    >
      <Icon className="h-4 w-4 shrink-0 text-premium-muted" aria-hidden />
      {label}
    </Link>
  );
}