import type { Metadata } from "next";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { formatDateDots, formatMoney, formatTime } from "@/lib/format";
import { PageHeader } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { Pager, SearchBox, Tabs } from "@/components/admin/filter-bar";

export const metadata: Metadata = { title: "Захиалгууд" };
const PAGE = 25;
const STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.AppointmentWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { business: { name: { contains: q, mode: "insensitive" } } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { business: { select: { name: true } }, service: { select: { name: true } }, staff: { select: { name: true } }, customer: { select: { name: true } } },
    }),
  ]);
  const href = (patch: Record<string, string>) => `/admin/bookings?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch }).toString()}`;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Захиалгууд" description={`Нийт ${total.toLocaleString("en-US")} захиалга.`} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs label="Төлөв" current={status ?? ""} hrefFor={(v) => (v ? `/admin/bookings?status=${v}` : "/admin/bookings")} items={[{ value: "", label: "Бүгд" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]} />
        <SearchBox action="/admin/bookings" hidden={{ status: status ?? "" }} q={q} placeholder="Код, бизнес, үйлчлүүлэгч" />
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {rows.length === 0 ? <li className="p-8 text-center text-sm text-stone">Захиалга олдсонгүй.</li> : null}
        {rows.map((a) => (
          <li key={a.id} className="grid gap-2 p-4 md:grid-cols-[140px_1fr_auto] md:items-center">
            <p className="text-[14px] font-semibold tabular">
              {formatDateDots(a.startAt)} <span className="font-normal text-stone">{formatTime(a.startAt)}</span>
            </p>
            <p className="min-w-0 text-[14px]">
              <span className="font-medium">{a.business.name}</span> <span className="text-stone">· {a.service.name}, {a.staff.name}</span>
              <br />
              <span className="text-[13px] text-stone">{a.customer.name} · {a.code}</span>
            </p>
            <p className="flex items-center gap-3">
              <span className="text-[14px] font-semibold tabular">{formatMoney(a.price)}</span>
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            </p>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => href({ page: String(p) })} />
    </div>
  );
}
