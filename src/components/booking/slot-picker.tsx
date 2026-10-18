"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAYS_SHORT } from "@/lib/format";

export type PickerSlot = { time: string; startAt: string; staffIds: string[] };

type Props = {
  loadDays: () => Promise<Record<string, number>>;
  loadSlots: (dateKey: string) => Promise<PickerSlot[]>;
  /** Re-run loaders when any of these change. */
  deps: unknown[];
  value: string | null;
  onChange: (slot: PickerSlot | null) => void;
  initialDate?: string;
};

const dayParts = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, weekday: (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 };
};

/** Compact date strip plus time grid used by reschedule dialogs. */
export function SlotPicker({ loadDays, loadSlots, deps, value, onChange, initialDate }: Props) {
  const [days, setDays] = useState<Record<string, number> | null>(null);
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [slots, setSlots] = useState<PickerSlot[] | null>(null);
  const [error, setError] = useState(false);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let off = false;
    setDays(null);
    setError(false);
    loadDays()
      .then((d) => !off && setDays(d))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, deps);

  useEffect(() => {
    if (!date) return;
    let off = false;
    setSlots(null);
    loadSlots(date)
      .then((s) => !off && setSlots(s))
      .catch(() => !off && setError(true));
    return () => {
      off = true;
    };
  }, [date, ...deps]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const keys = useMemo(() => (days ? Object.keys(days).sort() : []), [days]);

  if (error) return <p className="rounded-[12px] bg-danger-soft p-4 text-sm text-danger">Мэдээлэл ачааллахад алдаа гарлаа. Дахин оролдоно уу.</p>;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[13px] font-medium">Огноо</p>
        {!days ? (
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-16 w-14 shrink-0 rounded-[12px]" />
            ))}
          </div>
        ) : (
          <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none">
            {keys.map((k) => {
              const p = dayParts(k);
              const disabled = (days[k] ?? 0) === 0;
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setDate(k);
                      onChange(null);
                    }}
                    aria-pressed={date === k}
                    className={cn(
                      "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-[12px] border text-center transition-colors",
                      date === k ? "border-ink bg-ink text-paper" : disabled ? "border-transparent text-sand" : "border-line bg-surface hover:border-ink/50",
                    )}
                  >
                    <span className="text-[11px] opacity-70">{WEEKDAYS_SHORT[p.weekday]}</span>
                    <span className="text-[16px] font-semibold tabular">{p.d}</span>
                    <span className="text-[10px] opacity-70">{p.m}-р сар</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {date ? (
        <div>
          <p className="mb-2 text-[13px] font-medium">Цаг</p>
          {!slots ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton h-10 rounded-full" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-stone">Энэ өдөр чөлөөтэй цаг алга байна.</p>
          ) : (
            <ul className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <li key={s.startAt}>
                  <button
                    type="button"
                    aria-pressed={value === s.startAt}
                    onClick={() => onChange(s)}
                    className={cn(
                      "h-10 w-full rounded-full border text-[14px] font-medium tabular transition-colors",
                      value === s.startAt ? "border-ink bg-ink text-paper" : "border-sand bg-surface hover:border-ink",
                    )}
                  >
                    {s.time}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
