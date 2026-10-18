import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { storageEnabled } from "@/lib/storage";
import { startOnboardingAction } from "@/server/actions/owner-business";
import { OnboardingWizard } from "@/components/owner/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser(["BUSINESS_OWNER"], "/owner/onboarding");
  let business = await db.business.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } });
  if (!business) {
    await startOnboardingAction();
    business = await db.business.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } });
  }
  if (!business) redirect("/login");
  if (business.onboardingCompleted) redirect("/owner");

  const [categories, selected, services, staff, hours, rule] = await Promise.all([
    db.serviceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.business.findUnique({ where: { id: business.id }, select: { categories: { select: { id: true } } } }),
    db.service.findMany({ where: { businessId: business.id }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, durationMin: true, price: true } }),
    db.businessStaff.findMany({ where: { businessId: business.id }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, title: true } }),
    db.workingHour.findMany({ where: { businessId: business.id, staffId: null } }),
    db.bookingRule.findUnique({ where: { businessId: business.id } }),
  ]);

  return (
    <OnboardingWizard
      canUpload={storageEnabled()}
      userName={user.name}
      initialStep={Math.min(Math.max(business.onboardingStep, 2), 7)}
      categories={categories}
      services={services}
      staff={staff}
      info={{
        name: business.name,
        tagline: business.tagline ?? "",
        address: business.address,
        district: business.district,
        phone: business.phone,
        description: business.description,
        categoryIds: selected?.categories.map((c) => c.id) ?? [],
      }}
      hours={Array.from({ length: 7 }, (_, weekday) => {
        const h = hours.find((x) => x.weekday === weekday);
        return { weekday, isClosed: h?.isClosed ?? weekday === 6, openTime: h?.openTime ?? "10:00", closeTime: h?.closeTime ?? "20:00" };
      })}
      rule={{
        minLeadMinutes: rule?.minLeadMinutes ?? 60,
        maxAdvanceDays: rule?.maxAdvanceDays ?? 30,
        cancelWindowHours: rule?.cancelWindowHours ?? 3,
        slotStepMin: rule?.slotStepMin ?? 30,
        bufferMin: rule?.bufferMin ?? 0,
        autoConfirm: rule?.autoConfirm ?? true,
        cancellationPolicy: rule?.cancellationPolicy ?? "",
      }}
    />
  );
}
