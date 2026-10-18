import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";
import { parseRange, rangeBounds } from "@/server/analytics";
import { STATUS_LABEL } from "@/lib/labels";
import { formatDateDots, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  // Neutralise spreadsheet formulas and quote anything with separators.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const { business } = await requireOwnerBusiness();
  if (!PLANS[effectivePlan(business.subscription)].modules.analytics) return new Response("PRO багц шаардлагатай.", { status: 403 });
  const range = parseRange(new URL(req.url).searchParams.get("range"));
  const { from, to } = rangeBounds(range);
  const rows = await db.appointment.findMany({
    where: { businessId: business.id, startAt: { gte: from, lt: to } },
    orderBy: { startAt: "asc" },
    include: { service: { select: { name: true } }, staff: { select: { name: true } }, customer: { select: { name: true, phone: true } } },
  });
  const header = ["Код", "Огноо", "Цаг", "Үйлчлүүлэгч", "Утас", "Үйлчилгээ", "Мэргэжилтэн", "Үнэ", "Төлөв"];
  const lines = [header, ...rows.map((a) => [a.code, formatDateDots(a.startAt), formatTime(a.startAt), a.customer.name, a.customer.phone, a.service.name, a.staff.name, a.price, STATUS_LABEL[a.status]])];
  const body = "﻿" + lines.map((l) => l.map(cell).join(",")).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gereltuya-tailan-${range}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
