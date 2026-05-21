import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    console.error("[wander-tale] Middleware uncaught — passing request through:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Skip all Next internals (static, RSC flight, HMR, image opt, …) so assets are never
     * touched by Supabase session logic — avoids rare mismatches and keeps dev chunks fast.
     */
    "/((?!_next/|api/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$).*)",
  ],
};
