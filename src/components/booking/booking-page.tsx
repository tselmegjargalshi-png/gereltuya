import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { toDateKey } from "@/lib/time";
import { BookingWizard } from "@/components/booking/booking-wizard";

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function BookingPage({ slug, raw, base = "" }: { slug: string; raw: Raw; base?: string }) {
  const [business, user] = await Promise.all([
    db.business.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true,
        slug: true,
        name: true,
        address: true,
        services: {
          where: { active: true },
          orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
          select: { id: true, name: true, description: true, durationMin: true, price: true, category: { select: { name: true } }, staff: { where: { active: true }, select: { id: true } } },
        },
        staff: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, title: true, photoUrl: true, ratingAvg: true, reviewCount: true, experienceYears: true },
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!business) notFound();

  const services = business.services
    .filter((s) => s.staff.length > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      category: s.category.name,
      staffIds: s.staff.map((x) => x.id),
    }));

  return (
    <BookingWizard
      business={{ id: business.id, slug: business.slug, name: business.name, address: business.address }}
      services={services}
      staff={business.staff}
      user={user ? { name: user.name } : null}
      todayKey={toDateKey(new Date())}
      base={base}
      initial={{ service: first(raw.service), staff: first(raw.staff), date: first(raw.date), time: first(raw.time) }}
    />
  );
}
