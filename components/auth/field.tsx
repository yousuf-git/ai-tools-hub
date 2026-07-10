"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

/** Labeled input with inline error and, for password fields, a show/hide toggle. */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, name, error, type = "text", className, ...props }, ref) => {
    const [reveal, setReveal] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && reveal ? "text" : type;

    return (
      <div className="space-y-1.5">
        <Label htmlFor={name} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </Label>
        <div className="relative">
          <Input
            id={name}
            name={name}
            type={inputType}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            className={cn(isPassword && "pr-10", error && "border-destructive focus-visible:ring-destructive", className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              tabIndex={-1}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${name}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Field.displayName = "Field";
