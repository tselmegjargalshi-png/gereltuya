import type { Metadata } from "next";
import type { ReviewStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { REVIEW_STATUS_LABEL } from "@/lib/labels";
import { formatDateDots } from "@/lib/format";
import { PageHeader } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { ReviewButtons } from "@/components/admin/admin-controls";
import { Pager, Tabs } from "@/components/admin/filter-bar";

export const metadata: Metadata = { title: "Үнэлгээ" };
const PAGE = 20;
const STATUSES: ReviewStatus[] = ["VISIBLE", "FLAGGED", "HIDDEN"];

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = status ? { status } : {};
  const [total, rows] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { business: { select: { name: true } }, user: { select: { name: true } }, staff: { select: { name: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Үнэлгээ" description="Тохиромжгүй сэтгэгдлийг нууж болно. Нуусан үнэлгээ дундаж оноонд тооцогдохгүй." />
      <div className="mb-5">
        <Tabs label="Төлөв" current={status ?? ""} hrefFor={(v) => (v ? `/admin/reviews?status=${v}` : "/admin/reviews")} items={[{ value: "", label: "Бүгд" }, ...STATUSES.map((s) => ({ value: s, label: REVIEW_STATUS_LABEL[s] }))]} />
      </div>
      <ul className="space-y-3">
        {rows.length === 0 ? <li className="rounded-[14px] border border-dashed border-sand p-8 text-center text-sm text-stone">Үнэлгээ олдсонгүй.</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="rounded-[16px] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px]">
                <span className="font-semibold">{r.user.name}</span> <span className="text-stone">→ {r.business.name}{r.staff ? `, ${r.staff.name}` : ""}</span>
              </p>
              <div className="flex items-center gap-2">
                <Rating value={r.rating} />
                <Badge tone={r.status === "VISIBLE" ? "success" : r.status === "FLAGGED" ? "warning" : "neutral"}>{REVIEW_STATUS_LABEL[r.status]}</Badge>
              </div>
            </div>
            <p className="mt-3 text-[14px] text-charcoal">{r.comment || "Сэтгэгдэл бичээгүй."}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12px] text-mute tabular">{formatDateDots(r.createdAt)}</span>
              <ReviewButtons id={r.id} status={r.status} />
            </div>
          </li>
        ))}
      </ul>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => `/admin/reviews?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) }).toString()}`} />
    </div>
  );
}
