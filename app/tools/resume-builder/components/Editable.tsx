"use client";

import { useEffect, useRef } from "react";

interface EditableProps {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  tag?: "span" | "div" | "p" | "strong" | "li";
  ariaLabel?: string;
}

/**
 * Inline contentEditable field used inside the resume preview.
 * - Enter commits (single-line); Shift+Enter / multiline allows newlines.
 * - Esc cancels and restores the previous value.
 * - Commit happens on blur. The DOM text is only synced from `value` when
 *   the element is not focused, so the caret never jumps while typing.
 */
export default function Editable({
  value,
  onCommit,
  multiline = false,
  placeholder,
  className = "",
  tag = "span",
  ariaLabel,
}: EditableProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) {
      el.innerText = value;
    }
  }, [value]);

  const commit = () => {
    const text = ref.current?.innerText.replace(/ /g, " ").trim() ?? "";
    if (text !== value) onCommit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      (ref.current as HTMLElement | null)?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (ref.current) ref.current.innerText = value;
      (ref.current as HTMLElement | null)?.blur();
    }
  };

  const Tag = tag as React.ElementType;

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={ariaLabel || placeholder}
      data-placeholder={placeholder}
      className={`editable ${className}`}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
