"use client";

import { useState } from "react";

/** Copies a value and says so for two seconds. Silent where the browser refuses. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold transition-colors hover:border-[var(--brand)]"
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
