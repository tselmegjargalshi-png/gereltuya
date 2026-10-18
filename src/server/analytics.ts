import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { WEEKDAYS_SHORT } from "@/lib/format";
import { addDays, daysInMonth, toDateKey, ubDate, ubParts, ubStartOfDay, ubStartOfMonth, ubStartOfYear } from "@/lib/time";

export type Range = "today" | "week" | "month" | "year";

export const RANGE_LABEL: Record<Range, string> = { today: "Өнөөдөр", week: "7 хоног", month: "Сар", year: "Жил" };

export function parseRange(value?: string | null): Range {
  return value === "today" || value === "week" || value === "month" || value === "year" ? value : "week";
}

export type SeriesPoint = { key: string; label: string; revenue: number; bookings: number };

export type Analytics = {
  range: Range;
  from: Date;
  to: Date;
  revenue: number;
  previousRevenue: number;
  bookings: number;
  previousBookings: number;
  completed: number;
  avgOrder: number;
  newCustomers: number;
  returningCustomers: number;
  cancelled: number;
  cancellationRate: number;
  expectedRevenue: number;
  series: SeriesPoint[];
  topServices: { id: string; name: string; bookings: number; revenue: number }[];
  topStaff: { id: string; name: string; photoUrl: string | null; bookings: number; revenue: number; rating: number }[];
  peakHours: { hour: number; bookings: number }[];
};

export function rangeBounds(range: Range, now = new Date()): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const today = ubStartOfDay(now);
  const p = ubParts(now);
  switch (range) {
    case "today":
      return { from: today, to: addDays(today, 1), prevFrom: addDays(today, -1), prevTo: today };
    case "week": {
      const from = addDays(today, -6);
      return { from, to: addDays(today, 1), prevFrom: addDays(from, -7), prevTo: from };
    }
    case "month": {
      const from = ubStartOfMonth(now);
      const to = ubDate(p.year, p.month, daysInMonth(p.year, p.month) + 1);
      const prevFrom = p.month === 1 ? ubDate(p.year - 1, 12, 1) : ubDate(p.year, p.month - 1, 1);
      return { from, to, prevFrom, prevTo: from };
    }
    case "year": {
      const from = ubStartOfYear(now);
      return { from, to: ubDate(p.year + 1, 1, 1), prevFrom: ubDate(p.year - 1, 1, 1), prevTo: from };
    }
  }
}

const MONTHS_SHORT = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];

function bucketFor(range: Range, date: Date): { key: string; label: string } {
  const p = ubParts(date);
  if (range === "today") return { key: String(p.hour), label: `${String(p.hour).padStart(2, "0")}:00` };
  if (range === "year") return { key: String(p.month), label: MONTHS_SHORT[p.month - 1] };
  return { key: toDateKey(date), label: range === "week" ? WEEKDAYS_SHORT[p.weekday] : String(p.day) };
}

function emptySeries(range: Range, from: Date, to: Date): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  if (range === "today") {
    for (let h = 8; h <= 21; h++) out.push({ key: String(h), label: `${String(h).padStart(2, "0")}:00`, revenue: 0, bookings: 0 });
  } else if (range === "year") {
    for (let m = 1; m <= 12; m++) out.push({ key: String(m), label: MONTHS_SHORT[m - 1], revenue: 0, bookings: 0 });
  } else {
    for (let d = from; d < to; d = addDays(d, 1)) {
      const b = bucketFor(range, d);
      out.push({ ...b, revenue: 0, bookings: 0 });
    }
  }
  return out;
}

export type AnalyticsScope = { businessId: string; staffId?: string };

