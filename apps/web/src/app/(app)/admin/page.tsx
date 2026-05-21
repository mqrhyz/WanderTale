"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [vouchers, setVouchers] = useState<unknown[]>([]);
  const [partners, setPartners] = useState<unknown[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setIsAdmin(false);
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      const admin = Boolean(prof?.is_admin);
      if (!cancelled) setIsAdmin(admin);
      if (!admin) return;

      const [vRes, pRes] = await Promise.all([
        supabase.from("vouchers").select("id, code, title, valid_from, valid_until, partners(name)"),
        supabase.from("partners").select("*"),
      ]);
      if (!cancelled) {
        if (vRes.error) setErr(vRes.error.message);
        else setVouchers(vRes.data ?? []);
        if (pRes.error) setErr(pRes.error.message);
        else setPartners(pRes.data ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAdmin === null) {
    return <div className="wt-skeleton h-24 max-w-2xl" />;
  }

  if (!isAdmin) {
    return (
      <div className="wt-card max-w-2xl border-wt-hairline-strong p-8 text-sm leading-relaxed text-wt-body dark:text-wt-muted">
        Bạn không có quyền admin. Cập nhật{" "}
        <code className="rounded-wt bg-wt-canvas-soft px-2 py-0.5 font-mono text-xs text-wt-ink dark:bg-wt-night dark:text-wt-night-ink">
          profiles.is_admin
        </code>{" "}
        trong Supabase SQL (sau khi đăng ký).
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <p className="wt-kicker">Quản trị</p>
        <h1 className="wt-display mt-2 text-[1.625rem] font-normal tracking-[-0.02em] md:text-[2rem]">Admin</h1>
      </header>
      {err && <p className="text-sm text-wt-error">{err}</p>}
      <section>
        <h2 className="text-lg font-semibold text-wt-ink dark:text-wt-night-ink">Đối tác</h2>
        <ul className="mt-4 space-y-2">
          {partners.map((p) => {
            const row = p as { id: string; name: string; website?: string };
            return (
              <li key={row.id} className="wt-card px-4 py-3 text-sm text-wt-body dark:text-wt-muted">
                <span className="font-medium text-wt-ink dark:text-wt-night-ink">{row.name}</span>
                {row.website ? <span className="text-wt-muted"> · {row.website}</span> : null}
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-wt-ink dark:text-wt-night-ink">Voucher</h2>
        <ul className="mt-4 space-y-2">
          {vouchers.map((v) => {
            const row = v as {
              id: string;
              code: string;
              title: string;
              valid_from: string;
              valid_until: string;
              partners?: { name?: string } | null;
            };
            return (
              <li key={row.id} className="wt-card px-4 py-3 text-sm">
                <span className="font-mono font-medium text-wt-ink dark:text-wt-night-ink">{row.code}</span>
                <span className="text-wt-body dark:text-wt-muted"> — {row.title}</span>
                <div className="mt-1 text-xs text-wt-muted dark:text-wt-muted-soft">
                  {row.valid_from} → {row.valid_until}
                  {row.partners?.name ? ` · ${row.partners.name}` : ""}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
