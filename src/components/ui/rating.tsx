import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatRating } from "@/lib/format";

export function Rating({ value, count, className, size = "sm" }: { value: number; count?: number; className?: string; size?: "sm" | "md" }) {
  if (!count && value === 0) return <span className={cn("text-[13px] text-mute", className)}>Шинэ</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-ink", size === "md" ? "text-[15px]" : "text-[13px]", className)}>
      <Star className={cn("fill-accent text-accent", size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />
      <span className="font-semibold tabular">{formatRating(value)}</span>
      {count !== undefined ? <span className="text-stone">({count} үнэлгээ)</span> : null}
      <span className="sr-only">5-аас {formatRating(value)} үнэлгээ</span>
    </span>
  );
}

export function StarsInput({ value, onChange, name = "rating" }: { value: number; onChange: (v: number) => void; name?: string }) {
  return (
    <div role="radiogroup" aria-label="Үнэлгээ" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} од`}
          onClick={() => onChange(n)}
          className="rounded p-1 transition-transform hover:scale-110"
        >
          <Star className={cn("h-7 w-7", n <= value ? "fill-accent text-accent" : "text-sand")} />
        </button>
      ))}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