export async function getAnalytics(scope: AnalyticsScope, range: Range, now = new Date()): Promise<Analytics> {
  const { from, to, prevFrom, prevTo } = rangeBounds(range, now);
  const base: Prisma.AppointmentWhereInput = { businessId: scope.businessId, ...(scope.staffId ? { staffId: scope.staffId } : {}) };

  const [current, previous] = await Promise.all([
    db.appointment.findMany({
      where: { ...base, startAt: { gte: from, lt: to } },
      select: { id: true, startAt: true, price: true, status: true, customerId: true, serviceId: true, staffId: true },
    }),
    db.appointment.findMany({
      where: { ...base, startAt: { gte: prevFrom, lt: prevTo } },
      select: { price: true, status: true },
    }),
  ]);

  const live = current.filter((a) => a.status !== "CANCELLED");
  const completed = current.filter((a) => a.status === "COMPLETED");
  const revenue = completed.reduce((s, a) => s + a.price, 0);
  const prevCompleted = previous.filter((a) => a.status === "COMPLETED");
  const previousRevenue = prevCompleted.reduce((s, a) => s + a.price, 0);
  const cancelled = current.filter((a) => a.status === "CANCELLED").length;
  const expectedRevenue = current.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").reduce((s, a) => s + a.price, 0);

  // New vs returning customers, calculated from each customer's first non-cancelled visit.
  const customerIds = [...new Set(live.map((a) => a.customerId))];
  const firsts = customerIds.length
    ? await db.appointment.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customerIds }, status: { not: "CANCELLED" } },
        _min: { startAt: true },
      })
    : [];
  let newCustomers = 0;
  let returningCustomers = 0;
  for (const f of firsts) {
    if (f._min.startAt && f._min.startAt >= from) newCustomers++;
    else returningCustomers++;
  }

  const series = emptySeries(range, from, to);
  const index = new Map(series.map((s, i) => [s.key, i]));
  for (const a of live) {
    const i = index.get(bucketFor(range, a.startAt).key);
    if (i === undefined) continue;
    series[i].bookings += 1;
    if (a.status === "COMPLETED") series[i].revenue += a.price;
  }

  const serviceAgg = new Map<string, { bookings: number; revenue: number }>();
  const staffAgg = new Map<string, { bookings: number; revenue: number }>();
  const hourAgg = new Map<number, number>();
  for (const a of live) {
    const s = serviceAgg.get(a.serviceId) ?? { bookings: 0, revenue: 0 };
    s.bookings++;
    if (a.status === "COMPLETED") s.revenue += a.price;
    serviceAgg.set(a.serviceId, s);
    const t = staffAgg.get(a.staffId) ?? { bookings: 0, revenue: 0 };
    t.bookings++;
    if (a.status === "COMPLETED") t.revenue += a.price;
    staffAgg.set(a.staffId, t);
    const h = ubParts(a.startAt).hour;
    hourAgg.set(h, (hourAgg.get(h) ?? 0) + 1);
  }

  const [services, staff] = await Promise.all([
    db.service.findMany({ where: { id: { in: [...serviceAgg.keys()] } }, select: { id: true, name: true } }),
    db.businessStaff.findMany({ where: { id: { in: [...staffAgg.keys()] } }, select: { id: true, name: true, photoUrl: true, ratingAvg: true } }),
  ]);

  const peakHours: { hour: number; bookings: number }[] = [];
  for (let h = 8; h <= 21; h++) peakHours.push({ hour: h, bookings: hourAgg.get(h) ?? 0 });

  return {
    range,
    from,
    to,
    revenue,
    previousRevenue,
    bookings: live.length,
    previousBookings: previous.filter((a) => a.status !== "CANCELLED").length,
    completed: completed.length,
    avgOrder: completed.length ? Math.round(revenue / completed.length) : 0,
    newCustomers,
    returningCustomers,
    cancelled,
    cancellationRate: current.length ? cancelled / current.length : 0,
    expectedRevenue,
    series,
    topServices: [...serviceAgg.entries()]
      .map(([id, v]) => ({ id, name: services.find((s) => s.id === id)?.name ?? "", ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, 5),
    topStaff: [...staffAgg.entries()]
      .map(([id, v]) => {
        const s = staff.find((x) => x.id === id);
        return { id, name: s?.name ?? "", photoUrl: s?.photoUrl ?? null, rating: s?.ratingAvg ?? 0, ...v };
      })
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
      .slice(0, 5),
    peakHours,
  };
}

export function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}
