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
  // App database. One database per app, one table per feature — `resumes` backs
  // the Resume Catalogue. Rows are tied to a user by their Appwrite account id,
  // so no separate user table exists. Defaults match what
  // `npm run setup:catalogue` provisions, so a stock setup needs no extra env.
  databaseId: process.env.APPWRITE_DATABASE_ID ?? "ai-forge",
  resumesTableId: process.env.APPWRITE_RESUMES_TABLE_ID ?? "resumes",
};

/** Name of the httpOnly cookie that stores the Appwrite session secret. */
export const SESSION_COOKIE = "a_session";

/** "Remember me" persistence window, in seconds (30 days). */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;
