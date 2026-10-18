import { Search } from "lucide-react";
import { getCategories, searchBusinesses, searchSpecialists, type SearchParams } from "@/server/discovery";
import type { SortValue } from "@/lib/labels";
import { SORT_OPTIONS } from "@/lib/labels";
import { SearchBar } from "@/components/public/search-bar";
import { SearchControls, SearchSidebar } from "@/components/public/search-filters";
import { BusinessCard } from "@/components/public/business-card";
import { SpecialistCard } from "@/components/public/specialist-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/fade-in";
import { db } from "@/lib/db";

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseSearch(raw: RawParams): SearchParams & { view: "businesses" | "specialists" } {
  const sort = first(raw.sort);
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  return {
    q: first(raw.q)?.slice(0, 80),
    category: first(raw.category),
    loc: first(raw.loc),
    district: undefined,
    minRating: num(first(raw.minRating)),
    maxPrice: num(first(raw.maxPrice)),
    availableToday: first(raw.today) === "1",
    openNow: first(raw.open) === "1",
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortValue) : undefined,
    view: first(raw.view) === "specialists" ? "specialists" : "businesses",
  };
}

export async function SearchView({ raw, base = "", userId }: { raw: RawParams; base?: string; userId?: string }) {
  const { view, ...params } = parseSearch(raw);
  const effective: SearchParams = { ...params, sort: params.sort ?? (params.loc ? "nearest" : "popular") };
  const [categories, businesses, specialists, favorites] = await Promise.all([
    getCategories(),
    view === "businesses" ? searchBusinesses(effective) : Promise.resolve([]),
    view === "specialists" ? searchSpecialists(effective, { limit: 60 }) : Promise.resolve([]),
    userId ? db.favorite.findMany({ where: { userId, businessId: { not: null } }, select: { businessId: true } }) : Promise.resolve([]),
  ]);
  const saved = new Set(favorites.map((f) => f.businessId));
  const total = view === "businesses" ? businesses.length : specialists.length;
  const key = JSON.stringify(raw);

  return (
    <div className="container-page py-8 md:py-12">
      <div className="mb-8 max-w-3xl">
        <h1 className="font-display text-[2.2rem] leading-tight md:text-[3rem]">
          {params.q ? <>“{params.q}” хайлтын үр дүн</> : "Салон, мэргэжилтэн хайх"}
        </h1>
        <SearchBar
          className="mt-5"
          action={`${base}/search`}
          defaultQuery={params.q}
          defaultLocation={params.loc}
          buttonLabel="Хайх"
          hidden={{ view: view === "specialists" ? "specialists" : undefined, category: params.category }}
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <SearchSidebar categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
        <div>
          <SearchControls
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            total={total}
            noun={view === "businesses" ? "салон" : "мэргэжилтэн"}
          />
          <FadeIn key={key} className="mt-6">
            {total === 0 ? (
              <EmptyState
                icon={<Search className="h-8 w-8" aria-hidden />}
                title="Хайлтад тохирох үр дүн олдсонгүй."
                description="Хайх үгээ өөрчилж эсвэл шүүлтүүрээ багасгаад дахин оролдоно уу."
                action={<ButtonLink href={`${base}/search`} variant="outline">Шүүлтүүр цэвэрлэх</ButtonLink>}
              />
            ) : view === "businesses" ? (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                {businesses.map((b, i) => (
                  <BusinessCard key={b.id} business={b} base={base} saved={saved.has(b.id)} signedIn={Boolean(userId)} priority={i < 3} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {specialists.map((s) => (
                  <SpecialistCard key={s.id} specialist={s} base={base} />
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
