import type { Metadata } from "next";
import Link from "next/link";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { addDays, ubStartOfDay } from "@/lib/time";
import { formatLongDate, formatMoney, formatTime } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { PageHeader } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { AppointmentActions } from "@/components/owner/appointment-actions";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Захиалгууд" };

const WHEN = [
  { value: "upcoming", label: "Ирэх" },
  { value: "today", label: "Өнөөдөр" },
  { value: "past", label: "Өмнөх" },
  { value: "all", label: "Бүгд" },
] as const;
const STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
const PAGE = 25;

export default async function OwnerAppointments({ searchParams }: { searchParams: Promise<{ when?: string; status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { business } = await requireOwnerBusiness();
  const when = WHEN.some((w) => w.value === sp.when) ? sp.when! : "upcoming";
  const status = STATUSES.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const dayStart = ubStartOfDay(now);

  const where: Prisma.AppointmentWhereInput = {
    businessId: business.id,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ customer: { name: { contains: q, mode: "insensitive" } } }, { customer: { phone: { contains: q } } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    ...(when === "today" ? { startAt: { gte: dayStart, lt: addDays(dayStart, 1) } } : when === "upcoming" ? { startAt: { gte: now } } : when === "past" ? { startAt: { lt: now } } : {}),
  };

  const [total, rows] = await Promise.all([
    db.appointment.count({ where }),
    db.appointment.findMany({
      where,
      orderBy: { startAt: when === "past" || when === "all" ? "desc" : "asc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { service: { select: { name: true } }, staff: { select: { name: true } }, customer: { select: { name: true, phone: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { when, status: status ?? "", q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/owner/appointments?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Захиалгууд" description={`Нийт ${total} захиалга.`} actions={<ButtonLink href="/owner/calendar" size="sm">Цаг нэмэх</ButtonLink>} />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Хугацаа" className="flex gap-1 overflow-x-auto rounded-full bg-ivory p-1">
          {WHEN.map((w) => (
            <Link key={w.value} href={href({ when: w.value, page: undefined })} aria-current={w.value === when ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium", w.value === when ? "bg-ink text-paper" : "text-stone hover:text-ink")}>
              {w.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/owner/appointments">
          <input type="hidden" name="when" value={when} />
          <select name="status" defaultValue={status ?? ""} aria-label="Төлөв" className="h-10 rounded-full border border-sand bg-surface px-4 text-[13px]">
            <option value="">Бүх төлөв</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Нэр, утас, код" aria-label="Хайх" className="h-10 w-40 rounded-full border border-sand bg-surface px-4 text-[13px] md:w-52" />
          <button className="h-10 rounded-full bg-ink px-4 text-[13px] font-medium text-paper">Хайх</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-8 w-8" aria-hidden />} title="Захиалга олдсонгүй." description="Шүүлтүүрээ өөрчлөөд үзнэ үү." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
          {rows.map((a) => (
            <li key={a.id} className="grid gap-3 p-4 md:grid-cols-[150px_1fr_auto] md:items-center">
              <div>
                <p className="text-[14px] font-semibold">{formatLongDate(a.startAt)}</p>
                <p className="text-[13px] text-stone tabular">
                  {formatTime(a.startAt)} - {formatTime(a.endAt)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">
                  {a.customer.name} <span className="font-normal text-stone">· {a.service.name}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-stone">
                  <span>{a.staff.name}</span>
                  <span className="tabular">{a.customer.phone}</span>
                  <span className="tabular">{formatMoney(a.price)}</span>
                  <span className="tabular text-mute">{a.code}</span>
                  {a.source === "MANUAL" ? <Badge>Гараар</Badge> : null}
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </p>
              </div>
              <AppointmentActions id={a.id} status={a.status} customerName={a.customer.name} />
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
