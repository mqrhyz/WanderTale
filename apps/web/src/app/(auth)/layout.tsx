export const dynamic = "force-dynamic";

import { Roboto } from "next/font/google";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthHeroAside } from "@/components/auth/AuthHeroAside";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`relative min-h-screen ${roboto.className}`}>
      <AuthBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:p-6 md:flex-row md:items-center md:justify-center md:gap-10 md:p-10 lg:gap-14">
        <AuthHeroAside />
        <main className="wt-auth-surface flex w-full max-w-[440px] shrink-0 justify-center md:max-w-[460px]">{children}</main>
      </div>
    </div>
  );
}
