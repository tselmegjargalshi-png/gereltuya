import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { addDays, daysInMonth, fromDateKey, hhmmToMinutes, toDateKey, ubDate, ubParts, ubStartOfWeek } from "@/lib/time";
import { CalendarBoard, type CalStaff, type CalAppt, type CalBlock, type CalHours } from "@/components/owner/calendar-board";
import { PageHeader } from "@/components/owner/page-header";

export const metadata: Metadata = { title: "Календарь" };

export default async function OwnerCalendar({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; staff?: string }> }) {
  const sp = await searchParams;
  const { business } = await requireOwnerBusiness();
  const now = new Date();
  const view = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const anchor = (sp.date && fromDateKey(sp.date)) || fromDateKey(toDateKey(now))!;

  let from = anchor;
  let to = addDays(anchor, 1);
  if (view === "week") {
    from = ubStartOfWeek(anchor);
    to = addDays(from, 7);
  } else if (view === "month") {
    const p = ubParts(anchor);
    from = ubDate(p.year, p.month, 1);
    to = ubDate(p.year, p.month, daysInMonth(p.year, p.month) + 1);
  }

  const [staff, services, appts, blocks, hours] = await Promise.all([
    db.businessStaff.findMany({ where: { businessId: business.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, color: true, photoUrl: true, title: true, services: { select: { id: true } } } }),
    db.service.findMany({ where: { businessId: business.id, active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, durationMin: true, price: true } }),
    db.appointment.findMany({
      where: { businessId: business.id, status: { not: "CANCELLED" }, startAt: { gte: from, lt: to } },
      orderBy: { startAt: "asc" },
      include: { service: { select: { name: true } }, customer: { select: { name: true, phone: true } } },
    }),
    db.blockedTime.findMany({ where: { businessId: business.id, endAt: { gt: from }, startAt: { lt: to } }, orderBy: { startAt: "asc" } }),
    db.workingHour.findMany({ where: { businessId: business.id } }),
  ]);

  const calStaff: CalStaff[] = staff.map((s) => ({ id: s.id, name: s.name, color: s.color, title: s.title, serviceIds: s.services.map((x) => x.id) }));
  const calAppts: CalAppt[] = appts.map((a) => ({
    id: a.id,
    staffId: a.staffId,
    serviceName: a.service.name,
    customerName: a.customer.name,
    phone: a.customer.phone,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    price: a.price,
    note: a.note,
    code: a.code,
  }));
  const calBlocks: CalBlock[] = blocks.map((b) => ({ id: b.id, staffId: b.staffId, startAt: b.startAt.toISOString(), endAt: b.endAt.toISOString(), reason: b.reason }));
  const calHours: CalHours[] = hours.map((h) => ({ staffId: h.staffId, weekday: h.weekday, open: hhmmToMinutes(h.openTime), close: hhmmToMinutes(h.closeTime), closed: h.isClosed }));

  const open = hours.filter((h) => !h.isClosed).map((h) => hhmmToMinutes(h.openTime));
  const close = hours.filter((h) => !h.isClosed).map((h) => hhmmToMinutes(h.closeTime));
  const startHour = Math.min(open.length ? Math.floor(Math.min(...open) / 60) : 9, ...appts.map((a) => ubParts(a.startAt).hour), 9);
  const endHour = Math.max(close.length ? Math.ceil(Math.max(...close) / 60) : 20, ...appts.map((a) => Math.ceil((ubParts(a.endAt).hour * 60 + ubParts(a.endAt).minute) / 60)));

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader title="Календарь" description="Захиалгыг чирж шилжүүлэх, шинэ цаг нэмэх, цаг хаах боломжтой." />
      <CalendarBoard
        view={view}
        dateKey={toDateKey(anchor)}
        todayKey={toDateKey(now)}
        staffFilter={staff.some((s) => s.id === sp.staff) ? sp.staff! : "all"}
        staff={calStaff}
        services={services}
        appointments={calAppts}
        blocks={calBlocks}
        hours={calHours}
        startHour={Math.min(startHour, 23)}
        endHour={Math.min(Math.max(endHour, startHour + 4), 24)}
        nowIso={now.toISOString()}
      />
    </div>
  );
}
