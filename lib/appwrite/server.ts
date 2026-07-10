import "server-only";

import { cookies, headers } from "next/headers";
import { Client, Account } from "node-appwrite";

import { appwriteConfig, SESSION_COOKIE } from "./config";

/**
 * Admin client — authenticated with the API key. Bypasses rate limits and can
 * create sessions / users. Reuse freely; it carries no per-user state.
 */
export function createAdminClient() {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setKey(appwriteConfig.apiKey);

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Public client — project scope only, no key, no session. Used for token-based
 * flows (password recovery / email verification) that authenticate purely with
 * the secret carried in the link, and for the initial OAuth redirect.
 */
export function createPublicClient() {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Session client — acts on behalf of the logged-in user via the session cookie.
 * Must be created per-request; never share it across users. Returns null when
 * no session cookie is present.
 */
export async function createSessionClient() {
  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session?.value) return null;

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setSession(session.value);

  const userAgent = (await headers()).get("user-agent");
  if (userAgent) client.setForwardedUserAgent(userAgent);

  return {
    get account() {
      return new Account(client);
    },
  };
}

/**
 * Returns the current user, or null if unauthenticated / the session expired.
 * Safe to call from Server Components and the middleware-protected pages.
 */
export async function getLoggedInUser() {
  try {
    const session = await createSessionClient();
    if (!session) return null;
    return await session.account.get();
  } catch {
    return null;
  }
}
