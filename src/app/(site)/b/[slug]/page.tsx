import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getBusinessProfile } from "@/server/discovery";
import { BusinessProfileView } from "@/components/public/business-profile";
import { formatMoney } from "@/lib/format";

const load = cache(getBusinessProfile);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Бизнес олдсонгүй" };
  const { business } = data;
  const minPrice = business.services.length ? Math.min(...business.services.map((s) => s.price)) : null;
  const description = `${business.name}: ${business.categories.map((c) => c.name).join(", ")}. ${business.district}. ${business.reviewCount} үнэлгээ${minPrice ? `, ${formatMoney(minPrice)}-аас эхэлнэ` : ""}. Онлайнаар цаг захиалаарай.`;
  return {
    title: `${business.name} | Цаг захиалах`,
    description,
    alternates: { canonical: `/b/${business.slug}` },
    openGraph: { title: `${business.name} | GERELTUYA`, description, images: business.coverUrl ? [business.coverUrl] : undefined, type: "website" },
  };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, user] = await Promise.all([load(slug), getCurrentUser()]);
  if (!data) notFound();
  const saved = user ? Boolean(await db.favorite.findFirst({ where: { userId: user.id, businessId: data.business.id } })) : false;
  const { business } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: business.name,
    image: business.coverUrl,
    description: business.description,
    telephone: business.phone,
    address: { "@type": "PostalAddress", streetAddress: business.address, addressLocality: business.city, addressCountry: "MN" },
    aggregateRating: business.reviewCount
      ? { "@type": "AggregateRating", ratingValue: business.ratingAvg, reviewCount: business.reviewCount }
      : undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/b/${business.slug}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BusinessProfileView data={data} saved={saved} signedIn={Boolean(user)} />
    </>
  );
}
