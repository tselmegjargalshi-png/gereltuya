import type { Metadata } from "next";
import { Clock3 } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { completePastForBusiness } from "@/lib/maintenance";
import { addDays, ubStartOfDay, ubStartOfWeek } from "@/lib/time";
import { formatDayMonth, formatMoney, formatTime } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/owner/page-header";

export const metadata: Metadata = { title: "Өнөөдөр" };

export default async function StaffToday() {
  const { staff, user } = await requireStaff();
  await completePastForBusiness(staff.businessId);
  const now = new Date();
  const dayStart = ubStartOfDay(now);
  const weekStart = ubStartOfWeek(now);
  const [today, upcoming, weekDone] = await Promise.all([
    db.appointment.findMany({
      where: { staffId: staff.id, startAt: { gte: dayStart, lt: addDays(dayStart, 1) }, status: { not: "CANCELLED" } },
      orderBy: { startAt: "asc" },
      include: { service: { select: { name: true, durationMin: true } }, customer: { select: { name: true, phone: true } } },
    }),
    db.appointment.count({ where: { staffId: staff.id, startAt: { gte: addDays(dayStart, 1) }, status: { in: ["CONFIRMED", "PENDING"] } } }),
    db.appointment.aggregate({ where: { staffId: staff.id, startAt: { gte: weekStart, lt: addDays(weekStart, 7) }, status: "COMPLETED" }, _count: { _all: true }, _sum: { price: true } }),
  ]);
  return (
    <div>
      <p className="text-sm text-stone">{formatDayMonth(now)}</p>
      <h1 className="mt-1 font-display text-[2.2rem] leading-tight">Сайн байна уу, {user.name.split(" ")[0]}</h1>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Өнөөдөр" value={String(today.length)} hint="захиалга" />
        <StatCard label="Ирэх" value={String(upcoming)} hint="маргаашаас хойш" />
        <StatCard label="Энэ 7 хоногт" value={String(weekDone._count._all)} hint={formatMoney(weekDone._sum.price ?? 0)} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Өнөөдрийн хуваарь</h2>
      {today.length === 0 ? (
        <EmptyState icon={<Clock3 className="h-8 w-8" aria-hidden />} title="Өнөөдөр захиалга байхгүй байна." description="Шинэ захиалга орж ирэхэд энд харагдана." />
      ) : (
        <ul className="space-y-3">
          {today.map((a) => (
            <li key={a.id} className="flex gap-4 rounded-[16px] border border-line bg-surface p-4">
              <div className="w-14 shrink-0 text-center">
                <p className="text-[18px] font-semibold tabular">{formatTime(a.startAt)}</p>
                <p className="text-[11px] text-mute tabular">{a.service.durationMin} мин</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{a.customer.name}</p>
                <p className="truncate text-[13px] text-stone">{a.service.name}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-3 text-[13px]">
                  <a href={`tel:${a.customer.phone.replace(/\s/g, "")}`} className="tabular text-stone hover:text-accent">{a.customer.phone}</a>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </p>
                {a.note ? <p className="mt-2 rounded-[8px] bg-ivory px-3 py-2 text-[13px] text-charcoal">{a.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
