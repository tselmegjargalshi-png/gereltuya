import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { addDays, toDateKey, ubParts, ubStartOfDay } from "@/lib/time";
import { formatDayMonth, formatTime, WEEKDAYS } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Хуваарь" };

export default async function StaffSchedule() {
  const { staff } = await requireStaff();
  const start = ubStartOfDay(new Date());
  const [appts, hours, bizHours] = await Promise.all([
    db.appointment.findMany({
      where: { staffId: staff.id, startAt: { gte: start, lt: addDays(start, 14) }, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } },
      orderBy: { startAt: "asc" },
      include: { service: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    db.workingHour.findMany({ where: { staffId: staff.id } }),
    db.workingHour.findMany({ where: { businessId: staff.businessId, staffId: null } }),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  return (
    <div>
      <h1 className="font-display text-[2.2rem] leading-tight">Хуваарь</h1>
      <p className="mt-1 text-sm text-stone">Ирэх 14 хоногийн захиалга.</p>
      <ul className="mt-6 space-y-4">
        {days.map((d) => {
          const k = toDateKey(d);
          const wd = ubParts(d).weekday;
          const h = hours.find((x) => x.weekday === wd) ?? bizHours.find((x) => x.weekday === wd);
          const list = appts.filter((a) => toDateKey(a.startAt) === k);
          return (
            <li key={k} className="rounded-[16px] border border-line bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[15px] font-semibold">
                  {formatDayMonth(d)} <span className="font-normal text-stone">{WEEKDAYS[wd]}</span>
                </p>
                <p className="text-[12px] text-mute tabular">{!h || h.isClosed ? "Амарна" : `${h.openTime} - ${h.closeTime}`}</p>
              </div>
              {list.length === 0 ? (
                <p className="mt-2 text-[13px] text-mute">Захиалга алга.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 text-[14px]">
                      <span className="w-12 font-semibold tabular">{formatTime(a.startAt)}</span>
                      <span className="min-w-0 flex-1 truncate">{a.customer.name} <span className="text-stone">· {a.service.name}</span></span>
                      <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
