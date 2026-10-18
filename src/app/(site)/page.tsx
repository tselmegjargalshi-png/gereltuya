import type { Metadata } from "next";
import Link from "next/link";
import { Check, CalendarClock, LineChart, Users, Bell, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getHomeData, searchBusinesses } from "@/server/discovery";
import { getAnalytics } from "@/server/analytics";
import { getCurrentUser } from "@/lib/auth/session";
import { PLANS } from "@/lib/plans";
import { formatMoney } from "@/lib/format";
import { addDays, ubStartOfDay } from "@/lib/time";
import { Section, ScrollRow } from "@/components/public/section";
import { SearchBar } from "@/components/public/search-bar";
import { HeroStage } from "@/components/public/hero-stage";
import { BusinessCard } from "@/components/public/business-card";
import { SpecialistCard } from "@/components/public/specialist-card";
import { CategoryCard } from "@/components/public/category-card";
import { PhoneMockup } from "@/components/public/phone-mockup";
import { DashboardPreview } from "@/components/public/dashboard-preview";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "GERELTUYA | Өөртөө зориулсан цагаа захиалаарай" },
  description:
    "Салон, үйлчилгээ, мэргэжилтнээ сонгоод хүссэн цагаа хэдхэн алхмаар захиалаарай. Үс, хумс, сормуус, хөмсөг, барбер, спа.",
  alternates: { canonical: "/" },
};

const QUICK = ["Маникюр", "Гелэн хумс", "Үс засалт", "Барбер", "Сормуус", "Хөмсөг", "Нүүр будалт"];

const FAQ = [
  {
    q: "GERELTUYA-аар цаг захиалахад төлбөр төлөх үү?",
    a: "Үгүй. Үйлчлүүлэгчид цаг захиалах нь үнэ төлбөргүй. Үйлчилгээний хөлсийг салон дээр шууд төлнө.",
  },
  {
    q: "Захиалгаа хэрхэн цуцлах эсвэл өөрчлөх вэ?",
    a: "Миний захиалгууд хэсгээс “Цуцлах” эсвэл “Цаг өөрчлөх” товчийг дарна. Бизнес бүр өөрийн цуцлах нөхцөлийг тогтоодог бөгөөд ихэнх тохиолдолд эхлэхээс 3 цагийн өмнө хүртэл төлбөргүй.",
  },
  {
    q: "Аль мэргэжилтэн чөлөөтэй байгааг хэрхэн мэдэх вэ?",
    a: "Мэргэжилтэн сонгох үед зөвхөн чөлөөтэй цагууд харагдана. Хэн нь ч байсан болох бол “Хэн ч байсан болно” гэж сонгоход бид чөлөөтэй мэргэжилтнийг оноож өгнө.",
  },
  {
    q: "Салоноо хэрхэн бүртгүүлэх вэ?",
    a: "“Бизнесээ бүртгүүлэх” товчийг дарж 7 алхамт бүртгэлийг бөглөнө. Бүртгэл баталгаажсаны дараа танай салон хайлтад харагдаж, захиалга авч эхэлнэ.",
  },
  {
    q: "Салон эзэмшигчид ямар боломж олгодог вэ?",
    a: "Календарь, үйлчилгээ болон мэргэжилтний удирдлага, үйлчлүүлэгчийн бүртгэл, орлогын тайлан, мэдэгдэл бүгд нэг дор байна.",
  },
  {
    q: "Миний мэдээлэл хамгаалагдах уу?",
    a: "Нууц үгийг шифрлэж хадгалдаг бөгөөд бизнес эзэмшигч зөвхөн өөрийн бизнесийн мэдээллийг харах эрхтэй.",
  },
];

