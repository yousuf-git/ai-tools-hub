"use client";

import * as React from "react";
import { BadgeCheck, MailWarning, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  changePassword,
  resendVerification,
  signOut,
} from "@/lib/appwrite/auth";

interface AccountUser {
  name: string;
  email: string;
  emailVerification: boolean;
  hasPassword: boolean;
}

export function AccountClient({
  user,
  welcome,
}: {
  user: AccountUser;
  welcome: boolean;
}) {
  return (
    <div className="space-y-6">
      {welcome && !user.emailVerification && (
        <FormMessage type="success">
          Welcome to AI Forge! Check your inbox to confirm your email address.
        </FormMessage>
      )}

      <ProfileCard user={user} />
      <VerificationCard verified={user.emailVerification} />
      {user.hasPassword && <PasswordCard />}
      <SignOutRow />
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileCard({ user }: { user: AccountUser }) {
  return (
    <SectionCard title="Profile">
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium text-foreground">{user.name || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate font-medium text-foreground">{user.email}</dd>
        </div>
      </dl>
    </SectionCard>
  );
}

function VerificationCard({ verified }: { verified: boolean }) {
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  if (verified) {
    return (
      <SectionCard title="Email">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Your email is verified.
        </div>
      </SectionCard>
    );
  }

  async function resend() {
    setPending(true);
    setMsg(null);
    const result = await resendVerification();
    setMsg(
      result.success
        ? { type: "success", text: result.message ?? "Verification email sent." }
        : { type: "error", text: result.error }
    );
    setPending(false);
  }

  return (
    <SectionCard title="Email" description="Confirm your address to secure your account.">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MailWarning className="h-4 w-4 text-destructive" />
          Your email is not verified yet.
        </div>
        {msg && <FormMessage type={msg.type}>{msg.text}</FormMessage>}
        <Button variant="outline" size="sm" onClick={resend} disabled={pending}>
          {pending ? "Sending…" : "Resend verification email"}
        </Button>
      </div>
    </SectionCard>
  );
}

function PasswordCard() {
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<{ type: "error" | "success"; text: string } | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    if (newPassword !== confirm) {
      setMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPending(true);
    const result = await changePassword({
      oldPassword: String(data.get("oldPassword") ?? ""),
      newPassword,
    });
    if (result.success) {
      setMsg({ type: "success", text: result.message ?? "Password updated." });
      formRef.current?.reset();
    } else {
      setMsg({ type: "error", text: result.error });
    }
    setPending(false);
  }

  return (
    <SectionCard title="Change password">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
        {msg && <FormMessage type={msg.type}>{msg.text}</FormMessage>}
        <Field
          label="Current password"
          name="oldPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Field
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </SectionCard>
  );
}

function SignOutRow() {
  const [pending, setPending] = React.useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        await signOut();
      }}
    >
      <Button type="submit" variant="ghost" disabled={pending} className="text-muted-foreground">
        <LogOut className="h-4 w-4" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </form>
  );
}
