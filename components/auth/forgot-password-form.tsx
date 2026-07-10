"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { forgotPassword } from "@/lib/appwrite/auth";

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const result = await forgotPassword({ email: String(data.get("email") ?? "") });

    if (result.success) {
      setSent(result.message ?? "Check your inbox for a reset link.");
    } else {
      setError(result.error);
    }
    setPending(false);
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <FormMessage type="success">{sent}</FormMessage>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <FormMessage type="error">{error}</FormMessage>}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
