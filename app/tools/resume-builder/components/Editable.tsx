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
  /**
   * When set (and non-empty), the field renders as a real `<a href>` so it
   * becomes a clickable link in the exported PDF. Editing still works: a plain
   * click places the caret (navigation is suppressed); Ctrl/Cmd+click follows
   * the link.
   */
  href?: string;
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
  href,
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

  const isLink = Boolean(href);

  // On screen, a plain click on a link field should edit it, not navigate.
  // The caret is placed on mousedown, so preventing the click's default keeps
  // editing intact. Ctrl/Cmd+click still follows the link.
  const handleClick = (e: React.MouseEvent) => {
    if (!isLink || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
  };

  const Tag = (isLink ? "a" : tag) as React.ElementType;
  const linkProps = isLink
    ? { href, ...(href!.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" }), onClick: handleClick }
    : {};

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
      {...linkProps}
    />
  );
}
