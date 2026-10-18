import Link from "next/link";
import { cn } from "@/lib/cn";

export function Tabs({ items, current, hrefFor, label }: { items: { value: string; label: string }[]; current: string; hrefFor: (value: string) => string; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto rounded-full bg-ivory p-1">
      {items.map((i) => (
        <Link key={i.value} href={hrefFor(i.value)} aria-current={i.value === current ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium", i.value === current ? "bg-ink text-paper" : "text-stone hover:text-ink")}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function SearchBox({ action, hidden, q, placeholder }: { action: string; hidden?: Record<string, string>; q: string; placeholder: string }) {
  return (
    <form action={action} className="flex gap-2">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Хайх" className="h-10 w-52 rounded-full border border-sand bg-surface px-4 text-[13px]" />
      <button className="h-10 rounded-full bg-ink px-4 text-[13px] font-medium text-paper">Хайх</button>
    </form>
  );
}

export function Pager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Хуудаслалт">
      {page > 1 ? <Link href={hrefFor(page - 1)} className="font-medium text-accent">Өмнөх</Link> : <span />}
      <span className="text-stone tabular">{page} / {pages}</span>
      {page < pages ? <Link href={hrefFor(page + 1)} className="font-medium text-accent">Дараах</Link> : <span />}
    </nav>
  );
}
