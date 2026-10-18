import type { Metadata } from "next";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { delta, getAnalytics, parseRange, RANGE_LABEL } from "@/server/analytics";
import { formatMoney } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { PlanGate } from "@/components/owner/plan-gate";
import { RangeTabs } from "@/components/owner/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { HBars } from "@/components/charts/h-bars";
import { HourHeat } from "@/components/charts/hour-heat";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Орлого" };

export default async function OwnerRevenue({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const { business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  if (!PLANS[plan].modules.analytics) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Орлого" />
        <PlanGate title="Орлогын статистик PRO багцад нээлттэй" description="Өдөр, 7 хоног, сар, жилээр орлого, шилдэг үйлчилгээ, ачаалал ихтэй цагийг харна." />
      </div>
    );
  }
  const range = parseRange(sp.range);
  const a = await getAnalytics({ businessId: business.id }, range);
  const compare = range === "today" ? "өчигдөртэй" : range === "week" ? "өмнөх 7 хоногтой" : range === "month" ? "өмнөх сартай" : "өмнөх жилтэй";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Орлого" description={`${RANGE_LABEL[range]}, дууссан үйлчилгээний дүнгээр тооцсон.`} actions={<RangeTabs value={range} basePath="/owner/revenue" />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Нийт орлого" value={formatMoney(a.revenue)} delta={{ value: delta(a.revenue, a.previousRevenue) }} hint={compare + " харьцуулбал"} />
        <StatCard label="Захиалга" value={String(a.bookings)} delta={{ value: delta(a.bookings, a.previousBookings) }} hint={`${a.completed} дууссан`} />
        <StatCard label="Дундаж дүн" value={formatMoney(a.avgOrder)} hint="нэг захиалгад" />
        <StatCard label="Хүлээгдэж буй" value={formatMoney(a.expectedRevenue)} hint="баталгаажсан, дуусаагүй" />
        <StatCard label="Шинэ үйлчлүүлэгч" value={String(a.newCustomers)} />
        <StatCard label="Эргэн ирсэн" value={String(a.returningCustomers)} />
        <StatCard label="Цуцлагдсан" value={String(a.cancelled)} hint={`${(a.cancellationRate * 100).toFixed(0)}%`} />
        <StatCard label="Нийт хүсэлт" value={String(a.bookings + a.cancelled)} />
      </div>
      <Card className="mt-6">
        <CardHeader title="Орлогын график" description={RANGE_LABEL[range]} />
        <div className="p-5">
          <BarChart data={a.series.map((s) => ({ key: s.key, label: s.label, value: s.revenue, secondary: s.bookings }))} highlightLast={range !== "year"} />
        </div>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Шилдэг үйлчилгээ" description="Орлогоор" />
          <div className="p-5">
            <HBars rows={a.topServices.map((s) => ({ key: s.id, label: s.name, value: s.revenue || s.bookings, display: formatMoney(s.revenue), sub: `${s.bookings} захиалга` }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Шилдэг мэргэжилтэн" description="Орлогоор" />
          <div className="p-5">
            <HBars rows={a.topStaff.map((s) => ({ key: s.id, label: s.name, value: s.revenue || s.bookings, display: formatMoney(s.revenue), sub: `${s.bookings} захиалга` }))} />
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Ачаалал ихтэй цаг" description="Захиалгын тоогоор" />
        <div className="p-5">
          <HourHeat hours={a.peakHours} />
        </div>
      </Card>
    </div>
  );
}
