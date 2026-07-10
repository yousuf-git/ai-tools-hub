import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/appwrite/config";

/** Routes that require an authenticated session. */
const PROTECTED = ["/account"];
/** Auth routes an already-signed-in user should be bounced away from. */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Presence check only — the actual session is validated server-side on the
  // page via getLoggedInUser(). This keeps the proxy fast and cheap.
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_ROUTES.some((p) => pathname.startsWith(p)) && hasSession) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/login", "/signup", "/forgot-password"],
};
