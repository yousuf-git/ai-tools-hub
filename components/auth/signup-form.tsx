"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/auth-card";
import { signUp } from "@/lib/appwrite/auth";
import type { FormAction } from "@/lib/appwrite/utils";

type FormError = { message: string; action?: FormAction };

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<FormError | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const result = await signUp({
      name: String(data.get("name") ?? ""),
      email,
      password: String(data.get("password") ?? ""),
      remember: data.get("remember") === "on",
    });

    if (result.success) {
      router.replace("/account?welcome=1");
      router.refresh();
    } else {
      // Carry the entered email onto the "Sign in instead" link so the login
      // form lands pre-filled.
      const action =
        result.action?.href === "/login"
          ? { ...result.action, href: `/login?email=${encodeURIComponent(email)}` }
          : result.action;
      setError({ message: result.error, action });
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <GoogleButton label="Sign up with Google" />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <FormMessage type="error" action={error.action}>
            {error.message}
          </FormMessage>
        )}

        <Field
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        <Checkbox name="remember" label="Remember me for 30 days" defaultChecked />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll email you a link to confirm your address.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
