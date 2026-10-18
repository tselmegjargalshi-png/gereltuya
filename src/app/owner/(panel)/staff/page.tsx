import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { storageEnabled } from "@/lib/storage";
import { addDays, ubStartOfDay } from "@/lib/time";
import { PageHeader } from "@/components/owner/page-header";
import { StaffManager } from "@/components/owner/staff-manager";

export const metadata: Metadata = { title: "Мэргэжилтнүүд" };

export default async function OwnerStaff() {
  const { business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  const from = addDays(ubStartOfDay(new Date()), -29);
  const [staff, services, perf, bizHours] = await Promise.all([
    db.businessStaff.findMany({
      where: { businessId: business.id },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
      include: { services: { select: { id: true } }, workingHours: true, user: { select: { email: true } } },
    }),
    db.service.findMany({ where: { businessId: business.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.appointment.groupBy({
      by: ["staffId", "status"],
      where: { businessId: business.id, startAt: { gte: from, lt: addDays(new Date(), 1) }, status: { in: ["COMPLETED", "NO_SHOW", "CONFIRMED", "PENDING"] } },
      _count: { _all: true },
      _sum: { price: true },
    }),
    db.workingHour.findMany({ where: { businessId: business.id, staffId: null } }),
  ]);
  const limit = PLANS[plan].limits.staff;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Мэргэжилтнүүд" description="Багийн гишүүд, тэдний үйлчилгээ, ажлын хуваарь." />
      <StaffManager
        plan={plan}
        limit={Number.isFinite(limit) ? limit : null}
        canUpload={storageEnabled()}
        services={services}
        businessHours={bizHours.map((h) => ({ weekday: h.weekday, isClosed: h.isClosed, openTime: h.openTime, closeTime: h.closeTime }))}
        staff={staff.map((s) => {
          const rows = perf.filter((p) => p.staffId === s.id);
          const completed = rows.find((r) => r.status === "COMPLETED");
          const total = rows.reduce((n, r) => n + r._count._all, 0);
          return {
            id: s.id,
            name: s.name,
            title: s.title,
            photoUrl: s.photoUrl ?? "",
            bio: s.bio,
            experienceYears: s.experienceYears,
            active: s.active,
            color: s.color,
            rating: s.ratingAvg,
            reviewCount: s.reviewCount,
            serviceIds: s.services.map((x) => x.id),
            loginEmail: s.user?.email ?? "",
            hours: s.workingHours.map((h) => ({ weekday: h.weekday, isClosed: h.isClosed, openTime: h.openTime, closeTime: h.closeTime, breakStart: h.breakStart ?? "", breakEnd: h.breakEnd ?? "" })),
            stats: { bookings: total, completed: completed?._count._all ?? 0, revenue: completed?._sum.price ?? 0 },
          };
        })}
      />
    </div>
  );
}
