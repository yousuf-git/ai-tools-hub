import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in — AI Forge" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <AuthCard kicker="Welcome back" title="Sign in" subtitle="Access your AI Forge workbench.">
      {reset === "1" && (
        <div className="mb-4">
          <FormMessage type="success">
            Password updated. Sign in with your new password.
          </FormMessage>
        </div>
      )}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
