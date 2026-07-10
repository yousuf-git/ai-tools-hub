"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";
import { verifyEmail } from "@/lib/appwrite/auth";

type State = "verifying" | "success" | "error";

export function VerifyEmailClient({
  userId,
  secret,
}: {
  userId: string;
  secret: string;
}) {
  const linkValid = Boolean(userId && secret);
  const [state, setState] = React.useState<State>(
    linkValid ? "verifying" : "error"
  );
  const [message, setMessage] = React.useState(
    linkValid ? "" : "This verification link is invalid or has expired."
  );
  const ran = React.useRef(false);

  React.useEffect(() => {
    // Guard against StrictMode's double-invoke; state is only ever set from the
    // async resolution below, never synchronously in the effect body.
    if (!linkValid || ran.current) return;
    ran.current = true;

    verifyEmail({ userId, secret }).then((result) => {
      if (result.success) {
        setState("success");
      } else {
        setState("error");
        setMessage(result.error);
      }
    });
  }, [linkValid, userId, secret]);

  if (state === "verifying") {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Confirming your email address…
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="space-y-5">
        <FormMessage type="success">
          Your email is confirmed. You&apos;re all set.
        </FormMessage>
        <Button asChild className="w-full">
          <Link href="/account">Go to your account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormMessage type="error">{message}</FormMessage>
      <Button asChild variant="outline" className="w-full">
        <Link href="/account">Go to your account to resend</Link>
      </Button>
    </div>
  );
}
