"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";
import { formatCompactMoney, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

export type BarDatum = { key: string; label: string; value: number; secondary?: number };

/** Responsive CSS bar chart with animated bars, gridlines and an accessible data table fallback. */
export function BarChart({
  data,
  height = 220,
  format = "money",
  valueLabel = "Орлого",
  secondaryLabel = "Захиалга",
  highlightLast,
  className,
}: {
  data: BarDatum[];
  height?: number;
  format?: "money" | "count";
  valueLabel?: string;
  secondaryLabel?: string;
  highlightLast?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();
  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = niceCeil(max);
  const fmt = (v: number) => (format === "money" ? formatMoney(v) : String(v));
  const fmtShort = (v: number) => (format === "money" ? formatCompactMoney(v) : String(v));
  const showEvery = data.length > 16 ? Math.ceil(data.length / 10) : 1;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }} role="img" aria-label={`${valueLabel} график`} aria-describedby={tableId}>
        {[1, 0.75, 0.5, 0.25, 0].map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${t * 100}%` }}>
            <span className="w-14 shrink-0 -translate-y-1/2 text-right text-[10.5px] text-mute tabular">{fmtShort(Math.round(niceMax * t))}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-16 right-0 flex items-end gap-[3px] sm:gap-1.5" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => {
            const pct = (d.value / niceMax) * 100;
            const last = highlightLast && i === data.length - 1;
            return (
              <div
                key={d.key}
                className="group relative flex h-full flex-1 items-end"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${d.label}: ${fmt(d.value)}`}
              >
                <motion.div
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : Math.min(i * 0.025, 0.5), ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: `${Math.max(pct, d.value > 0 ? 1.5 : 0)}%`, transformOrigin: "bottom" }}
                  className={cn(
                    "w-full rounded-t-[4px] transition-colors",
                    hover === i ? "bg-accent" : last ? "bg-accent" : "bg-charcoal/85",
                  )}
                />
                {hover === i ? (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-3 py-2 text-[12px] text-paper shadow-[var(--shadow-lift)]">
                    <p className="font-medium">{d.label}</p>
                    <p className="tabular">{valueLabel}: {fmt(d.value)}</p>
                    {d.secondary !== undefined ? <p className="tabular text-paper/70">{secondaryLabel}: {d.secondary}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-[3px] pl-16 sm:gap-1.5" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center text-[10.5px] text-mute">
            {i % showEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <table id={tableId} className="sr-only">
        <caption>{valueLabel}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{fmt(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}
