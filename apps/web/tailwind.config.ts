import type { Config } from "tailwindcss";

/**
 * Design tokens aligned with `DESIGN.md` (app shell). Marketing `/` uses `primary` cream + Almarai in `(landing)` layout.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  safelist: [
    "font-brand",
    "text-premium-accent",
    "text-xl",
    "text-2xl",
    "font-bold",
  ],
  theme: {
    extend: {
      maxWidth: {
        content: "1200px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        brand: ["var(--font-brand)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        almarai: [
          "var(--font-almarai)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
        serif: ["var(--font-instrument-landing)", "Instrument Serif", "Georgia", "serif"],
        display: ["var(--font-dash-display)", "var(--font-playfair-display)", "Playfair Display", "Georgia", "serif"],
      },
      colors: {
        premium: {
          bg: "var(--premium-bg)",
          surface: "var(--premium-surface)",
          ink: "var(--premium-ink)",
          muted: "var(--premium-muted)",
          accent: "var(--premium-accent)",
          blue: "var(--premium-blue)",
          green: "var(--premium-green)",
          purple: "var(--premium-purple)",
          border: "var(--premium-border)",
        },
        primary: "#DEDBC8",
        wt: {
          canvas: "#f7f7f4",
          "canvas-soft": "#fafaf7",
          ink: "#26251e",
          body: "#5a5852",
          muted: "#807d72",
          "muted-soft": "#a09c92",
          hairline: "#e6e5e0",
          "hairline-soft": "#efeee8",
          "hairline-strong": "#cfcdc4",
          surface: "#ffffff",
          "surface-strong": "#e6e5e0",
          primary: "#f54e00",
          "primary-active": "#d04200",
          "on-primary": "#ffffff",
          tlThink: "#dfa88f",
          tlGrep: "#9fc9a2",
          tlRead: "#9fbbe0",
          tlEdit: "#c0a8dd",
          tlDone: "#c08532",
          error: "#cf2d56",
          success: "#1f8a65",
          night: "#141413",
          "night-elevated": "#1c1c19",
          "night-border": "#2a2926",
          "night-ink": "#f0efe9",
        },
      },
      borderRadius: {
        wt: "8px",
        "wt-lg": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
