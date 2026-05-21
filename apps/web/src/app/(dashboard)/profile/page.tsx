"use client";

import { useEffect, useState } from "react";
import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";
import { DashboardPageHeader } from "@/components/dashboard/premium/DashboardPageHeader";
import { createClient } from "@/lib/supabase/client";

type ProfileRow = {
  display_name: string | null;
  email: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, email, phone")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) {
        if (error) setErr(error.message);
        else if (data) {
          const row = data as ProfileRow;
          setDisplayName(row.display_name ?? "");
          setEmail(row.email ?? userData.user?.email ?? "");
          setPhone(row.phone ?? "");
        } else if (userData.user?.email) {
          setEmail(userData.user.email);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone.trim() || null })
      .eq("id", uid);
    if (error) setErr(error.message);
    else setMsg("Đã lưu số điện thoại.");
  }

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        kicker="Tài khoản"
        title="Hồ sơ"
        description="Thông tin tài khoản từ lúc đăng ký. Chỉ số điện thoại có thể cập nhật."
      />

      {loading ? (
        <div className="mt-8 h-64 animate-pulse rounded-3xl bg-premium-border/40" />
      ) : (
        <form
          onSubmit={save}
          className="mt-8 max-w-lg space-y-5 rounded-3xl border border-premium-border bg-premium-surface p-6 md:p-8"
        >
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-premium-muted">
              Tên hiển thị
            </label>
            <p className="mt-1.5 rounded-2xl border border-premium-border bg-premium-bg/60 px-4 py-3 text-sm text-premium-ink">
              {displayName || "—"}
            </p>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-premium-muted">Email</label>
            <p className="mt-1.5 rounded-2xl border border-premium-border bg-premium-bg/60 px-4 py-3 text-sm text-premium-ink">
              {email || "—"}
            </p>
          </div>
          <div>
            <label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-wide text-premium-muted">
              Số điện thoại
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-premium-border bg-premium-bg px-4 text-sm text-premium-ink focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/20"
              placeholder="09xxxxxxxx"
              inputMode="tel"
            />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
          <button
            type="submit"
            className="h-11 w-full rounded-2xl bg-premium-accent text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Lưu số điện thoại
          </button>
        </form>
      )}
    </DashboardPageFrame>
  );
}
