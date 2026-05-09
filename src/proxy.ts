import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/fonts")
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPlatformPage = 
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/study-groups") ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/startups") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/onboarding");

  // Redirect logged-in users away from auth pages and home page to dashboard
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect logged-in users from home page to dashboard
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect non-logged-in users to login for platform pages
  if (isPlatformPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
