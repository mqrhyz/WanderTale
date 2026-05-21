import { AppNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wt-canvas dark:bg-wt-night">
      <AppNav />
      <main className="wt-container max-w-content py-10 md:py-14">{children}</main>
    </div>
  );
}
