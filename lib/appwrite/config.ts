/**
 * Central Appwrite configuration. All values are read from the environment so
 * the same code runs across local / preview / production without edits.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See AUTH_SETUP.md.`
    );
  }
  return value;
}

export const appwriteConfig = {
  endpoint: required(
    "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  ),
  projectId: required(
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  ),
  // Server-only secret. Never exposed to the client bundle.
  apiKey: process.env.APPWRITE_API_KEY ?? "",
};

/** Name of the httpOnly cookie that stores the Appwrite session secret. */
export const SESSION_COOKIE = "a_session";

/** "Remember me" persistence window, in seconds (30 days). */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;
