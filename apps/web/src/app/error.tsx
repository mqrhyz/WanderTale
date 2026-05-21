"use client";

/**
 * Error boundary segment — tránh import phụ (Button) để giảm rủi ro khi bundle lỗi.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-wt-canvas px-6 dark:bg-wt-night">
      <div className="wt-card max-w-lg border-wt-error/30 p-10 text-center">
        <h2 className="text-lg font-semibold text-wt-ink dark:text-wt-night-ink">Đã xảy ra lỗi</h2>
        <p className="mt-3 font-mono text-sm text-wt-error">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 inline-flex h-10 items-center justify-center rounded-wt bg-wt-primary px-[18px] text-sm font-medium text-wt-on-primary transition-colors hover:bg-wt-primary-active"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
