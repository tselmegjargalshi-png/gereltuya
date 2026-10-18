import Link from "next/link";
import { Clock, Globe, MapPin, Phone, ChevronRight } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/ui/social-icons";
import type { getBusinessProfile } from "@/server/discovery";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { formatDuration, formatMoney, formatNextAvailable, formatRelativeTime, WEEKDAYS } from "@/lib/format";
import { hhmmToMinutes, ubMinutesOfDay, ubParts } from "@/lib/time";

type Profile = NonNullable<Awaited<ReturnType<typeof getBusinessProfile>>>;

export function BusinessProfileView({ data, base = "", saved, signedIn }: { data: Profile; base?: string; saved: boolean; signedIn: boolean }) {
  const { business, reviews, nextAvailable, staffNext, ratingBuckets } = data;
  const now = new Date();
  const wd = ubParts(now).weekday;
  const todayHours = business.workingHours.find((h) => h.weekday === wd);
  const open =
    todayHours && !todayHours.isClosed && ubMinutesOfDay(now) >= hhmmToMinutes(todayHours.openTime) && ubMinutesOfDay(now) < hhmmToMinutes(todayHours.closeTime);

  const byCategory = new Map<string, { name: string; services: typeof business.services }>();
  for (const s of business.services) {
    const entry = byCategory.get(s.categoryId) ?? { name: s.category.name, services: [] };
    entry.services.push(s);
    byCategory.set(s.categoryId, entry);
  }
  const bookHref = `${base}/book/${business.slug}`;
  const totalReviews = ratingBuckets.reduce((s, b) => s + b._count._all, 0);

  return (
    <article>
      <div className="relative h-[260px] w-full overflow-hidden bg-ivory sm:h-[340px] lg:h-[420px]">
        <SmartImage src={business.coverUrl ?? ""} alt={`${business.name} салоны гадна болон дотор тал`} fill priority sizes="100vw" fallbackLabel={business.name} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
      </div>

      <div className="container-page">
        <header className="relative -mt-12 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4 md:gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-4 border-paper bg-ink text-paper shadow-[var(--shadow-lift)] md:h-32 md:w-32">
              {business.logoUrl ? (
                <SmartImage src={business.logoUrl} alt={`${business.name} лого`} width={128} height={128} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-4xl md:text-5xl">{business.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="pb-1">
              <p className="text-[13px] text-stone">{business.categories.map((c) => c.name).join(" • ")}</p>
              <h1 className="mt-1 text-[1.9rem] font-semibold leading-tight tracking-wide md:text-[2.6rem]">{business.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FavoriteButton businessId={business.id} initial={saved} signedIn={signedIn} className="border border-sand bg-surface" />
            <Link href={bookHref} className={buttonClass("primary", "lg")}>
              Цаг авах
            </Link>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-stone">
          <Rating value={business.ratingAvg} count={business.reviewCount} size="md" />
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden />
            {business.address}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            {open ? <Badge tone="success">Нээлттэй</Badge> : <Badge tone="neutral">Хаалттай</Badge>}
            {todayHours && !todayHours.isClosed ? `${todayHours.openTime} – ${todayHours.closeTime}` : "Өнөөдөр амарна"}
          </span>
          <span className="font-medium text-success">{formatNextAvailable(nextAvailable)}</span>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
          <div className="space-y-16">
            <section aria-labelledby="about">
              <h2 id="about" className="font-display text-3xl">Бидний тухай</h2>
              {business.tagline ? <p className="mt-2 text-[15px] font-medium text-accent-deep">{business.tagline}</p> : null}
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-charcoal">{business.description}</p>
            </section>

            <section aria-labelledby="services">
              <h2 id="services" className="font-display text-3xl">Үйлчилгээ</h2>
              <div className="mt-6 space-y-10">
                {[...byCategory.values()].map((group) => (
                  <div key={group.name}>
                    <h3 className="eyebrow mb-3">{group.name}</h3>
                    <ul className="divide-y divide-line rounded-[16px] border border-line bg-surface">
                      {group.services.map((s) => (
                        <li key={s.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <Link href={`${base}/b/${business.slug}/service/${s.id}`} className="inline-flex items-center gap-1 text-[16px] font-semibold hover:text-accent">
                              {s.name}
                              <ChevronRight className="h-4 w-4 text-mute" aria-hidden />
                            </Link>
                            <p className="mt-1 line-clamp-2 max-w-xl text-[14px] text-stone">{s.description}</p>
                            <p className="mt-2 text-[13px] text-mute">{formatDuration(s.durationMin)}</p>
                          </div>
                          <div className="flex items-center justify-between gap-5 sm:justify-end">
                            <span className="text-[16px] font-semibold tabular">{formatMoney(s.price)}</span>
                            <Link href={`${bookHref}?service=${s.id}`} className={buttonClass("outline", "sm")}>
                              Цаг авах
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="team">
              <h2 id="team" className="font-display text-3xl">Мэргэжилтнүүд</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {business.staff.map((s) => (
                  <li key={s.id} className="flex gap-4 rounded-[16px] border border-line bg-surface p-4">
                    <Link href={`${base}/s/${s.id}`} aria-label={s.name}>
                      <Avatar name={s.name} src={s.photoUrl} size={72} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`${base}/s/${s.id}`} className="text-[16px] font-semibold hover:text-accent">
                        {s.name}
                      </Link>
                      <p className="text-[13px] text-stone">{s.title} · {s.experienceYears} жил</p>
                      <Rating value={s.ratingAvg} count={s.reviewCount} className="mt-1" />
                      <p className="mt-1.5 text-[12px] font-medium text-success">{formatNextAvailable(staffNext.get(s.id))}</p>
                      <Link href={`${bookHref}?staff=${s.id}`} className="mt-2 inline-block text-[13px] font-medium underline-offset-4 hover:underline">
                        Цаг авах
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {business.gallery.length ? (
              <section aria-labelledby="gallery">
                <h2 id="gallery" className="font-display text-3xl">Зургийн цомог</h2>
                <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {business.gallery.map((g, i) => (
                    <li key={g.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                      <div className={`relative overflow-hidden rounded-[14px] bg-ivory ${i === 0 ? "aspect-[4/3] md:aspect-square" : "aspect-square"}`}>
                        <SmartImage src={g.imageUrl} alt={`${business.name} зураг ${i + 1}`} fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-700 hover:scale-105" />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="reviews">
              <h2 id="reviews" className="font-display text-3xl">Үнэлгээ, сэтгэгдэл</h2>
              <div className="mt-6 grid gap-8 md:grid-cols-[200px_1fr]">
                <div>
                  <p className="font-display text-6xl">{business.ratingAvg.toFixed(1)}</p>
                  <Rating value={business.ratingAvg} className="mt-1" />
                  <p className="mt-1 text-[13px] text-stone">{business.reviewCount} үнэлгээ</p>
                  <ul className="mt-4 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const c = ratingBuckets.find((b) => b.rating === n)?._count._all ?? 0;
                      return (
                        <li key={n} className="flex items-center gap-2 text-[12px] text-stone">
                          <span className="w-3 tabular">{n}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory">
                            <span className="block h-full bg-accent" style={{ width: `${totalReviews ? (c / totalReviews) * 100 : 0}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <ul className="divide-y divide-line">
                  {reviews.length === 0 ? <li className="py-6 text-stone">Одоогоор үнэлгээ алга байна.</li> : null}
                  {reviews.slice(0, 6).map((r) => (
                    <li key={r.id} className="py-5 first:pt-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.user.name} src={r.user.avatarUrl} size={36} />
                        <div>
                          <p className="text-[14px] font-medium">{r.user.name}</p>
                          <p className="text-[12px] text-mute">
                            {r.appointment?.service.name}{r.staff ? ` · ${r.staff.name}` : ""} · {formatRelativeTime(r.createdAt)}
                          </p>
                        </div>
                        <Rating value={r.rating} className="ml-auto" />
                      </div>
                      {r.comment ? <p className="mt-3 text-[14px] leading-relaxed text-charcoal">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[16px] border border-line bg-surface p-5">
              <h2 className="text-[15px] font-semibold">Ажлын цаг</h2>
              <ul className="mt-4 space-y-2 text-[14px]">
                {business.workingHours.map((h) => (
                  <li key={h.id} className={`flex justify-between ${h.weekday === wd ? "font-semibold text-ink" : "text-stone"}`}>
                    <span>{WEEKDAYS[h.weekday]}</span>
                    <span className="tabular">{h.isClosed ? "Амарна" : `${h.openTime} – ${h.closeTime}`}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[16px] border border-line bg-surface p-5">
              <h2 className="text-[15px] font-semibold">Холбоо барих</h2>
              <ul className="mt-4 space-y-3 text-[14px]">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
                  {business.address}
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
                  <a href={`tel:${business.phone.replace(/\s/g, "")}`} className="hover:text-accent">
                    {business.phone}
                  </a>
                </li>
                {business.website ? (
                  <li className="flex gap-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-accent">
                      {business.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ) : null}
                {business.instagram ? (
                  <li className="flex gap-3">
                    <InstagramIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
                    <a href={business.instagram} target="_blank" rel="noopener noreferrer" className="truncate hover:text-accent">
                      Instagram
                    </a>
                  </li>
                ) : null}
                {business.facebook ? (
                  <li className="flex gap-3">
                    <FacebookIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
                    <a href={business.facebook} target="_blank" rel="noopener noreferrer" className="truncate hover:text-accent">
                      Facebook
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
            {business.bookingRule?.cancellationPolicy ? (
              <div className="rounded-[16px] bg-ivory p-5 text-[13px] leading-relaxed text-stone">
                <h2 className="mb-2 text-[14px] font-semibold text-ink">Цуцлах нөхцөл</h2>
                {business.bookingRule.cancellationPolicy}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 p-3 backdrop-blur lg:hidden">
        <Link href={bookHref} className={buttonClass("primary", "lg", "w-full")}>
          Цаг авах
        </Link>
      </div>
      <div className="h-20 lg:hidden" />
    </article>
  );
}
