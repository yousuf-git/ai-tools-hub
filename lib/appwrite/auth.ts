"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Client, Account, ID, OAuthProvider } from "node-appwrite";

import { appwriteConfig, SESSION_COOKIE, REMEMBER_ME_MAX_AGE } from "./config";
import {
  createAdminClient,
  createPublicClient,
  createSessionClient,
} from "./server";
import {
  getBaseUrl,
  toActionError,
  validateEmail,
  validateName,
  validatePassword,
  type ActionResult,
} from "./utils";

/** Writes the session secret into a hardened httpOnly cookie. */
async function setSessionCookie(secret: string, remember: boolean) {
  const store = await cookies();
  store.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // "lax" so the OAuth redirect back to the app carries the cookie
    path: "/",
    // remember me → 30-day persistent cookie; otherwise a session cookie that
    // clears when the browser closes.
    ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  });
}

/** Account service bound to a freshly-issued session secret (same request). */
function accountFromSecret(secret: string) {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setSession(secret);
  return new Account(client);
}

// ---------------------------------------------------------------------------
// Email / password
// ---------------------------------------------------------------------------

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  remember: boolean;
}): Promise<ActionResult> {
  const nameErr = validateName(input.name);
  if (nameErr) return { success: false, error: nameErr };
  const emailErr = validateEmail(input.email);
  if (emailErr) return { success: false, error: emailErr };
  const passErr = validatePassword(input.password);
  if (passErr) return { success: false, error: passErr };

  const email = input.email.trim().toLowerCase();

  try {
    const { account } = createAdminClient();
    await account.create({
      userId: ID.unique(),
      email,
      password: input.password,
      name: input.name.trim(),
    });

    const session = await account.createEmailPasswordSession({
      email,
      password: input.password,
    });
    await setSessionCookie(session.secret, input.remember);

    // Best-effort verification email — a transient mail hiccup must not fail signup.
    try {
      const baseUrl = await getBaseUrl();
      await accountFromSecret(session.secret).createVerification({
        url: `${baseUrl}/verify-email`,
      });
    } catch {
      /* ignore — user can resend from the account page */
    }

    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function signIn(input: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<ActionResult> {
  const emailErr = validateEmail(input.email);
  if (emailErr) return { success: false, error: emailErr };
  if (!input.password) return { success: false, error: "Enter your password." };

  try {
    const { account } = createAdminClient();
    const session = await account.createEmailPasswordSession({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    await setSessionCookie(session.secret, input.remember);
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function signOut(): Promise<void> {
  try {
    const session = await createSessionClient();
    await session?.account.deleteSession({ sessionId: "current" });
  } catch {
    /* ignore — clear the cookie regardless */
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Google OAuth 2.0
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<ActionResult | never> {
  let url: string;
  try {
    const baseUrl = await getBaseUrl();
    const { account } = createAdminClient();
    url = await account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: `${baseUrl}/oauth`,
      failure: `${baseUrl}/login?error=oauth`,
    });
  } catch (err) {
    return toActionError(err);
  }
  redirect(url);
}

// ---------------------------------------------------------------------------
// Password recovery (forgot / reset)
// ---------------------------------------------------------------------------

export async function forgotPassword(input: {
  email: string;
}): Promise<ActionResult> {
  const emailErr = validateEmail(input.email);
  if (emailErr) return { success: false, error: emailErr };

  try {
    const baseUrl = await getBaseUrl();
    // Guest flow — authenticated by the emailed secret, no API key needed.
    const { account } = createPublicClient();
    await account.createRecovery({
      email: input.email.trim().toLowerCase(),
      url: `${baseUrl}/reset-password`,
    });
  } catch {
    // Swallow errors: never reveal whether an email is registered.
  }
  // Always report success to prevent account enumeration.
  return {
    success: true,
    message: "If that email is registered, a reset link is on its way.",
  };
}

export async function resetPassword(input: {
  userId: string;
  secret: string;
  password: string;
}): Promise<ActionResult> {
  if (!input.userId || !input.secret)
    return { success: false, error: "This reset link is invalid or expired." };
  const passErr = validatePassword(input.password);
  if (passErr) return { success: false, error: passErr };

  try {
    const { account } = createPublicClient();
    await account.updateRecovery({
      userId: input.userId,
      secret: input.secret,
      password: input.password,
    });
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function verifyEmail(input: {
  userId: string;
  secret: string;
}): Promise<ActionResult> {
  if (!input.userId || !input.secret)
    return { success: false, error: "This verification link is invalid or expired." };

  try {
    const { account } = createPublicClient();
    await account.updateVerification({
      userId: input.userId,
      secret: input.secret,
    });
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function resendVerification(): Promise<ActionResult> {
  try {
    const session = await createSessionClient();
    if (!session) return { success: false, error: "You need to be signed in." };
    const baseUrl = await getBaseUrl();
    await session.account.createVerification({
      url: `${baseUrl}/verify-email`,
    });
    return { success: true, message: "Verification email sent." };
  } catch (err) {
    return toActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Account management (authenticated)
// ---------------------------------------------------------------------------

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const passErr = validatePassword(input.newPassword);
  if (passErr) return { success: false, error: passErr };

  try {
    const session = await createSessionClient();
    if (!session) return { success: false, error: "You need to be signed in." };
    await session.account.updatePassword({
      password: input.newPassword,
      oldPassword: input.oldPassword,
    });
    return { success: true, message: "Password updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateName(input: { name: string }): Promise<ActionResult> {
  const nameErr = validateName(input.name);
  if (nameErr) return { success: false, error: nameErr };

  try {
    const session = await createSessionClient();
    if (!session) return { success: false, error: "You need to be signed in." };
    await session.account.updateName({ name: input.name.trim() });
    return { success: true, message: "Name updated." };
  } catch (err) {
    return toActionError(err);
  }
}
