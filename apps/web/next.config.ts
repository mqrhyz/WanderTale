import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(rootDir, ".env") });

const port = process.env.PORT ?? "8000";
const apiPublicUrl =
  process.env.API_PUBLIC_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  `http://127.0.0.1:${port}`;

/** Web đọc root `.env`; derive NEXT_PUBLIC_* từ biến backend/mobile chung. */
const webPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_API_URL: apiPublicUrl,
};

const nextConfig: NextConfig = {
  env: webPublicEnv,
  transpilePackages: ["@wander-tale/shared"],
  /** Dev: proxy /api → Fastify để tránh CORS (đặc biệt SSE stream). */
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/:path*", destination: `${apiPublicUrl}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: "/offers", destination: "/trips", permanent: true },
      { source: "/map", destination: "/trips", permanent: true },
      { source: "/trips/new", destination: "/trips#plan", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
        pathname: "/maps/api/staticmap/**",
      },
      {
        protocol: "https",
        hostname: "images.higgs.ai",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "openweathermap.org",
        pathname: "/img/wn/**",
      },
    ],
  },
};

export default nextConfig;
