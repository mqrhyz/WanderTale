"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/dashboard");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    if (q?.startsWith("/")) setNext(q);
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <AuthFormShell
      kicker="Tài khoản"
      title="Đăng nhập"
      description="Tiếp tục hành trình — lịch trình và chuyến đi của bạn đang chờ."
      footer={
        <>
          <Link href="/forgot-password" className="wt-link font-medium">
            Quên mật khẩu?
          </Link>
          <span className="mx-2 text-wt-muted-soft">·</span>
          <Link href="/register" className="wt-link font-medium">
            Tạo tài khoản mới
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="wt-field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="wt-field-input"
            placeholder="ban@email.com"
          />
        </div>
        <div>
          <label className="wt-field-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="wt-field-input"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-wt-error">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-3 h-12 w-full rounded-xl text-[15px]">
          {loading ? "Đang xử lý…" : "Đăng nhập"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
