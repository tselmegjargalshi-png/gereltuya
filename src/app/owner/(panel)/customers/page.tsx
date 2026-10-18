import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { formatDateDots, formatMoney } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/owner/page-header";
import { PlanGate } from "@/components/owner/plan-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Үйлчлүүлэгчид" };

const SORTS = [
  { value: "recent", label: "Сүүлд ирсэн" },
  { value: "spend", label: "Их зарцуулсан" },
  { value: "visits", label: "Олон ирсэн" },
] as const;
const PAGE = 30;

export default async function OwnerCustomers({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams;
  const { business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  if (!PLANS[plan].modules.crm) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Үйлчлүүлэгчид" />
        <PlanGate title="Үйлчлүүлэгчийн бүртгэл PRO багцад нээлттэй" description="Үйлчлүүлэгч бүрийн ирсэн түүх, зарцуулсан дүн, дуртай үйлчилгээг нэг дор харна." />
      </div>
    );
  }
  const q = (sp.q ?? "").trim();
  const sort = SORTS.find((s) => s.value === sp.sort)?.value ?? "recent";
  const page = Math.max(1, Number(sp.page) || 1);

  const customers = await db.customer.findMany({
    where: { businessId: business.id, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) },
    include: { appointments: { select: { status: true, price: true, startAt: true, service: { select: { name: true } } }, orderBy: { startAt: "desc" } } },
  });

  const now = Date.now();
  const rows = customers
    .map((c) => {
      const counted = c.appointments.filter((a) => a.status !== "CANCELLED");
      const done = c.appointments.filter((a) => a.status === "COMPLETED");
      const past = counted.filter((a) => a.startAt.getTime() <= now);
      const upcoming = counted.filter((a) => a.startAt.getTime() > now).sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
      const tally = new Map<string, number>();
      for (const a of done) tally.set(a.service.name, (tally.get(a.service.name) ?? 0) + 1);
      const favorite = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        total: counted.length,
        spend: done.reduce((s, a) => s + a.price, 0),
        last: past[0]?.startAt ?? null,
        upcoming: upcoming?.startAt ?? null,
        favorite,
        recent: c.appointments.slice(0, 5),
      };
    })
    .sort((a, b) => (sort === "spend" ? b.spend - a.spend : sort === "visits" ? b.total - a.total : (b.last?.getTime() ?? 0) - (a.last?.getTime() ?? 0)));

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);
  const repeat = rows.filter((r) => r.total >= 2).length;
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), sort, ...patch });
    return `/owner/customers?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Үйлчлүүлэгчид" description="Үйлчлүүлэгч бүрийн ирсэн түүх, зарцуулсан дүн." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Нийт үйлчлүүлэгч" value={String(rows.length)} />
        <StatCard label="Эргэн ирсэн" value={String(repeat)} hint={rows.length ? `${Math.round((repeat / rows.length) * 100)}%` : undefined} />
        <StatCard label="Нийт зарцуулалт" value={formatMoney(rows.reduce((s, r) => s + r.spend, 0))} hint="Дууссан үйлчилгээгээр" />
      </div>

      <div className="my-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Эрэмбэлэх" className="flex gap-1 overflow-x-auto rounded-full bg-ivory p-1">
          {SORTS.map((s) => (
            <Link key={s.value} href={href({ sort: s.value })} aria-current={s.value === sort ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium", s.value === sort ? "bg-ink text-paper" : "text-stone hover:text-ink")}>
              {s.label}
            </Link>
          ))}
        </nav>
        <form action="/owner/customers" className="flex gap-2">
          <input type="hidden" name="sort" value={sort} />
          <input name="q" defaultValue={q} placeholder="Нэр эсвэл утас" aria-label="Хайх" className="h-10 w-48 rounded-full border border-sand bg-surface px-4 text-[13px]" />
          <button className="h-10 rounded-full bg-ink px-4 text-[13px] font-medium text-paper">Хайх</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" aria-hidden />} title={q ? "Үйлчлүүлэгч олдсонгүй." : "Үйлчлүүлэгч бүртгэгдээгүй байна."} description="Анхны захиалга орж ирэхэд үйлчлүүлэгч автоматаар бүртгэгдэнэ." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
          {visible.map((r) => (
            <li key={r.id}>
              <details className="group">
                <summary className="grid cursor-pointer list-none gap-2 p-4 hover:bg-ivory/50 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_1fr] md:items-center [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{r.name}</p>
                    <p className="text-[13px] text-stone tabular">{r.phone}</p>
                  </div>
                  <p className="text-[14px]">
                    <span className="font-semibold tabular">{r.total}</span> <span className="text-stone">бүртгэл</span>
                  </p>
                  <p className="text-[14px] font-semibold tabular">{formatMoney(r.spend)}</p>
                  <p className="text-[13px] text-stone">{r.last ? `Сүүлд: ${formatDateDots(r.last)}` : "Ирээгүй"}</p>
                  <p className="truncate text-[13px] text-stone">{r.favorite ?? "Дуртай үйлчилгээ тодорхойгүй"}</p>
                </summary>
                <div className="border-t border-line bg-ivory/40 px-4 py-4">
                  {r.upcoming ? <p className="mb-3 text-[13px]">Ирэх захиалга: <span className="font-medium tabular">{formatDateDots(r.upcoming)}</span></p> : null}
                  <ul className="space-y-1.5 text-[13px]">
                    {r.recent.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-3">
                        <span className="tabular text-stone">{formatDateDots(a.startAt)}</span>
                        <span className="min-w-0 flex-1 truncate">{a.service.name}</span>
                        <Badge>{STATUS_LABEL[a.status]}</Badge>
                        <span className="w-24 text-right tabular">{formatMoney(a.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Хуудаслалт">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="font-medium text-accent">Өмнөх</Link> : <span />}
          <span className="text-stone tabular">{page} / {pages}</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="font-medium text-accent">Дараах</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
