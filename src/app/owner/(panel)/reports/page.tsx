import type { Metadata } from "next";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { delta, getAnalytics, parseRange, RANGE_LABEL } from "@/server/analytics";
import { formatMoney } from "@/lib/format";
import { ubDate, ubParts } from "@/lib/time";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { PlanGate } from "@/components/owner/plan-gate";
import { RangeTabs } from "@/components/owner/range-tabs";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Тайлан" };

export default async function OwnerReports({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const { business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  const modules = PLANS[plan].modules;
  if (!modules.analytics) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Тайлан" />
        <PlanGate title="Тайлан PRO багцад нээлттэй" description="Үйлчилгээ, мэргэжилтнээр задалсан тайлан, CSV татах боломж." />
      </div>
    );
  }
  const range = parseRange(sp.range);
  const a = await getAnalytics({ businessId: business.id }, range);

  let months: { label: string; revenue: number; bookings: number; cancelled: number }[] = [];
  if (modules.advancedReports) {
    const p = ubParts(new Date());
    const start = ubDate(p.year, p.month - 5, 1);
    const rows = await db.appointment.findMany({ where: { businessId: business.id, startAt: { gte: start } }, select: { startAt: true, price: true, status: true } });
    months = Array.from({ length: 6 }, (_, i) => {
      const s = ubDate(p.year, p.month - 5 + i, 1);
      const e = ubDate(p.year, p.month - 4 + i, 1);
      const inM = rows.filter((r) => r.startAt >= s && r.startAt < e);
      const sp2 = ubParts(s);
      return {
        label: `${sp2.year}.${String(sp2.month).padStart(2, "0")}`,
        revenue: inM.filter((r) => r.status === "COMPLETED").reduce((n, r) => n + r.price, 0),
        bookings: inM.filter((r) => r.status !== "CANCELLED").length,
        cancelled: inM.filter((r) => r.status === "CANCELLED").length,
      };
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Тайлан"
        description={`${RANGE_LABEL[range]}, үйлчилгээ болон мэргэжилтнээр.`}
        actions={
          <>
            <RangeTabs value={range} basePath="/owner/reports" />
            <ButtonLink href={`/owner/reports/export?range=${range}`} variant="outline" size="sm" prefetch={false}>
              <Download className="h-4 w-4" aria-hidden />
              CSV татах
            </ButtonLink>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Орлого" value={formatMoney(a.revenue)} delta={{ value: delta(a.revenue, a.previousRevenue) }} />
        <StatCard label="Захиалга" value={String(a.bookings)} delta={{ value: delta(a.bookings, a.previousBookings) }} />
        <StatCard label="Дундаж дүн" value={formatMoney(a.avgOrder)} />
        <StatCard label="Цуцлалтын хувь" value={`${(a.cancellationRate * 100).toFixed(0)}%`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ReportTable title="Үйлчилгээгээр" rows={a.topServices.map((s) => ({ key: s.id, name: s.name, bookings: s.bookings, revenue: s.revenue }))} />
        <ReportTable title="Мэргэжилтнээр" rows={a.topStaff.map((s) => ({ key: s.id, name: s.name, bookings: s.bookings, revenue: s.revenue }))} />
      </div>
      {modules.advancedReports ? (
        <Card className="mt-6">
          <CardHeader title="Сүүлийн 6 сар" description="BUSINESS багцын өргөтгөсөн тайлан" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[12px] text-mute">
                <tr>
                  <th className="px-5 py-3 font-medium">Сар</th>
                  <th className="px-5 py-3 text-right font-medium">Захиалга</th>
                  <th className="px-5 py-3 text-right font-medium">Цуцлагдсан</th>
                  <th className="px-5 py-3 text-right font-medium">Орлого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {months.map((m) => (
                  <tr key={m.label}>
                    <td className="px-5 py-3 tabular">{m.label}</td>
                    <td className="px-5 py-3 text-right tabular">{m.bookings}</td>
                    <td className="px-5 py-3 text-right tabular">{m.cancelled}</td>
                    <td className="px-5 py-3 text-right font-medium tabular">{formatMoney(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <p className="mt-6 rounded-[14px] bg-ivory px-5 py-4 text-sm text-stone">Сараар харьцуулсан өргөтгөсөн тайлан BUSINESS багцад нээлттэй.</p>
      )}
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: { key: string; name: string; bookings: number; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-stone">Энэ хугацаанд мэдээлэл алга.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-[12px] text-mute">
            <tr>
              <th className="px-5 py-3 font-medium">Нэр</th>
              <th className="px-5 py-3 text-right font-medium">Захиалга</th>
              <th className="px-5 py-3 text-right font-medium">Орлого</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-5 py-3">{r.name}</td>
                <td className="px-5 py-3 text-right tabular">{r.bookings}</td>
                <td className="px-5 py-3 text-right font-medium tabular">{formatMoney(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
