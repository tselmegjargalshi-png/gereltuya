import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { BookingActions } from "@/components/app/booking-actions";
import { formatDuration, formatLongDate, formatMoney, formatTime } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import type { AppointmentStatus } from "@prisma/client";

export type CardAppointment = {
  id: string;
  startAt: Date;
  price: number;
  status: AppointmentStatus;
  hasReview: boolean;
  business: { slug: string; name: string; address: string };
  service: { id: string; name: string; durationMin: number };
  staff: { id: string; name: string; photoUrl: string | null };
};

export function AppointmentCard({ a, cancelWindowHours = 3 }: { a: CardAppointment; cancelWindowHours?: number }) {
  const upcoming = a.startAt.getTime() > Date.now();
  const active = a.status === "CONFIRMED" || a.status === "PENDING";
  const locked = a.startAt.getTime() - Date.now() < cancelWindowHours * 3600_000;
  return (
    <article className="rounded-[16px] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/app/b/${a.business.slug}`} className="text-[13px] font-semibold tracking-wide text-stone hover:text-accent">
            {a.business.name}
          </Link>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug">{a.service.name}</h3>
        </div>
        <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
        <div>
          <dt className="text-[12px] text-mute">Огноо</dt>
          <dd className="mt-0.5 font-medium">{formatLongDate(a.startAt)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-mute">Цаг</dt>
          <dd className="mt-0.5 font-medium tabular">{formatTime(a.startAt)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-mute">Мэргэжилтэн</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-medium">
            <Avatar name={a.staff.name} src={a.staff.photoUrl} size={22} />
            {a.staff.name}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-mute">Үнэ</dt>
          <dd className="mt-0.5 font-semibold tabular">{formatMoney(a.price)}</dd>
        </div>
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-mute">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {formatDuration(a.service.durationMin)}
        <MapPin className="ml-2 h-3.5 w-3.5" aria-hidden />
        <span className="truncate">{a.business.address}</span>
      </p>
      <BookingActions
        appointmentId={a.id}
        canChange={upcoming && active}
        locked={locked}
        cancelWindowHours={cancelWindowHours}
        canReview={a.status === "COMPLETED" && !a.hasReview}
      />
    </article>
  );
}
