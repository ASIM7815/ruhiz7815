import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");
  const isPlatformPage =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/projects") ||
    req.nextUrl.pathname.startsWith("/knowledge") ||
    req.nextUrl.pathname.startsWith("/study-groups") ||
    req.nextUrl.pathname.startsWith("/marketplace") ||
    req.nextUrl.pathname.startsWith("/startups") ||
    req.nextUrl.pathname.startsWith("/messages") ||
    req.nextUrl.pathname.startsWith("/notifications") ||
    req.nextUrl.pathname.startsWith("/profile") ||
    req.nextUrl.pathname.startsWith("/settings") ||
    req.nextUrl.pathname.startsWith("/students");
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding");

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if ((isPlatformPage || isOnboardingPage) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect to onboarding if not completed (check JWT claim)
  if (isPlatformPage && isLoggedIn) {
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    if (onboardingComplete === false) {
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
    }
  }

  // Redirect away from onboarding if already completed
  if (isOnboardingPage && isLoggedIn) {
    const onboardingComplete = (req.auth as any)?.user?.onboardingComplete;
    if (onboardingComplete === true) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
