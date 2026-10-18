import Link from "next/link";
import { cn } from "@/lib/cn";
import { RANGE_LABEL, type Range } from "@/server/analytics";

const ORDER: Range[] = ["today", "week", "month", "year"];

export function RangeTabs({ value, basePath }: { value: Range; basePath: string }) {
  return (
    <nav aria-label="Хугацаа" className="inline-flex rounded-full bg-ivory p-1">
      {ORDER.map((r) => (
        <Link
          key={r}
          href={`${basePath}?range=${r}`}
          aria-current={r === value ? "page" : undefined}
          className={cn("rounded-full px-4 py-1.5 text-[13px] font-medium", r === value ? "bg-ink text-paper" : "text-stone hover:text-ink")}
        >
          {RANGE_LABEL[r]}
        </Link>
      ))}
    </nav>
  );
}
