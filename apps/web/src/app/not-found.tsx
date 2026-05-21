import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-wt-canvas px-6 dark:bg-wt-night">
      <p className="wt-kicker">404</p>
      <h1 className="wt-display mt-3 text-center text-3xl font-normal tracking-tight text-wt-ink dark:text-wt-night-ink md:text-4xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-4 max-w-md text-center text-sm text-wt-body dark:text-wt-muted">
        Đường dẫn không tồn tại hoặc đã được đổi. Quay về trang chủ hoặc đăng nhập.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-wt bg-wt-primary px-[18px] text-sm font-medium text-wt-on-primary transition-colors hover:bg-wt-primary-active"
        >
          Trang chủ
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-wt border border-wt-hairline-strong bg-wt-surface px-[18px] text-sm font-medium text-wt-ink transition-colors hover:bg-wt-canvas-soft dark:border-wt-night-border dark:bg-wt-night-elevated dark:text-wt-night-ink dark:hover:bg-wt-night"
        >
          Đăng nhập
        </Link>
      </div>
    </div>
  );
}
