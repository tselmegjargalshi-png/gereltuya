import type { Metadata } from "next";
import Link from "next/link";
import type { BusinessStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BUSINESS_STATUS_LABEL } from "@/lib/labels";
import { formatDateDots } from "@/lib/format";
import { effectivePlan } from "@/lib/plans";
import { PageHeader } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { BusinessStatusButtons } from "@/components/admin/admin-controls";
import { Pager, SearchBox, Tabs } from "@/components/admin/filter-bar";

export const metadata: Metadata = { title: "Бизнесүүд" };
const PAGE = 20;
const STATUSES: BusinessStatus[] = ["PENDING", "ACTIVE", "SUSPENDED"];

export default async function AdminBusinesses({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.BusinessWhereInput = { ...(status ? { status } : {}), ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) };
  const [total, rows] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { owner: { select: { name: true, email: true } }, subscription: true, _count: { select: { appointments: true, staff: true } } },
    }),
  ]);
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch });
    return `/admin/businesses?${p.toString()}`;
  };
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Бизнесүүд" description={`Нийт ${total} бизнес.`} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs label="Төлөв" current={status ?? ""} hrefFor={(v) => (v ? `/admin/businesses?status=${v}` : "/admin/businesses")} items={[{ value: "", label: "Бүгд" }, ...STATUSES.map((s) => ({ value: s, label: BUSINESS_STATUS_LABEL[s] }))]} />
        <SearchBox action="/admin/businesses" hidden={{ status: status ?? "" }} q={q} placeholder="Бизнесийн нэр" />
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {rows.length === 0 ? <li className="p-8 text-center text-sm text-stone">Бизнес олдсонгүй.</li> : null}
        {rows.map((b) => (
          <li key={b.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                <Link href={`/b/${b.slug}`} className="hover:text-accent" target="_blank">{b.name}</Link>
                <Badge tone={b.status === "ACTIVE" ? "success" : b.status === "PENDING" ? "warning" : "danger"}>{BUSINESS_STATUS_LABEL[b.status]}</Badge>
                <Badge>{effectivePlan(b.subscription)}</Badge>
                {!b.onboardingCompleted ? <Badge tone="warning">Бүртгэл дуусаагүй</Badge> : null}
              </p>
              <p className="mt-1 text-[13px] text-stone">{b.district || "Дүүрэг тодорхойгүй"}, бүртгүүлсэн {formatDateDots(b.createdAt)}</p>
            </div>
            <p className="text-[13px] text-stone">
              {b.owner.name}
              <br />
              <span className="text-mute">{b.owner.email}</span>
              <br />
              {b._count.staff} мэргэжилтэн, {b._count.appointments} захиалга
            </p>
            <BusinessStatusButtons id={b.id} status={b.status} />
          </li>
        ))}
      </ul>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => href({ page: String(p) })} />
    </div>
  );
}
