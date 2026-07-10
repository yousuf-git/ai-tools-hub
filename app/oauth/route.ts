import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/appwrite/server";
import {
  SESSION_COOKIE,
  REMEMBER_ME_MAX_AGE,
} from "@/lib/appwrite/config";

/**
 * OAuth 2.0 callback. Appwrite redirects here with `userId` and `secret` query
 * params after the user authorizes with Google. We exchange them for a session
 * and store it in the hardened httpOnly cookie. OAuth logins persist for 30 days.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const secret = request.nextUrl.searchParams.get("secret");

  if (!userId || !secret) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  try {
    const { account } = createAdminClient();
    const session = await account.createSession({ userId, secret });

    const response = NextResponse.redirect(new URL("/account", request.url));
    response.cookies.set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REMEMBER_ME_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
