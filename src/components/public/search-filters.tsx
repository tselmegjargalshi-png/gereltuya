"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DISTRICTS } from "@/lib/districts";
import { SORT_OPTIONS } from "@/lib/labels";
import { Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";

type Category = { slug: string; name: string };

const PRICE_OPTIONS = [
  { value: "", label: "Хязгааргүй" },
  { value: "30000", label: "30,000₮ хүртэл" },
  { value: "50000", label: "50,000₮ хүртэл" },
  { value: "100000", label: "100,000₮ хүртэл" },
  { value: "200000", label: "200,000₮ хүртэл" },
];

const RATING_OPTIONS = [
  { value: "", label: "Бүх үнэлгээ" },
  { value: "4", label: "4.0 ба түүнээс дээш" },
  { value: "4.5", label: "4.5 ба түүнээс дээш" },
  { value: "4.8", label: "4.8 ба түүнээс дээш" },
];

function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { sp, update, pending, pathname, router };
}

function FilterFields({ categories }: { categories: Category[] }) {
  const { sp, update } = useParamUpdater();
  const category = sp.get("category") ?? "";
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2.5 text-[13px] font-semibold">Үйлчилгээ</legend>
        <div className="flex flex-wrap gap-2">
          {[{ slug: "", name: "Бүгд" }, ...categories].map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={category === c.slug}
              onClick={() => update({ category: c.slug || null })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                category === c.slug ? "border-ink bg-ink text-paper" : "border-sand bg-surface text-charcoal hover:border-ink/50",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold">Байршил</span>
        <Select value={sp.get("loc") ?? ""} onChange={(e) => update({ loc: e.target.value || null })}>
          <option value="">Бүх байршил</option>
          {DISTRICTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold">Үнэ</span>
        <Select value={sp.get("maxPrice") ?? ""} onChange={(e) => update({ maxPrice: e.target.value || null })}>
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold">Үнэлгээ</span>
        <Select value={sp.get("minRating") ?? ""} onChange={(e) => update({ minRating: e.target.value || null })}>
          {RATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[13px] font-semibold">Боломжтой цаг</legend>
        {[
          ["today", "Өнөөдөр боломжтой"],
          ["open", "Одоо нээлттэй"],
        ].map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={sp.get(key) === "1"}
              onChange={(e) => update({ [key]: e.target.checked ? "1" : null })}
              className="h-4 w-4 rounded border-sand accent-[var(--color-accent)]"
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function SearchControls({ categories, total, noun }: { categories: Category[]; total: number; noun: string }) {
  const { sp, update, pending, router, pathname } = useParamUpdater();
  const [open, setOpen] = useState(false);
  const view = sp.get("view") === "specialists" ? "specialists" : "businesses";
  const [q, setQ] = useState(sp.get("q") ?? "");

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const activeCount = ["category", "loc", "maxPrice", "minRating", "today", "open"].filter((k) => sp.get(k)).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          id="search-view"
          value={view}
          onChange={(v) => update({ view: v === "specialists" ? "specialists" : null })}
          options={[
            { value: "businesses", label: "Салонууд" },
            { value: "specialists", label: "Мэргэжилтнүүд" },
          ]}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Шүүлтүүр{activeCount ? ` (${activeCount})` : ""}
          </Button>
          {view === "businesses" ? (
            <label className="flex items-center gap-2 text-[13px] text-stone">
              <span className="hidden sm:inline">Эрэмбэлэх:</span>
              <Select
                aria-label="Эрэмбэлэх"
                className="h-9 w-auto min-w-[190px] rounded-full py-0 text-[13px]"
                value={sp.get("sort") ?? "popular"}
                onChange={(e) => update({ sort: e.target.value })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-stone" aria-live="polite">
        <p className={cn("transition-opacity", pending && "opacity-50")}>
          {total} {noun} олдлоо
        </p>
        {sp.toString() ? (
          <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="text-[13px] underline-offset-4 hover:underline">
            Шүүлтүүр цэвэрлэх
          </button>
        ) : null}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Шүүлтүүр"
        footer={
          <>
            <Button variant="ghost" onClick={() => { router.replace(pathname, { scroll: false }); setOpen(false); }}>
              Цэвэрлэх
            </Button>
            <Button onClick={() => setOpen(false)}>{total} {noun} харах</Button>
          </>
        }
      >
        <FilterFields categories={categories} />
      </Modal>
      <input type="hidden" value={q} readOnly aria-hidden />
    </>
  );
}

export function SearchSidebar({ categories }: { categories: Category[] }) {
  return (
    <aside aria-label="Шүүлтүүр" className="sticky top-24 hidden self-start rounded-[16px] border border-line bg-surface p-5 lg:block">
      <h2 className="mb-5 text-[15px] font-semibold">Шүүлтүүр</h2>
      <FilterFields categories={categories} />
    </aside>
  );
}
