import Link from "next/link";
import { Bell, CalendarPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getCategories, getPopularServices, searchBusinesses } from "@/server/discovery";
import { SearchBar } from "@/components/public/search-bar";
import { BusinessCard } from "@/components/public/business-card";
import { AppointmentCard } from "@/components/app/appointment-card";
import { LocationPicker } from "@/components/app/location-picker";
import { ScrollRow } from "@/components/public/section";
import { Reveal } from "@/components/shared/reveal";
import { formatMoney } from "@/lib/format";
import { DISTRICTS } from "@/lib/districts";

export default async function CustomerHome({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const [{ loc }, user] = await Promise.all([searchParams, requireUser()]);
  const location = DISTRICTS.some((d) => d.name === loc) ? loc! : DISTRICTS[0].name;

  const [next, nearby, today, popular, categories, favorites, unread] = await Promise.all([
    db.appointment.findFirst({
      where: { userId: user.id, status: { in: ["CONFIRMED", "PENDING"] }, startAt: { gt: new Date() } },
      orderBy: { startAt: "asc" },
      include: {
        business: { select: { slug: true, name: true, address: true, bookingRule: { select: { cancelWindowHours: true } } } },
        service: { select: { id: true, name: true, durationMin: true } },
        staff: { select: { id: true, name: true, photoUrl: true } },
        review: { select: { id: true } },
      },
    }),
    searchBusinesses({ loc: location, sort: "nearest" }, { limit: 6 }),
    searchBusinesses({ availableToday: true, loc: location, sort: "nearest" }, { limit: 6 }),
    getPopularServices(8),
    getCategories(),
    db.favorite.findMany({ where: { userId: user.id, businessId: { not: null } }, select: { businessId: true } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const saved = new Set(favorites.map((f) => f.businessId));
  const firstName = user.name.split(" ")[0];

  return (
    <div className="container-page max-w-5xl py-6 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-stone">Сайн байна уу, {firstName}</p>
          <h1 className="mt-1 font-display text-[2.4rem] leading-tight md:text-[3.2rem]">Юу хийлгэх вэ?</h1>
        </div>
        <Link href="/app/notifications" aria-label="Мэдэгдэл" className="relative mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-surface md:hidden">
          <Bell className="h-5 w-5" />
          {unread ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">{unread}</span> : null}
        </Link>
      </div>
      <SearchBar action="/app/search" defaultLocation={location} className="mt-5" buttonLabel="Хайх" />

      <section aria-labelledby="next" className="mt-10">
        <h2 id="next" className="mb-4 text-[15px] font-semibold">Таны дараагийн захиалга</h2>
        {next ? (
          <AppointmentCard
            cancelWindowHours={next.business.bookingRule?.cancelWindowHours ?? 3}
            a={{
              id: next.id,
              startAt: next.startAt,
              price: next.price,
              status: next.status,
              hasReview: Boolean(next.review),
              business: next.business,
              service: next.service,
              staff: next.staff,
            }}
          />
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-[16px] border border-dashed border-sand p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Удахгүй болох захиалга алга байна.</p>
              <p className="mt-1 text-sm text-stone">Өөртөө тохирсон салон, мэргэжилтнээ олоод цаг авна уу.</p>
            </div>
            <Link href="/app/search" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper">
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Цаг авах
            </Link>
          </div>
        )}
      </section>

      <section aria-label="Ангилал" className="mt-10">
        <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link href={`/app/search?category=${c.slug}`} className="inline-flex rounded-full border border-sand bg-surface px-4 py-2 text-[13px] hover:border-ink">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nearby" className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2 id="nearby" className="font-display text-3xl">Танд ойрхон</h2>
          <LocationPicker value={location} path="/app" />
        </div>
        <ScrollRow className="md:grid-cols-2 md:gap-x-6 md:gap-y-10 lg:grid-cols-3">
          {nearby.map((b) => (
            <Reveal key={b.id} className="w-[78vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none">
              <BusinessCard business={b} base="/app" saved={saved.has(b.id)} signedIn />
            </Reveal>
          ))}
        </ScrollRow>
      </section>

      <section aria-labelledby="today" className="mt-14">
        <h2 id="today" className="mb-5 font-display text-3xl">Өнөөдөр боломжтой</h2>
        {today.length ? (
          <ScrollRow className="md:grid-cols-2 md:gap-x-6 md:gap-y-10 lg:grid-cols-3">
            {today.slice(0, 3).map((b) => (
              <div key={b.id} className="w-[78vw] max-w-[360px] shrink-0 snap-start md:w-auto md:max-w-none">
                <BusinessCard business={b} base="/app" saved={saved.has(b.id)} signedIn />
              </div>
            ))}
          </ScrollRow>
        ) : (
          <p className="rounded-[14px] border border-dashed border-sand p-8 text-center text-stone">Өнөөдөр боломжтой цаг олдсонгүй. Маргаашийн цагуудыг харна уу.</p>
        )}
      </section>

      <section aria-labelledby="popular" className="mt-14">
        <h2 id="popular" className="mb-5 font-display text-3xl">Эрэлттэй үйлчилгээ</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {popular.map((s) => (
            <li key={s.name}>
              <Link href={`/app/search?q=${encodeURIComponent(s.name)}`} className="flex items-center justify-between gap-4 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-ink/40">
                <span>
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-[12px] text-mute">{s.businesses} салон</span>
                </span>
                <span className="text-[13px] text-stone">{formatMoney(s.minPrice)}-аас</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
