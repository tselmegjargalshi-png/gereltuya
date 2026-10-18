"use client";

import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-ink" : "bg-sand",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
