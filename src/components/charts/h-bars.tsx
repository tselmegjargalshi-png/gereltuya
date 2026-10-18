"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

export function HBars({
  rows,
  className,
}: {
  rows: { key: string; label: string; value: number; display: string; sub?: string }[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-stone">Энэ хугацаанд мэдээлэл алга.</p>;
  return (
    <ul className={cn("space-y-4", className)}>
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular text-stone">{r.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ivory">
            <motion.div
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={cn("h-full rounded-full", i === 0 ? "bg-accent" : "bg-charcoal/80")}
            />
          </div>
          {r.sub ? <p className="mt-1 text-[12px] text-mute">{r.sub}</p> : null}
        </li>
      ))}
    </ul>
  );
}
