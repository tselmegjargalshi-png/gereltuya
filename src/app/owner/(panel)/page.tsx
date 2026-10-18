import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, Clock3 } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { getAnalytics, delta } from "@/server/analytics";
import { addDays, ubStartOfDay } from "@/lib/time";
import { formatMoney, formatTime, formatDayMonth } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentActions } from "@/components/owner/appointment-actions";

export const metadata: Metadata = { title: "Хянах самбар" };

export default async function OwnerDashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { business } = await requireOwnerBusiness();
  const now = new Date();
  const dayStart = ubStartOfDay(now);
  const dayEnd = addDays(dayStart, 1);

  const [today, week, todayStats, next] = await Promise.all([
    db.appointment.findMany({
      where: { businessId: business.id, startAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startAt: "asc" },
      include: { service: { select: { name: true } }, staff: { select: { name: true, photoUrl: true } }, customer: { select: { name: true, phone: true } } },
    }),
    getAnalytics({ businessId: business.id }, "week"),
    getAnalytics({ businessId: business.id }, "today"),
    db.appointment.count({ where: { businessId: business.id, status: { in: ["CONFIRMED", "PENDING"] }, startAt: { gte: dayEnd } } }),
  ]);

  const live = today.filter((a) => a.status !== "CANCELLED");
  const upcomingToday = live.filter((a) => a.endAt > now && (a.status === "CONFIRMED" || a.status === "PENDING"));
  const pending = await db.appointment.count({ where: { businessId: business.id, status: "PENDING", startAt: { gte: now } } });

  return (
    <div className="mx-auto max-w-6xl">
      {welcome ? (
        <div role="status" className="mb-8 flex items-start gap-3 rounded-[16px] border border-success/20 bg-success-soft p-5 text-success">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Таны бизнес захиалга авахад бэлэн боллоо.</p>
            <p className="mt-1 text-sm">
              {business.status === "ACTIVE"
                ? "Хуудас нийтэд харагдаж байна. Эхний захиалгаа хүлээн авахад бэлэн."
                : "Баталгаажуулалт дууссаны дараа хуудас хайлтад харагдана."}
            </p>
          </div>
        </div>
      ) : null}

      <PageHeader
        title="Хянах самбар"
        description={`${formatDayMonth(now)}. ${upcomingToday.length ? `Өнөөдөр хүлээгдэж буй ${upcomingToday.length} захиалга байна.` : "Өнөөдөр хүлээгдэж буй захиалга алга."}`}
        actions={
          <>
            <ButtonLink href="/owner/calendar" variant="primary" size="sm">
              <CalendarPlus className="h-4 w-4" aria-hidden />
              Цаг нэмэх
            </ButtonLink>
            <ButtonLink href={`/b/${business.slug}`} variant="outline" size="sm">
              Хуудсаа харах
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Өнөөдрийн захиалга" value={String(live.length)} hint={`${todayStats.completed} дууссан`} />
        <StatCard label="Өнөөдрийн орлого" value={formatMoney(todayStats.revenue)} hint={todayStats.expectedRevenue ? `+${formatMoney(todayStats.expectedRevenue)} хүлээгдэж буй` : "Дууссан үйлчилгээгээр"} />
        <StatCard label="7 хоногийн орлого" value={formatMoney(week.revenue)} delta={{ value: delta(week.revenue, week.previousRevenue) }} hint="өмнөх 7 хоногтой харьцуулбал" />
        <StatCard label="Шинэ үйлчлүүлэгч" value={String(week.newCustomers)} hint={`7 хоногт, ${week.returningCustomers} эргэн ирсэн`} />
        <StatCard label="Дундаж захиалгын дүн" value={formatMoney(week.avgOrder)} hint="7 хоногийн дундаж" />
        <StatCard label="Цуцлагдсан захиалга" value={String(week.cancelled)} delta={undefined} hint={`7 хоногт, ${(week.cancellationRate * 100).toFixed(0)}%`} />
        <StatCard label="Ирэх захиалга" value={String(next)} hint="маргаашаас хойших" />
        <StatCard label="Баталгаажуулах" value={String(pending)} hint={pending ? "хариу хүлээж буй" : "хүлээгдэж буй захиалга алга"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Сүүлийн 7 хоногийн орлого" description="Дууссан үйлчилгээний дүн" action={<Link href="/owner/revenue" className="text-[13px] font-medium text-accent hover:underline">Дэлгэрэнгүй</Link>} />
          <div className="p-5">
            <BarChart data={week.series.map((s) => ({ key: s.key, label: s.label, value: s.revenue, secondary: s.bookings }))} highlightLast />
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Шилдэг мэргэжилтэн" description="Сүүлийн 7 хоног" />
          <ul className="divide-y divide-line">
            {week.topStaff.length === 0 ? (
              <li className="p-6 text-center text-sm text-stone">Мэдээлэл алга.</li>
            ) : (
              week.topStaff.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={s.name} src={s.photoUrl} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{s.name}</p>
                    <p className="text-[12px] text-mute">{s.bookings} захиалга</p>
                  </div>
                  <p className="text-[14px] font-semibold tabular">{formatMoney(s.revenue)}</p>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="today-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="today-title" className="text-lg font-semibold">
            Өнөөдрийн хуваарь
          </h2>
          <Link href="/owner/appointments" className="text-[13px] font-medium text-accent hover:underline">
            Бүх захиалга
          </Link>
        </div>
        {today.length === 0 ? (
          <EmptyState icon={<Clock3 className="h-8 w-8" aria-hidden />} title="Өнөөдөр захиалга байхгүй байна." description="Шинэ захиалга орж ирэхэд энд харагдана." action={<ButtonLink href="/owner/calendar" size="sm">Календарь нээх</ButtonLink>} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
            {today.map((a) => (
              <li key={a.id} className="grid gap-3 p-4 md:grid-cols-[88px_1fr_auto] md:items-center">
                <p className="text-[17px] font-semibold tabular">{formatTime(a.startAt)}</p>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium">
                    {a.customer.name} <span className="font-normal text-stone">· {a.service.name}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-stone">
                    <span>{a.staff.name}</span>
                    <span className="tabular">{a.customer.phone}</span>
                    <span className="tabular">{formatMoney(a.price)}</span>
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </p>
                </div>
                <AppointmentActions id={a.id} status={a.status} customerName={a.customer.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
