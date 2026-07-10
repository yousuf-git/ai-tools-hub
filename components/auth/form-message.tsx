import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FormAction } from "@/lib/appwrite/utils";

/** Inline success / error banner shared by every auth form. */
export function FormMessage({
  type,
  action,
  children,
}: {
  type: "error" | "success";
  action?: FormAction;
  children: React.ReactNode;
}) {
  const isError = type === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-2 rounded-md border px-3 py-2 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-foreground"
      )}
    >
      <div className="flex items-start gap-2">
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        )}
        <span>{children}</span>
      </div>
      {action && (
        <Link
          href={action.href}
          className="ml-6 inline-flex w-fit items-center gap-1 font-medium underline-offset-4 hover:underline"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
