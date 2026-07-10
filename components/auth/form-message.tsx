import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Inline success / error banner shared by every auth form. */
export function FormMessage({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  const isError = type === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-foreground"
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      )}
      <span>{children}</span>
    </div>
  );
}
