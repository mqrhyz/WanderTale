import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_GET_USER_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error("supabase.auth.getUser timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (id !== undefined) clearTimeout(id);
  });
}

/** Session refresh writes cookies on this response; redirects must forward them. */
function copyCookies(from: NextResponse, to: NextResponse) {
  try {
    from.cookies.getAll().forEach(({ name, value }) => {
      if (!name) return;
      try {
        to.cookies.set(name, value);
      } catch {
        /* ignore invalid cookie copy */
      }
    });
  } catch {
    /* ignore */
  }
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[wander-tale] Missing Supabase URL/anon key — đặt SUPABASE_URL + SUPABASE_ANON_KEY trong wander-tale/.env (web tự derive NEXT_PUBLIC_*)."
      );
    }
    return NextResponse.next({ request });
  }

  try {
    new URL(supabaseUrl);
  } catch {
    console.warn("[wander-tale] Invalid NEXT_PUBLIC_SUPABASE_URL — session middleware skipped.");
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value }) => {
              if (!name) return;
              try {
                request.cookies.set(name, value);
              } catch {
                /* read-only request cookies */
              }
            });
          } catch {
            /* Next.js 15+ may forbid mutating request cookies in middleware */
          }
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            if (!name) return;
            try {
              response.cookies.set(name, value, options);
            } catch {
              /* ignore oversized / invalid Set-Cookie */
            }
          });
        },
      },
    });

    let user = null;
    try {
      const { data } = await withTimeout(supabase.auth.getUser(), AUTH_GET_USER_MS);
      user = data.user;
    } catch (e) {
      console.warn("[wander-tale] getUser skipped:", e);
      return NextResponse.next({ request });
    }

    const path = request.nextUrl.pathname;
    const isProtected =
      path.startsWith("/dashboard") ||
      path.startsWith("/trips") ||
      path.startsWith("/ai") ||
      path.startsWith("/favorites") ||
      path.startsWith("/history") ||
      path.startsWith("/settings") ||
      path.startsWith("/profile") ||
      path.startsWith("/admin");
    const isAuthPage =
      path.startsWith("/login") ||
      path.startsWith("/register") ||
      path.startsWith("/forgot-password");

    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      const redirect = NextResponse.redirect(url);
      copyCookies(response, redirect);
      return redirect;
    }

    if (isAuthPage && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      const redirect = NextResponse.redirect(url);
      copyCookies(response, redirect);
      return redirect;
    }

    return response;
  } catch (err) {
    console.error("[wander-tale] Middleware session error:", err);
    return NextResponse.next({ request });
  }
}
