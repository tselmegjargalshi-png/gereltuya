import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan } from "@/lib/plans";
import { formatDateDots, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/owner/page-header";
import { SettingsPanels } from "@/components/owner/settings-panels";
import { PasswordForm } from "@/components/app/profile-forms";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Тохиргоо" };

export default async function OwnerSettings() {
  const { business } = await requireOwnerBusiness();
  const [hours, payments, rule] = await Promise.all([
    db.workingHour.findMany({ where: { businessId: business.id, staffId: null } }),
    db.payment.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.bookingRule.findUnique({ where: { businessId: business.id } }),
  ]);
  const plan = effectivePlan(business.subscription);
  const sub = business.subscription;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Тохиргоо" description="Захиалгын дүрэм, ажлын цаг, багц болон нууц үг." />
      <SettingsPanels
        plan={plan}
        trial={sub?.status === "TRIAL"}
        periodEnd={sub?.currentPeriodEnd ? formatDateDots(sub.currentPeriodEnd) : null}
        rule={{
          minLeadMinutes: rule?.minLeadMinutes ?? 60,
          maxAdvanceDays: rule?.maxAdvanceDays ?? 30,
          cancelWindowHours: rule?.cancelWindowHours ?? 3,
          slotStepMin: rule?.slotStepMin ?? 30,
          bufferMin: rule?.bufferMin ?? 0,
          autoConfirm: rule?.autoConfirm ?? true,
          cancellationPolicy: rule?.cancellationPolicy ?? "",
        }}
        hours={Array.from({ length: 7 }, (_, weekday) => {
          const h = hours.find((x) => x.weekday === weekday);
          return { weekday, isClosed: h?.isClosed ?? weekday === 6, openTime: h?.openTime ?? "10:00", closeTime: h?.closeTime ?? "20:00" };
        })}
      />

      <section className="mt-10 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="pay-title">
        <h2 id="pay-title" className="text-[15px] font-semibold">Төлбөрийн түүх</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-stone">Төлбөр хийгдээгүй байна.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="tabular text-stone">{formatDateDots(p.createdAt)}</span>
                <span className="flex-1">{p.plan} багц</span>
                <Badge tone={p.status === "PAID" ? "success" : p.status === "FAILED" ? "danger" : "warning"}>{p.status === "PAID" ? "Төлөгдсөн" : p.status === "FAILED" ? "Амжилтгүй" : "Хүлээгдэж буй"}</Badge>
                <span className="w-28 text-right font-medium tabular">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[12.5px] text-mute">Төлбөрийн үйлчилгээ холбогдоогүй тул одоогоор туршилтын горимд ажиллана. Жинхэнэ төлбөр хийгдэхгүй.</p>
      </section>

      <section className="mt-6 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="pw-title">
        <h2 id="pw-title" className="mb-4 text-[15px] font-semibold">Нууц үг солих</h2>
        <div className="max-w-md">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
