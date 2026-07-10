import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata: Metadata = { title: "Confirm email — AI Forge" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId = "", secret = "" } = await searchParams;

  return (
    <AuthCard kicker="Email confirmation" title="Confirming your email">
      <VerifyEmailClient userId={userId} secret={secret} />
    </AuthCard>
  );
}
