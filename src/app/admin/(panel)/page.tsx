import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { addDays, ubStartOfDay, ubStartOfMonth } from "@/lib/time";
import { formatDateDots, formatMoney } from "@/lib/format";
import { ubParts } from "@/lib/time";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { BusinessStatusButtons } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Хянах самбар" };

export default async function AdminDashboard() {
  const now = new Date();
  const monthStart = ubStartOfMonth(now);
  const from14 = addDays(ubStartOfDay(now), -13);
  const [total, active, pending, users, bookings, paid, newBiz, recent, queue] = await Promise.all([
    db.business.count(),
    db.business.count({ where: { status: "ACTIVE" } }),
    db.business.count({ where: { status: "PENDING", onboardingCompleted: true } }),
    db.user.count(),
    db.appointment.count(),
    db.payment.aggregate({ where: { status: "PAID", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.business.count({ where: { createdAt: { gte: addDays(now, -30) } } }),
    db.appointment.findMany({ where: { startAt: { gte: from14, lt: addDays(now, 1) }, status: { not: "CANCELLED" } }, select: { startAt: true, price: true, status: true } }),
    db.business.findMany({ where: { status: "PENDING", onboardingCompleted: true }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, name: true, district: true, createdAt: true, status: true } }),
  ]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(from14, i));
  const series = days.map((d) => {
    const next = addDays(d, 1);
    const rows = recent.filter((r) => r.startAt >= d && r.startAt < next);
    return { key: d.toISOString(), label: `${ubParts(d).day}`, value: rows.length, secondary: rows.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r.price, 0) };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Хянах самбар" description="Платформын ерөнхий байдал." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Нийт бизнес" value={String(total)} />
        <StatCard label="Идэвхтэй бизнес" value={String(active)} hint={pending ? `${pending} батлагдахыг хүлээж байна` : undefined} />
        <StatCard label="Нийт хэрэглэгч" value={String(users)} />
        <StatCard label="Нийт захиалга" value={bookings.toLocaleString("en-US")} />
        <StatCard label="Сарын орлого" value={formatMoney(paid._sum.amount ?? 0)} hint="Багцын төлбөрөөс" />
        <StatCard label="Шинээр бүртгүүлсэн бизнес" value={String(newBiz)} hint="сүүлийн 30 хоногт" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Сүүлийн 14 хоногийн захиалга" description="Өдөр бүрийн захиалгын тоо" />
          <div className="p-5">
            <BarChart data={series.map((s) => ({ key: s.key, label: s.label, value: s.value, secondary: s.secondary }))} format="count" valueLabel="Захиалга" secondaryLabel="Орлого (₮)" highlightLast />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Батлахыг хүлээж буй" action={<Link href="/admin/businesses?status=PENDING" className="text-[13px] font-medium text-accent hover:underline">Бүгд</Link>} />
          {queue.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone">Хүлээгдэж буй бизнес алга.</p>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((b) => (
                <li key={b.id} className="space-y-2 px-5 py-4">
                  <p className="text-[14px] font-medium">{b.name}</p>
                  <p className="text-[12px] text-mute">{b.district || "Дүүрэг тодорхойгүй"}, {formatDateDots(b.createdAt)}</p>
                  <BusinessStatusButtons id={b.id} status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
