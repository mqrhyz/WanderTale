"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wt-card max-w-lg border-wt-error/30 p-10 text-center">
      <h2 className="text-lg font-semibold text-wt-ink dark:text-wt-night-ink">Đã xảy ra lỗi</h2>
      <p className="mt-3 font-mono text-sm text-wt-error">{error.message}</p>
      <Button type="button" variant="primary" onClick={reset} className="mt-8">
        Thử lại
      </Button>
    </div>
  );
}
