"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/auth-card";
import { signIn } from "@/lib/appwrite/auth";
import type { FormAction } from "@/lib/appwrite/utils";

type FormError = { message: string; action?: FormAction };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/account";
  const prefillEmail = params.get("email") ?? "";

  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<FormError | null>(
    params.get("error") === "oauth"
      ? { message: "Google sign-in was cancelled or failed. Please try again." }
      : null
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const result = await signIn({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      remember: data.get("remember") === "on",
    });

    if (result.success) {
      router.replace(redirectTo);
      router.refresh();
    } else {
      setError({ message: result.error, action: result.action });
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <GoogleButton />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <FormMessage type="error" action={error.action}>
            {error.message}
          </FormMessage>
        )}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={prefillEmail}
          required
        />
        <div className="space-y-1.5">
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
          <div className="flex items-center justify-between pt-1">
            <Checkbox name="remember" label="Remember me for 30 days" />
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
