import { DashboardPageFrame } from "@/components/dashboard/premium/DashboardPageFrame";

export default function DashboardRouteLoading() {
  return (
    <DashboardPageFrame>
      <div className="animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-xl bg-premium-border/50" />
        <div className="h-4 w-72 max-w-full rounded-lg bg-premium-border/40" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-3xl bg-premium-border/35" />
          <div className="h-36 rounded-3xl bg-premium-border/35" />
        </div>
      </div>
    </DashboardPageFrame>
  );
}
