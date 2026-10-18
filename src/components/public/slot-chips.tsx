import Link from "next/link";
import { formatRelativeDay } from "@/lib/format";
import { cn } from "@/lib/cn";

export type DaySlots = { dateKey: string; date: Date; times: { time: string; startAt: string }[] };

/** Upcoming free times as links into the booking flow. */
export function SlotChips({ days, href, max = 6 }: { days: DaySlots[]; href: (dateKey: string, time: string) => string; max?: number }) {
  const withTimes = days.filter((d) => d.times.length);
  if (!withTimes.length) return <p className="text-sm text-stone">Ойрын өдрүүдэд чөлөөтэй цаг алга байна.</p>;
  return (
    <div className="space-y-4">
      {withTimes.map((d) => (
        <div key={d.dateKey}>
          <p className="mb-2 text-[13px] font-medium text-charcoal">{formatRelativeDay(d.date)}</p>
          <ul className="flex flex-wrap gap-2">
            {d.times.slice(0, max).map((t) => (
              <li key={t.startAt}>
                <Link
                  href={href(d.dateKey, t.time)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border border-sand bg-surface px-4 text-[13px] font-medium tabular transition-colors hover:border-ink hover:bg-ink hover:text-paper",
                  )}
                >
                  {t.time}
                </Link>
              </li>
            ))}
            {d.times.length > max ? <li className="inline-flex h-9 items-center px-1 text-[13px] text-mute">+{d.times.length - max}</li> : null}
          </ul>
        </div>
      ))}
    </div>
  );
}
