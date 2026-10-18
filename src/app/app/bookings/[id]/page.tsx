import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { BookingActions } from "@/components/app/booking-actions";
import { ReviewForm } from "@/components/app/review-form";
import { buttonClass } from "@/components/ui/button";
import { formatDuration, formatLongDate, formatMoney, formatTime } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { addMinutes } from "@/lib/time";

export const metadata: Metadata = { title: "Захиалгын дэлгэрэнгүй" };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  const [{ id }, { success }, user] = await Promise.all([params, searchParams, requireUser()]);
  const a = await db.appointment.findFirst({
    where: { id, userId: user.id },
    include: {
      business: { include: { bookingRule: true } },
      service: true,
      staff: true,
      review: true,
    },
  });
  if (!a) notFound();

  const active = a.status === "CONFIRMED" || a.status === "PENDING";
  const upcoming = a.startAt.getTime() > Date.now();
  const rule = a.business.bookingRule;
  const locked = a.startAt.getTime() - Date.now() < (rule?.cancelWindowHours ?? 3) * 3600_000;
  const calendarHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(a.code, a.service.name, a.business.name, a.business.address, a.startAt, a.endAt))}`;

  return (
    <div className="container-page max-w-3xl py-6 md:py-10">
      <Link href="/app/bookings" className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Миний захиалгууд
      </Link>

      {success ? (
        <div role="status" className="mt-6 rounded-[20px] bg-ink p-7 text-paper">
          <CheckCircle2 className="h-8 w-8 text-[#b9d3c1]" aria-hidden />
          <h1 className="mt-4 font-display text-[2rem] leading-tight md:text-[2.6rem]">Захиалга амжилттай баталгаажлаа.</h1>
          <p className="mt-2 text-paper/70">Захиалгын дугаар: <span className="font-semibold tabular text-paper">{a.code}</span></p>
        </div>
      ) : (
        <div className="mt-6 flex items-start justify-between gap-4">
          <h1 className="font-display text-[2.2rem] leading-tight md:text-[3rem]">{a.service.name}</h1>
          <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
        </div>
      )}

      <section aria-label="Захиалгын мэдээлэл" className="mt-6 rounded-[18px] border border-line bg-surface p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          {[
            ["Бизнес", a.business.name],
            ["Үйлчилгээ", a.service.name],
            ["Мэргэжилтэн", a.staff.name],
            ["Огноо", formatLongDate(a.startAt)],
            ["Цаг", `${formatTime(a.startAt)} – ${formatTime(addMinutes(a.startAt, a.service.durationMin))}`],
            ["Үргэлжлэх хугацаа", formatDuration(a.service.durationMin)],
            ["Үнэ", formatMoney(a.price)],
            ["Төлөв", STATUS_LABEL[a.status]],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[12px] text-mute">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 space-y-2 border-t border-line pt-5 text-[14px]">
          <p className="flex gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
            <span><span className="text-mute">Хаяг: </span>{a.business.address}</span>
          </p>
          <p className="flex gap-2.5">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-stone" aria-hidden />
            <a href={`tel:${a.business.phone.replace(/\s/g, "")}`} className="hover:text-accent">{a.business.phone}</a>
          </p>
        </div>
        {a.note ? <p className="mt-4 rounded-[12px] bg-ivory p-4 text-sm text-stone">Таны тэмдэглэл: {a.note}</p> : null}
        {a.cancelReason && a.status === "CANCELLED" ? <p className="mt-4 text-sm text-stone">Цуцалсан шалтгаан: {a.cancelReason}</p> : null}
        <BookingActions
          appointmentId={a.id}
          canChange={upcoming && active}
          locked={locked}
          cancelWindowHours={rule?.cancelWindowHours ?? 3}
          showDetails={false}
        />
        {upcoming && active ? (
          <a href={calendarHref} download={`gereltuya-${a.code}.ics`} className={buttonClass("ghost", "sm", "mt-2")}>
            Календарьт нэмэх
          </a>
        ) : null}
      </section>

      {rule?.cancellationPolicy ? (
        <p className="mt-4 rounded-[14px] bg-ivory p-4 text-[13px] leading-relaxed text-stone">
          <span className="font-medium text-ink">Цуцлах нөхцөл: </span>
          {rule.cancellationPolicy}
        </p>
      ) : null}

      {a.status === "COMPLETED" ? (
        <section id="review" aria-labelledby="rv" className="mt-10 scroll-mt-24">
          <h2 id="rv" className="font-display text-3xl">Үнэлгээ</h2>
          {a.review ? (
            <div className="mt-4 rounded-[16px] border border-line bg-surface p-5">
              <Rating value={a.review.rating} />
              {a.review.comment ? <p className="mt-3 text-[15px]">{a.review.comment}</p> : null}
            </div>
          ) : (
            <div className="mt-4 rounded-[16px] border border-line bg-surface p-5">
              <p className="mb-4 text-sm text-stone">Танд үйлчилсэн {a.staff.name}-г үнэлнэ үү.</p>
              <ReviewForm appointmentId={a.id} />
            </div>
          )}
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app/bookings" className={buttonClass("outline", "md")}>
          Бүх захиалга
        </Link>
        <Link href={`/app/b/${a.business.slug}`} className={buttonClass("ghost", "md")}>
          Салоны хуудас
        </Link>
      </div>
    </div>
  );
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function buildIcs(code: string, service: string, business: string, address: string, start: Date, end: Date) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GERELTUYA//MN",
    "BEGIN:VEVENT",
    `UID:${code}@gereltuya`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${service} | ${business}`,
    `LOCATION:${address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
