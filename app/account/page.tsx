import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { AccountClient } from "@/components/auth/account-client";
import { getLoggedInUser } from "@/lib/appwrite/server";

export const metadata: Metadata = { title: "Your account — AI Forge" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getLoggedInUser();
  const { welcome } = await searchParams;

  // Defence in depth — middleware only checks cookie presence.
  if (!user) redirect("/login?redirect=/account");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 sm:px-10">
        <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
          AI&nbsp;FORGE
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {user.name ? `Hi, ${user.name.split(" ")[0]}` : "Your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, email, and security.
        </p>

        <div className="mt-8">
          <AccountClient
            welcome={welcome === "1"}
            user={{
              name: user.name,
              email: user.email,
              emailVerification: user.emailVerification,
              hasPassword: Boolean(user.passwordUpdate),
            }}
          />
        </div>
      </main>
    </div>
  );
}
