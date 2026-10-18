import { MapPin, Search } from "lucide-react";
import { DISTRICTS } from "@/lib/districts";
import { cn } from "@/lib/cn";

/** Works as a plain GET form, so search works even before JavaScript loads. */
export function SearchBar({
  action = "/search",
  defaultQuery,
  defaultLocation,
  placeholder = "Үйлчилгээ эсвэл салон хайх",
  buttonLabel = "Үйлчилгээ хайх",
  className,
  compact,
  hidden,
}: {
  action?: string;
  defaultQuery?: string;
  defaultLocation?: string;
  placeholder?: string;
  buttonLabel?: string;
  className?: string;
  compact?: boolean;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form
      action={action}
      role="search"
      className={cn(
        "flex w-full flex-col gap-2 rounded-[20px] border border-sand bg-surface p-2 shadow-[var(--shadow-soft)] transition-shadow focus-within:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:rounded-full",
        className,
      )}
    >
      {hidden
        ? Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))
        : null}
      <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
        <Search className="h-[18px] w-[18px] shrink-0 text-stone" aria-hidden />
        <span className="sr-only">Хайх</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultQuery}
          placeholder={placeholder}
          autoComplete="off"
          className={cn("h-11 w-full min-w-0 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-mute", compact && "h-10")}
        />
      </label>
      <span className="hidden h-6 w-px bg-line sm:block" aria-hidden />
      <label className="flex items-center gap-3 border-t border-line px-4 sm:min-w-[168px] sm:max-w-[200px] sm:border-t-0">
        <MapPin className="h-[18px] w-[18px] shrink-0 text-stone" aria-hidden />
        <span className="sr-only">Байршил сонгох</span>
        <select
          name="loc"
          defaultValue={defaultLocation ?? ""}
          className="h-11 w-full cursor-pointer bg-transparent text-[15px] text-ink outline-none"
        >
          <option value="">Байршил сонгох</option>
          {DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="h-12 shrink-0 rounded-full bg-ink px-6 text-[15px] font-medium text-paper transition-[background,transform] duration-200 hover:bg-charcoal active:scale-[0.98] sm:h-11"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
