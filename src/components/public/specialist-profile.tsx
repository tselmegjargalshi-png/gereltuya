import Link from "next/link";
import type { getSpecialistProfile } from "@/server/discovery";
import { getUpcomingSlots } from "@/server/slots";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { SlotChips } from "@/components/public/slot-chips";
import { formatDuration, formatMoney, formatNextAvailable, formatRelativeTime, WEEKDAYS } from "@/lib/format";

type Profile = NonNullable<Awaited<ReturnType<typeof getSpecialistProfile>>>;

export async function SpecialistProfileView({ data, base = "", saved, signedIn }: { data: Profile; base?: string; saved: boolean; signedIn: boolean }) {
  const { staff, reviews, hours, bizHours, nextAvailable } = data;
  const quick = [...staff.services].sort((a, b) => a.durationMin - b.durationMin)[0];
  const days = quick ? await getUpcomingSlots({ businessId: staff.businessId, serviceId: quick.id, staffId: staff.id, days: 4 }) : [];
  const bookHref = `${base}/book/${staff.business.slug}?staff=${staff.id}`;

  const schedule = WEEKDAYS.map((name, weekday) => {
    const own = hours.find((h) => h.weekday === weekday);
    const row = own ?? bizHours.find((h) => h.weekday === weekday);
    return { name, text: !row || row.isClosed ? "Амарна" : `${row.openTime} – ${row.closeTime}${row.breakStart ? ` (завсарлага ${row.breakStart}–${row.breakEnd})` : ""}` };
  });

  return (
    <div className="container-page py-8 md:py-12">
      <div className="grid gap-10 md:grid-cols-[360px_1fr] lg:gap-16">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-ivory md:sticky md:top-24">
            <SmartImage src={staff.photoUrl ?? ""} alt={staff.name} fill priority sizes="(min-width: 768px) 360px, 100vw" fallbackLabel={staff.name} className="object-cover object-top" />
          </div>
        </div>
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{staff.title}</p>
              <h1 className="mt-2 font-display text-[2.8rem] leading-none md:text-[4rem]">{staff.name}</h1>
            </div>
            <FavoriteButton staffId={staff.id} initial={saved} signedIn={signedIn} className="border border-sand bg-surface" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-stone">
            <Rating value={staff.ratingAvg} count={staff.reviewCount} size="md" />
            <span>{staff.experienceYears} жилийн туршлагатай</span>
            <Link href={`${base}/b/${staff.business.slug}`} className="underline-offset-4 hover:text-accent hover:underline">
              {staff.business.name}
            </Link>
          </div>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-charcoal">{staff.bio}</p>
          <p className="mt-4 text-[14px] font-medium text-success">{formatNextAvailable(nextAvailable)}</p>
          <Link href={bookHref} className={buttonClass("primary", "lg", "mt-6")}>
            Цаг авах
          </Link>

          <section className="mt-14" aria-labelledby="slots">
            <h2 id="slots" className="font-display text-3xl">Боломжтой цагууд</h2>
            {quick ? <p className="mt-1 text-[13px] text-stone">{quick.name} ({formatDuration(quick.durationMin)}) үйлчилгээгээр тооцсон.</p> : null}
            <div className="mt-5">
              <SlotChips days={days} href={(d, t) => `${bookHref}&service=${quick?.id}&date=${d}&time=${t}`} />
            </div>
          </section>

          <section className="mt-14" aria-labelledby="svc">
            <h2 id="svc" className="font-display text-3xl">Үйлчилгээ</h2>
            <ul className="mt-5 divide-y divide-line rounded-[16px] border border-line bg-surface">
              {staff.services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-[13px] text-stone">{formatDuration(s.durationMin)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular">{formatMoney(s.price)}</span>
                    <Link href={`${bookHref}&service=${s.id}`} className={buttonClass("outline", "sm")}>
                      Цаг авах
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14" aria-labelledby="hours">
            <h2 id="hours" className="font-display text-3xl">Ажлын хуваарь</h2>
            <ul className="mt-5 grid gap-x-10 gap-y-2.5 text-[14px] sm:grid-cols-2">
              {schedule.map((d) => (
                <li key={d.name} className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-stone">{d.name}</span>
                  <span className="tabular">{d.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14" aria-labelledby="rev">
            <h2 id="rev" className="font-display text-3xl">Сэтгэгдэл</h2>
            <ul className="mt-5 divide-y divide-line">
              {reviews.length === 0 ? <li className="py-4 text-stone">Одоогоор сэтгэгдэл алга байна.</li> : null}
              {reviews.map((r) => (
                <li key={r.id} className="py-5 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.user.name} size={36} />
                    <div>
                      <p className="text-[14px] font-medium">{r.user.name}</p>
                      <p className="text-[12px] text-mute">
                        {r.appointment?.service.name} · {formatRelativeTime(r.createdAt)}
                      </p>
                    </div>
                    <Rating value={r.rating} className="ml-auto" />
                  </div>
                  {r.comment ? <p className="mt-3 text-[14px] leading-relaxed">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
