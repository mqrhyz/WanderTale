/** Lightweight route enter — CSS only, no Framer on every navigation. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="dash-page-enter min-h-0 flex-1">{children}</div>;
}
