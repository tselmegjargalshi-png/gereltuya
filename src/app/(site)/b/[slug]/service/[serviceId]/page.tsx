import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronLeft, Clock } from "lucide-react";
import { getServiceDetail } from "@/server/discovery";
import { getUpcomingSlots } from "@/server/slots";
import { SlotChips } from "@/components/public/slot-chips";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { buttonClass } from "@/components/ui/button";
import { formatDuration, formatMoney, formatNextAvailable } from "@/lib/format";

const load = cache(getServiceDetail);
type P = { slug: string; serviceId: string };

export async function generateMetadata({ params }: { params: Promise<P> }): Promise<Metadata> {
  const { slug, serviceId } = await params;
  const data = await load(slug, serviceId);
  if (!data) return { title: "Үйлчилгээ олдсонгүй" };
  const { service } = data;
  return {
    title: `${service.name} | ${service.business.name}`,
    description: `${service.name}: ${formatDuration(service.durationMin)}, ${formatMoney(service.price)}. ${service.business.name}, ${service.business.district}. Онлайнаар цаг захиалаарай.`,
    alternates: { canonical: `/b/${slug}/service/${serviceId}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<P> }) {
  const { slug, serviceId } = await params;
  const data = await load(slug, serviceId);
  if (!data) notFound();
  const { service, staffNext } = data;
  const days = await getUpcomingSlots({ businessId: service.businessId, serviceId: service.id, days: 3 });
  const bookHref = `/book/${slug}?service=${service.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    provider: { "@type": "HealthAndBeautyBusiness", name: service.business.name, address: service.business.address },
    offers: { "@type": "Offer", price: service.price, priceCurrency: "MNT" },
  };

  return (
    <div className="container-page max-w-4xl py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/b/${slug}`} className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {service.business.name}
      </Link>
      <p className="eyebrow mt-8">{service.category.name}</p>
      <h1 className="mt-2 font-display text-[2.6rem] leading-tight md:text-[3.6rem]">{service.name}</h1>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-charcoal">{service.description}</p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <span className="flex items-center gap-2 text-stone">
          <Clock className="h-4 w-4" aria-hidden />
          {formatDuration(service.durationMin)}
        </span>
        <span className="text-2xl font-semibold tabular">{formatMoney(service.price)}</span>
        <Link href={bookHref} className={buttonClass("primary", "lg")}>
          Мэргэжилтэн сонгох
        </Link>
      </div>

      <section className="mt-14" aria-labelledby="specs">
        <h2 id="specs" className="font-display text-3xl">Боломжит мэргэжилтнүүд</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {service.staff.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-[16px] border border-line bg-surface p-4">
              <Avatar name={s.name} src={s.photoUrl} size={56} />
              <div className="min-w-0 flex-1">
                <Link href={`/s/${s.id}`} className="font-semibold hover:text-accent">{s.name}</Link>
                <p className="text-[13px] text-stone">{s.title}</p>
                <Rating value={s.ratingAvg} count={s.reviewCount} />
                <p className="mt-1 text-[12px] font-medium text-success">{formatNextAvailable(staffNext.get(s.id))}</p>
              </div>
              <Link href={`${bookHref}&staff=${s.id}`} className={buttonClass("outline", "sm")}>
                Сонгох
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="times">
        <h2 id="times" className="font-display text-3xl">Боломжтой цагууд</h2>
        <div className="mt-5">
          <SlotChips days={days} href={(d, t) => `${bookHref}&date=${d}&time=${t}`} />
        </div>
      </section>
    </div>
  );
}
