import { Playfair_Display } from "next/font/google";
import { DashboardShellProvider } from "@/components/dashboard/premium/DashboardShellProvider";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-dash-display",
  display: "swap",
});

export default function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} min-h-screen bg-premium-bg font-sans text-premium-ink antialiased`}>
      <DashboardShellProvider>{children}</DashboardShellProvider>
    </div>
  );
}
