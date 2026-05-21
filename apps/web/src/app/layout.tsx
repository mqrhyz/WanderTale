import type { Metadata } from "next";
import { createElement } from "react";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers";
import { LanguageProvider } from "@/lib/i18n";
import { LOGO_FAVICON } from "@/lib/brand-assets";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WanderTale — Trợ lý du lịch AI cho chuyến đi thật",
  description:
    "Itinerary theo ngày, thời tiết & bản đồ thời gian thực, ưu đãi đối tác và gợi ý AI — dữ liệu Supabase, bảo mật RLS, không mock luồng chính.",
  icons: {
    icon: [{ url: LOGO_FAVICON, type: "image/png" }],
    apple: [{ url: LOGO_FAVICON, type: "image/png" }],
    shortcut: LOGO_FAVICON,
  },
  openGraph: {
    title: "WanderTale — Trợ lý du lịch AI",
    description: "Lên lịch thông minh, dữ liệu thật, trải nghiệm chỉn chu cho mọi chuyến đi.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("wander-tale-ui");var t="light";if(s){var p=JSON.parse(s);if(p&&p.state&&p.state.theme)t=p.state.theme;}var r=document.documentElement,d=t==="dark";r.classList.toggle("dark",d);r.dataset.theme=t;r.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} font-sans`}>
        {createElement(LanguageProvider, null, createElement(ThemeProvider, null, children)) as unknown as React.ReactNode}
      </body>
    </html>
  );
}
