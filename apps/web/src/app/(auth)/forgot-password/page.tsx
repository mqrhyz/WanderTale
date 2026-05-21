"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/login`,
    });
    setLoading(false);
    if (err) setError(err.message);
    else setMsg("Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
  }

  return (
    <AuthFormShell
      kicker="Khôi phục"
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký — chúng tôi gửi link đặt lại mật khẩu."
      footer={
        <Link href="/login" className="wt-link font-medium">
          Quay lại đăng nhập
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="wt-field-label" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="wt-field-input"
            placeholder="ban@email.com"
          />
        </div>
        {error && <p className="text-sm text-wt-error">{error}</p>}
        {msg && <p className="text-sm text-wt-success">{msg}</p>}
        <Button type="submit" disabled={loading} className="mt-3 h-12 w-full rounded-xl text-[15px]">
          {loading ? "Đang gửi…" : "Gửi link"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
