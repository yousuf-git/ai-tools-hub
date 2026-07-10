import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account — AI Forge" };

export default function SignupPage() {
  return (
    <AuthCard
      kicker="Get started"
      title="Create your account"
      subtitle="Join AI Forge — tools that help you win the contract."
    >
      <SignupForm />
    </AuthCard>
  );
}
