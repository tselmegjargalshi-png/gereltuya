import type { Metadata } from "next";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDateDots } from "@/lib/format";
import { PageHeader } from "@/components/owner/page-header";
import { Badge } from "@/components/ui/badge";
import { UserStatusButton } from "@/components/admin/admin-controls";
import { Pager, SearchBox, Tabs } from "@/components/admin/filter-bar";

export const metadata: Metadata = { title: "Хэрэглэгчид" };
const PAGE = 25;
const ROLES: Role[] = ["CUSTOMER", "BUSINESS_OWNER", "STAFF", "ADMIN"];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const role = ROLES.find((r) => r === sp.role);
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = { ...(role ? { role } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) };
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true } }),
  ]);
  const href = (patch: Record<string, string>) => `/admin/users?${new URLSearchParams({ ...(role ? { role } : {}), ...(q ? { q } : {}), ...patch }).toString()}`;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Хэрэглэгчид" description={`Нийт ${total} хэрэглэгч.`} />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs label="Эрх" current={role ?? ""} hrefFor={(v) => (v ? `/admin/users?role=${v}` : "/admin/users")} items={[{ value: "", label: "Бүгд" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]} />
        <SearchBox action="/admin/users" hidden={{ role: role ?? "" }} q={q} placeholder="Нэр, и-мэйл, утас" />
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {rows.length === 0 ? <li className="p-8 text-center text-sm text-stone">Хэрэглэгч олдсонгүй.</li> : null}
        {rows.map((u) => (
          <li key={u.id} className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
                {u.name}
                <Badge>{ROLE_LABEL[u.role]}</Badge>
                {u.status === "SUSPENDED" ? <Badge tone="danger">Түр хаасан</Badge> : null}
              </p>
              <p className="mt-1 truncate text-[13px] text-stone">{u.email}</p>
            </div>
            <p className="text-[13px] text-stone tabular">
              {u.phone ?? "Утас байхгүй"}
              <br />
              Бүртгүүлсэн {formatDateDots(u.createdAt)}
            </p>
            {u.role === "ADMIN" ? <span /> : <UserStatusButton id={u.id} status={u.status} />}
          </li>
        ))}
      </ul>
      <Pager page={page} pages={Math.max(1, Math.ceil(total / PAGE))} hrefFor={(p) => href({ page: String(p) })} />
    </div>
  );
}
