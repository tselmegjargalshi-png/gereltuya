"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  id,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  id: string;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-full bg-ivory p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active ? "text-paper" : "text-stone hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
