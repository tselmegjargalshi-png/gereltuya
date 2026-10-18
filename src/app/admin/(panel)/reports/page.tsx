import type { Metadata } from "next";
import { db } from "@/lib/db";
import { addDays, ubDate, ubParts, ubStartOfWeek } from "@/lib/time";
import { formatDayMonth, formatMoney } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { HBars } from "@/components/charts/h-bars";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Тайлан" };

export default async function AdminReports() {
  const now = new Date();
  const weekStart = ubStartOfWeek(now);
  const from = addDays(weekStart, -7 * 7);
  const p = ubParts(now);
  const monthFrom = ubDate(p.year, p.month - 5, 1);
  const [appts, users, businesses] = await Promise.all([
    db.appointment.findMany({ where: { startAt: { gte: from, lt: addDays(weekStart, 7) }, status: { not: "CANCELLED" } }, select: { startAt: true, price: true, status: true, businessId: true } }),
    db.user.findMany({ where: { createdAt: { gte: monthFrom } }, select: { createdAt: true, role: true } }),
    db.business.findMany({ select: { id: true, name: true } }),
  ]);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const s = addDays(from, i * 7);
    const e = addDays(s, 7);
    const rows = appts.filter((a) => a.startAt >= s && a.startAt < e);
    return { key: s.toISOString(), label: formatDayMonth(s).replace("-р сарын ", "/"), bookings: rows.length, revenue: rows.filter((r) => r.status === "COMPLETED").reduce((n, r) => n + r.price, 0) };
  });
  const months = Array.from({ length: 6 }, (_, i) => {
    const s = ubDate(p.year, p.month - 5 + i, 1);
    const e = ubDate(p.year, p.month - 4 + i, 1);
    const sp = ubParts(s);
    return { key: s.toISOString(), label: `${sp.month}-р сар`, value: users.filter((u) => u.createdAt >= s && u.createdAt < e).length };
  });
  const byBiz = new Map<string, { revenue: number; bookings: number }>();
  for (const a of appts) {
    const r = byBiz.get(a.businessId) ?? { revenue: 0, bookings: 0 };
    r.bookings++;
    if (a.status === "COMPLETED") r.revenue += a.price;
    byBiz.set(a.businessId, r);
  }
  const top = [...byBiz.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6);
  const total = weeks.reduce((n, w) => n + w.revenue, 0);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Тайлан" description="Сүүлийн 8 долоо хоногийн платформын захиалга, орлого." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="8 долоо хоногийн захиалга" value={String(weeks.reduce((n, w) => n + w.bookings, 0))} />
        <StatCard label="Бизнесүүдийн орлого" value={formatMoney(total)} hint="дууссан үйлчилгээгээр" />
        <StatCard label="Захиалгатай бизнес" value={String(byBiz.size)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Долоо хоног тутмын захиалга" />
          <div className="p-5">
            <BarChart data={weeks.map((w) => ({ key: w.key, label: w.label, value: w.bookings, secondary: w.revenue }))} format="count" valueLabel="Захиалга" secondaryLabel="Орлого (₮)" highlightLast />
          </div>
        </Card>
        <Card>
          <CardHeader title="Шинэ хэрэглэгч" description="Сар бүрээр" />
          <div className="p-5">
            <BarChart data={months} format="count" valueLabel="Хэрэглэгч" highlightLast />
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Орлогоор тэргүүлэгч бизнесүүд" description="Сүүлийн 8 долоо хоног" />
        <div className="p-5">
          <HBars rows={top.map(([id, v]) => ({ key: id, label: businesses.find((b) => b.id === id)?.name ?? "", value: v.revenue || v.bookings, display: formatMoney(v.revenue), sub: `${v.bookings} захиалга` }))} />
        </div>
      </Card>
    </div>
  );
}
