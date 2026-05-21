import { Almarai, Instrument_Serif, Playfair_Display } from "next/font/google";

const almarai = Almarai({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  style: ["italic"],
  variable: "--font-instrument-landing",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair-display",
  display: "swap",
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${almarai.variable} ${instrumentSerif.variable} ${playfairDisplay.variable} landing-wt-root min-h-screen bg-black font-almarai text-[#E1E0CC]`}
    >
      {children}
    </div>
  );
}
