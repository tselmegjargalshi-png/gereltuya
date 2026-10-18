import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateDots, formatMoney } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Төлбөр" };

export default async function AdminPayments() {
  const [payments, subs, paid] = await Promise.all([
    db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { business: { select: { name: true } } } }),
    db.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const count = (p: "FREE" | "PRO" | "BUSINESS") => subs.find((s) => s.plan === p)?._count._all ?? 0;
  const mrr = count("PRO") * PLANS.PRO.price + count("BUSINESS") * PLANS.BUSINESS.price;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Төлбөр" description="Багцын захиалга, төлбөрийн түүх." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="FREE багц" value={String(count("FREE"))} />
        <StatCard label="PRO багц" value={String(count("PRO"))} />
        <StatCard label="BUSINESS багц" value={String(count("BUSINESS"))} />
        <StatCard label="Сарын тооцоолсон орлого" value={formatMoney(mrr)} hint="идэвхтэй багцаар" />
      </div>
      <Card className="mt-6">
        <CardHeader title="Сүүлийн төлбөрүүд" description={`Нийт төлөгдсөн ${formatMoney(paid._sum.amount ?? 0)}, ${paid._count._all} гүйлгээ`} />
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone">Төлбөр бүртгэгдээгүй байна.</p>
        ) : (
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                <span className="w-24 tabular text-stone">{formatDateDots(p.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{p.business.name}</span>
                <Badge>{p.plan}</Badge>
                <Badge tone={p.status === "PAID" ? "success" : p.status === "FAILED" ? "danger" : "warning"}>{p.status === "PAID" ? "Төлөгдсөн" : p.status === "FAILED" ? "Амжилтгүй" : p.status === "REFUNDED" ? "Буцаасан" : "Хүлээгдэж буй"}</Badge>
                <span className="w-28 text-right font-semibold tabular">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-[12.5px] text-mute">Төлбөрийн үйлчилгээ холбогдоогүй тул гүйлгээнүүд туршилтын горимд бүртгэгдэнэ.</p>
    </div>
  );
}
