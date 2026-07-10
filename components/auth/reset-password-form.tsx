"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { resetPassword } from "@/lib/appwrite/auth";

export function ResetPasswordForm({
  userId,
  secret,
}: {
  userId: string;
  secret: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const linkValid = Boolean(userId && secret);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await resetPassword({ userId, secret, password });
    if (result.success) {
      setDone(true);
      setTimeout(() => router.replace("/login?reset=1"), 1200);
    } else {
      setError(result.error);
      setPending(false);
    }
  }

  if (!linkValid) {
    return (
      <div className="space-y-5">
        <FormMessage type="error">
          This reset link is invalid or has expired. Request a new one.
        </FormMessage>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <FormMessage type="success">
        Password updated. Redirecting you to sign in…
      </FormMessage>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormMessage type="error">{error}</FormMessage>}

      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        required
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter password"
        minLength={8}
        required
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
