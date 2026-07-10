import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password — AI Forge" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      kicker="Account recovery"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
