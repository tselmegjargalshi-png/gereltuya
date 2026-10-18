"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HourHeat({ hours }: { hours: { hour: number; bookings: number }[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(...hours.map((h) => h.bookings), 1);
  const peak = hours.reduce((a, b) => (b.bookings > a.bookings ? b : a), hours[0]);
  return (
    <div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
        {hours.map((h, i) => {
          const intensity = h.bookings / max;
          return (
            <motion.div
              key={h.hour}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.4 }}
              className="flex flex-col items-center gap-1.5"
              title={`${String(h.hour).padStart(2, "0")}:00, ${h.bookings} захиалга`}
            >
              <div className="flex h-24 w-full items-end overflow-hidden rounded-[6px] bg-ivory">
                <div
                  className="w-full rounded-[6px] bg-accent"
                  style={{ height: `${Math.max(intensity * 100, h.bookings > 0 ? 4 : 0)}%`, opacity: 0.25 + intensity * 0.75 }}
                />
              </div>
              <span className="text-[10.5px] text-mute tabular">{String(h.hour).padStart(2, "0")}</span>
            </motion.div>
          );
        })}
      </div>
      {peak.bookings > 0 ? (
        <p className="mt-4 text-sm text-stone">
          Хамгийн их захиалгатай цаг: <span className="font-semibold text-ink tabular">{String(peak.hour).padStart(2, "0")}:00</span> ({peak.bookings} захиалга)
        </p>
      ) : null}
    </div>
  );
}