export default async function HomePage() {
  const [user, home, noir] = await Promise.all([
    getCurrentUser(),
    getHomeData(),
    db.business.findFirst({ where: { slug: "noir-studio", status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);

  const [heroPick] = await searchBusinesses({ q: "NOIR STUDIO" }, { limit: 1 });
  const heroBusiness = heroPick ?? home.featured[0];
  const heroSpecialist = home.specialists.find((s) => s.businessSlug === heroBusiness?.slug) ?? home.specialists[0] ?? null;
  const heroService = heroBusiness
    ? await db.service.findFirst({
        where: { businessId: heroBusiness.id, name: "Гелэн маникюр", active: true },
        select: { name: true, durationMin: true, price: true },
      })
    : null;

  const today = ubStartOfDay(new Date());
  const [analytics, todayAppointments] = noir
    ? await Promise.all([
        getAnalytics({ businessId: noir.id }, "week"),
        db.appointment.findMany({
          where: { businessId: noir.id, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] }, startAt: { gte: today, lt: addDays(today, 1) } },
          orderBy: { startAt: "asc" },
          take: 4,
          include: { service: { select: { name: true } }, staff: { select: { name: true } } },
        }),
      ])
    : [null, []];

  const nextForPhone = await db.appointment.findFirst({
    where: { user: { email: "customer@gereltuya.mn" }, startAt: { gt: new Date() }, status: { in: ["CONFIRMED", "PENDING"] } },
    orderBy: { startAt: "asc" },
    include: { business: { select: { name: true } }, service: { select: { name: true } }, staff: { select: { name: true } } },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "GERELTUYA", url: process.env.NEXT_PUBLIC_SITE_URL, slogan: "Өөртөө зориулсан цагаа захиалаарай." },
      {
        "@type": "WebSite",
        name: "GERELTUYA",
        url: process.env.NEXT_PUBLIC_SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-12 pb-12 pt-10 md:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-8 lg:pb-20">
          <div>
            <p className="eyebrow mb-5 tracking-[0.3em]">GERELTUYA</p>
            <h1 className="font-display text-[2.7rem] leading-[1.04] text-balance sm:text-[3.6rem] lg:text-[4.4rem]">
              Өөртөө зориулсан цагаа захиалаарай.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-stone md:text-[17px]">
              Өөрт ойрхон салон, үйлчилгээ болон мэргэжилтнээ сонгоод хүссэн цагаа хялбархан захиалаарай.
            </p>
            <SearchBar className="mt-8 max-w-2xl" />
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Түгээмэл хайлт">
              {QUICK.map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-sand bg-surface px-3.5 py-1.5 text-[13px] text-charcoal transition-colors hover:border-ink hover:bg-ivory"
                >
                  {q}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/search" size="lg">
                Үйлчилгээ хайх
              </ButtonLink>
              <ButtonLink href="/register/business" variant="outline" size="lg">
                Бизнесээ бүртгүүлэх
              </ButtonLink>
            </div>
            <p className="mt-6 text-[13px] text-mute">
              {home.businessCount} бизнес · {home.specialistCount} мэргэжилтэн · Улаанбаатар
            </p>
          </div>
          {heroBusiness ? (
            <HeroStage
              business={{
                slug: heroBusiness.slug,
                name: heroBusiness.name,
                coverUrl: heroBusiness.coverUrl,
                categories: heroBusiness.categories,
                ratingAvg: heroBusiness.ratingAvg,
                reviewCount: heroBusiness.reviewCount,
                nextAvailable: heroBusiness.nextAvailable,
              }}
              specialist={
                heroSpecialist
                  ? {
                      name: heroSpecialist.name,
                      title: heroSpecialist.title,
                      photoUrl: heroSpecialist.photoUrl,
                      ratingAvg: heroSpecialist.ratingAvg,
                      nextAvailable: heroSpecialist.nextAvailable,
                    }
                  : null
              }
              service={heroService}
            />
          ) : null}
        </div>
      </section>

      <Section eyebrow="Ангилал" title="Юу хийлгэхээ сонгоорой" action={{ href: "/search", label: "Бүгдийг харах" }} className="pt-4">
        <ScrollRow className="md:grid-cols-5 lg:grid-cols-9 md:gap-3">
          {home.categories.map((c) => (
            <CategoryCard key={c.id} slug={c.slug} name={c.name} imageUrl={c.imageUrl} count={c.serviceCount} className="w-[44vw] max-w-[190px] shrink-0 snap-start md:w-auto md:max-w-none" />
          ))}
        </ScrollRow>
      </Section>

      <Section
        eyebrow="Онцлох бизнесүүд"
        title="Өндөр үнэлгээтэй салонууд"
        description="Үйлчлүүлэгчдийн бодит үнэлгээгээр эрэмбэлсэн."
        action={{ href: "/search?sort=rating", label: "Бүгдийг харах" }}
      >
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {home.featured.slice(0, 6).map((b, i) => (
            <Reveal key={b.id} delay={(i % 3) * 0.06}>
              <BusinessCard business={b} signedIn={Boolean(user)} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section eyebrow="Мэргэжилтнүүд" title="Эрэлттэй мэргэжилтнүүд" action={{ href: "/search?view=specialists", label: "Бүгдийг харах" }}>
        <ScrollRow className="md:grid-cols-4 md:gap-6">
          {home.specialists.slice(0, 8).map((s) => (
            <SpecialistCard key={s.id} specialist={s} className="w-[62vw] max-w-[260px] shrink-0 snap-start md:w-auto md:max-w-none" />
          ))}
        </ScrollRow>
      </Section>

      <Section
        eyebrow="Өнөөдөр"
        title="Өнөөдөр боломжтой цагууд"
        description="Хүлээлгүй, өнөөдөртөө багтах боломжтой салонууд."
        action={{ href: "/search?today=1", label: "Бүгдийг харах" }}
      >
        {home.available.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {home.available.slice(0, 3).map((b) => (
              <BusinessCard key={b.id} business={b} signedIn={Boolean(user)} />
            ))}
          </div>
        ) : (
          <p className="rounded-[14px] border border-dashed border-sand p-10 text-center text-stone">Өнөөдөр боломжтой цаг олдсонгүй. Маргаашийн цагуудыг харна уу.</p>
        )}
      </Section>

      <section className="border-y border-line bg-ivory/50">
        <Section eyebrow="Хэрхэн ажилладаг вэ" title="Хэдхэн алхмаар захиалаарай" className="py-14 md:py-20">
          <ol className="grid gap-px overflow-hidden rounded-[20px] border border-line bg-line md:grid-cols-4">
            {[
              ["01", "Үйлчилгээгээ сонго", "Салон эсвэл үйлчилгээгээ хайж, үнэ, үнэлгээгээр нь харьцуулна."],
              ["02", "Мэргэжилтнээ сонго", "Өөрт тохирсон мэргэжилтнээ, эсвэл “Хэн ч байсан болно” гэж сонгоно."],
              ["03", "Цагаа сонго", "Зөвхөн чөлөөтэй өдөр, цагууд харагдана. Давхардал гарахгүй."],
              ["04", "Баталгаажуул", "Захиалга шууд баталгаажиж, сануулга ирнэ."],
            ].map(([n, t, d]) => (
              <li key={n} className="bg-paper p-6 md:p-7">
                <span className="font-display text-3xl text-accent">{n}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone">{d}</p>
              </li>
            ))}
          </ol>
        </Section>
      </section>

      <Section eyebrow="Үйлчлүүлэгчдэд" title="Утсан дээрээ апп шиг" description="Хайх, захиалах, цагаа өөрчлөх бүгд нэг дороос. Тусдаа апп татах шаардлагагүй.">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
          <div className="order-2 lg:order-1">
            <ul className="space-y-4 text-[16px] text-charcoal">
              {[
                "Өөрт ойрхон салон, мэргэжилтнийг хайна",
                "Зөвхөн чөлөөтэй цагуудыг харна",
                "Цагаа өөрчлөх, цуцлахад хэдхэн секунд",
                "Дуртай салон, мэргэжилтнээ хадгална",
                "Үйлчилгээний дараа үнэлгээ үлдээнэ",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/app" variant="outline" size="lg" className="mt-8">
              Апп-ыг нээх <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="order-1 flex justify-center py-6 lg:order-2">
            {nextForPhone ? (
              <PhoneMockup
                preview={{
                  customerName: "Сарнай",
                  business: nextForPhone.business.name,
                  service: nextForPhone.service.name,
                  staff: nextForPhone.staff.name,
                  startAt: nextForPhone.startAt,
                  price: nextForPhone.price,
                }}
                categories={home.categories.map((c) => c.name)}
              />
            ) : null}
          </div>
        </div>
      </Section>

      <section id="business" className="scroll-mt-24 border-y border-line bg-ivory/50">
        <div className="container-page py-14 md:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow mb-3">Бизнест зориулсан</p>
            <h2 className="font-display text-[2rem] leading-[1.1] md:text-[2.75rem]">Салоны өдөр тутмын ажил нэг дор</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone md:text-base">
              Цаг захиалга, үйлчлүүлэгч, орлого, ажилтны хуваарийг нэг самбараас удирдана. Доорх тоонууд демо бизнесийн бодит өгөгдлөөс тооцоологдсон.
            </p>
          </div>
          {analytics && noir ? (
            <DashboardPreview
              analytics={analytics}
              businessName={noir.name}
              today={todayAppointments.map((a) => ({ id: a.id, startAt: a.startAt, service: a.service.name, staff: a.staff.name }))}
            />
          ) : null}
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [CalendarClock, "Чирж зөөдөг календарь", "Захиалгыг чирээд өөр цаг, өөр мэргэжилтэнд шилжүүлнэ."],
              [Users, "Үйлчлүүлэгчийн бүртгэл", "Хэн хэдэн удаа ирсэн, юунд дуртайг нэг дороос харна."],
              [LineChart, "Орлого, цагийн статистик", "Шилдэг үйлчилгээ, мэргэжилтэн, оргил цагийг тооцоолно."],
              [Bell, "Шинэ захиалгын мэдэгдэл", "Захиалга орох бүрт шууд мэдэгдэл хүлээн авна."],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Bell;
              return (
                <li key={t as string} className="rounded-[16px] border border-line bg-surface p-5">
                  <I className="h-5 w-5 text-accent" aria-hidden />
                  <h3 className="mt-4 text-[15px] font-semibold">{t as string}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone">{d as string}</p>
                </li>
              );
            })}
          </ul>
          <ButtonLink href="/register/business" size="lg" className="mt-10">
            Бизнесээ бүртгүүлэх <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      <Section id="pricing" eyebrow="Үнийн санал" title="Бизнесийнхээ хэмжээнд тохирсон багц" description="Эхлэхэд үнэ төлбөргүй. Өсөхөд хамт өснө.">
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(PLANS).map((plan) => {
            const featured = plan.id === "PRO";
            return (
              <div
                key={plan.id}
                className={
                  featured
                    ? "relative flex flex-col rounded-[20px] bg-ink p-7 text-paper shadow-[var(--shadow-lift)]"
                    : "flex flex-col rounded-[20px] border border-line bg-surface p-7"
                }
              >
                {featured ? <span className="absolute right-6 top-6 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-paper">Түгээмэл</span> : null}
                <p className={featured ? "text-sm tracking-[0.16em] text-nude" : "text-sm tracking-[0.16em] text-stone"}>{plan.name}</p>
                <p className="mt-4 font-display text-5xl">
                  {plan.price === 0 ? "Үнэгүй" : formatMoney(plan.price)}
                  {plan.price > 0 ? <span className={featured ? "ml-1 font-sans text-sm text-paper/60" : "ml-1 font-sans text-sm text-stone"}>/ сар</span> : null}
                </p>
                <p className={featured ? "mt-3 text-sm text-paper/70" : "mt-3 text-sm text-stone"}>{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-3 text-[14px]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3">
                      <Check className={featured ? "mt-0.5 h-4 w-4 shrink-0 text-nude" : "mt-0.5 h-4 w-4 shrink-0 text-success"} aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/register/business" variant={featured ? "accent" : "outline"} className="mt-8 w-full">
                  {plan.price === 0 ? "Үнэгүй эхлэх" : "Туршиж үзэх"}
                </ButtonLink>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[13px] text-mute">Төлбөрийн холболт одоогоор демо горимд байгаа тул бодит төлбөр авахгүй.</p>
      </Section>

      <Section id="faq" eyebrow="Түгээмэл асуулт" title="Асуулт, хариулт" className="pt-4">
        <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="relative h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-45" aria-hidden>
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-ink" />
                  <span className="absolute left-1/2 top-0 h-4 w-px bg-ink" />
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone">{item.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="container-page pb-6 pt-4">
        <div className="grain relative overflow-hidden rounded-[28px] bg-ink px-6 py-14 text-center text-paper md:py-20">
          <p className="eyebrow !text-nude">GERELTUYA</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-[2.2rem] leading-tight md:text-[3.2rem]">Өөртөө зориулсан цагаа захиалаарай.</h2>
          <p className="mx-auto mt-4 max-w-lg text-paper/70">Салон, үйлчилгээ, мэргэжилтнээ сонгоод хүссэн цагаа хэдхэн алхмаар захиалаарай.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/search" variant="secondary" size="lg">
              Үйлчилгээ хайх
            </ButtonLink>
            <ButtonLink href="/register/business" variant="accent" size="lg">
              Бизнесээ бүртгүүлэх
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
