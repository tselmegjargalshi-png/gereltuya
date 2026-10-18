import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { PageHeader } from "@/components/owner/page-header";
import { ServiceManager } from "@/components/owner/service-manager";

export const metadata: Metadata = { title: "Үйлчилгээ" };

export default async function OwnerServices() {
  const { business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  const [services, categories, staff] = await Promise.all([
    db.service.findMany({
      where: { businessId: business.id },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
      include: { staff: { select: { id: true } }, category: { select: { name: true } }, _count: { select: { appointments: true } } },
    }),
    db.serviceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.businessStaff.findMany({ where: { businessId: business.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const limit = PLANS[plan].limits.services;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Үйлчилгээ" description="Үйлчлүүлэгчдэд харагдах үйлчилгээ, үнэ, үргэлжлэх хугацаа." />
      <ServiceManager
        plan={plan}
        limit={Number.isFinite(limit) ? limit : null}
        categories={categories}
        staff={staff}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          categoryId: s.categoryId,
          categoryName: s.category.name,
          durationMin: s.durationMin,
          price: s.price,
          active: s.active,
          staffIds: s.staff.map((x) => x.id),
          bookings: s._count.appointments,
        }))}
      />
    </div>
  );
}
