import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set new password — AI Forge" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; secret?: string }>;
}) {
  const { userId = "", secret = "" } = await searchParams;

  return (
    <AuthCard
      kicker="Account recovery"
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <ResetPasswordForm userId={userId} secret={secret} />
    </AuthCard>
  );
}
