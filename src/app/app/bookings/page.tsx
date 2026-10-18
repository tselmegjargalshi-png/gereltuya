import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { AppointmentCard } from "@/components/app/appointment-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Миний захиалгууд" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, user] = await Promise.all([searchParams, requireUser()]);
  const past = tab === "past";
  const now = new Date();
  const rows = await db.appointment.findMany({
    where: past
      ? { userId: user.id, OR: [{ startAt: { lte: now } }, { status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] } }] }
      : { userId: user.id, startAt: { gt: now }, status: { in: ["CONFIRMED", "PENDING"] } },
    orderBy: { startAt: past ? "desc" : "asc" },
    take: 60,
    include: {
      business: { select: { slug: true, name: true, address: true, bookingRule: { select: { cancelWindowHours: true } } } },
      service: { select: { id: true, name: true, durationMin: true } },
      staff: { select: { id: true, name: true, photoUrl: true } },
      review: { select: { id: true } },
    },
  });

  return (
    <div className="container-page max-w-3xl py-6 md:py-10">
      <h1 className="font-display text-[2.4rem] leading-tight md:text-[3rem]">Миний захиалгууд</h1>
      <div role="tablist" className="mt-6 inline-flex rounded-full bg-ivory p-1">
        {[
          { href: "/app/bookings", label: "Удахгүй", active: !past },
          { href: "/app/bookings?tab=past", label: "Өнгөрсөн", active: past },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={t.active}
            className={cn("rounded-full px-5 py-2 text-sm font-medium transition-colors", t.active ? "bg-ink text-paper" : "text-stone hover:text-ink")}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 className="h-8 w-8" aria-hidden />}
            title={past ? "Өнгөрсөн захиалга алга байна." : "Удахгүй болох захиалга алга байна."}
            description={past ? "Захиалсан үйлчилгээнүүд энд хадгалагдана." : "Өөртөө тохирсон салон, мэргэжилтнээ олоод цаг авна уу."}
            action={!past ? <Link href="/app/search" className={buttonClass("primary", "md")}>Цаг авах</Link> : undefined}
          />
        ) : (
          rows.map((a) => (
            <AppointmentCard
              key={a.id}
              cancelWindowHours={a.business.bookingRule?.cancelWindowHours ?? 3}
              a={{ id: a.id, startAt: a.startAt, price: a.price, status: a.status, hasReview: Boolean(a.review), business: a.business, service: a.service, staff: a.staff }}
            />
          ))
        )}
      </div>
    </div>
  );
}
