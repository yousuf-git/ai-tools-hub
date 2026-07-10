import "server-only";

import { headers } from "next/headers";
import { AppwriteException } from "node-appwrite";

/**
 * Absolute base URL of the running app. Prefers the explicit env value (needed
 * for links inside verification / recovery emails), falling back to the request
 * host so local dev and preview deployments work without extra config.
 */
export async function getBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** A one-tap next step attached to an error, e.g. "Sign in instead". */
export type FormAction = { label: string; href: string };

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string; action?: FormAction };

/** Maps Appwrite exceptions to safe, user-facing messages with a helpful next step. */
export function toActionError(err: unknown): ActionResult {
  if (err instanceof AppwriteException) {
    switch (err.type) {
      case "user_already_exists":
      case "user_target_already_exists":
        return {
          success: false,
          error: "An account with this email already exists.",
          action: { label: "Sign in instead", href: "/login" },
        };
      case "user_invalid_credentials":
        return {
          success: false,
          error: "Incorrect email or password.",
          action: { label: "Reset your password", href: "/forgot-password" },
        };
      case "user_blocked":
        return { success: false, error: "This account has been blocked. Contact support if you think this is a mistake." };
      case "user_password_mismatch":
        return { success: false, error: "Your current password is incorrect." };
      case "password_recently_used":
      case "password_personal_data":
        return { success: false, error: "Please choose a stronger, unused password." };
      case "general_rate_limit_exceeded":
        return { success: false, error: "Too many attempts. Please wait a minute and try again." };
      default:
        // Unmapped Appwrite errors are technical — log the detail, show a friendly line.
        console.error(`Unmapped Appwrite error [${err.type}]:`, err.message);
        return { success: false, error: "Something went wrong on our end. Please try again in a moment." };
    }
  }
  console.error("Unexpected auth error:", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server-side input validation. Returns an error string, or null if valid. */
export function validateEmail(email: string): string | null {
  if (!email || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8)
    return "Password must be at least 8 characters.";
  if (password.length > 256) return "Password is too long.";
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name?.trim() ?? "";
  if (trimmed.length < 2) return "Enter your name.";
  if (trimmed.length > 128) return "Name is too long.";
  return null;
}
