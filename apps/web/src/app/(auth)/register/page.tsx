"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthFormShell } from "@/components/auth/AuthFormShell";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("profiles").upsert(
        {
          id: uid,
          display_name: displayName.trim() || email.split("@")[0],
          email: email.trim(),
        },
        { onConflict: "id" },
      );
    }
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthFormShell
      kicker="Bắt đầu"
      title="Đăng ký"
      description="Tạo tài khoản WanderTale — đồng bộ chuyến đi trên mọi thiết bị."
      footer={
        <Link href="/login" className="wt-link font-medium">
          Đã có tài khoản? Đăng nhập
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="wt-field-label" htmlFor="register-name">
            Tên hiển thị
          </label>
          <input
            id="register-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="wt-field-input"
            placeholder="Tên của bạn"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="wt-field-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
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
          <label className="wt-field-label" htmlFor="register-password">
            Mật khẩu
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="wt-field-input"
            placeholder="Tối thiểu 6 ký tự"
          />
        </div>
        {error && <p className="text-sm text-wt-error">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-3 h-12 w-full rounded-xl text-[15px]">
          {loading ? "Đang tạo…" : "Tạo tài khoản"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
