"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

/**
 * Accessible checkbox built on a native input (no extra dependency). The real
 * input is visually hidden but still drives focus, keyboard, and form state.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground"
      >
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <input
            id={inputId}
            type="checkbox"
            ref={ref}
            className={cn("peer sr-only", className)}
            {...props}
          />
          <span
            aria-hidden
            className="h-4 w-4 rounded-[3px] border border-input bg-background transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background"
          />
          <Check className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </span>
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
