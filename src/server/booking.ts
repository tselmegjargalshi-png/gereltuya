import "server-only";
import type { Appointment, AppointmentSource, AppointmentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAvailableSlots, isSlotFree } from "@/lib/availability";
import { notify } from "@/lib/notifications";
import { MESSAGES } from "@/lib/labels";
import { formatLongDate, formatTime } from "@/lib/format";
import { addMinutes, toDateKey } from "@/lib/time";

export class BookingError extends Error {}

function bookingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "GT-";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type CreateBookingInput = {
  businessId: string;
  serviceId: string;
  staffId?: string | null;
  startAt: Date;
  customer: { userId?: string | null; name: string; phone: string; email?: string | null };
  source?: AppointmentSource;
  note?: string;
  bypassRules?: boolean;
  status?: AppointmentStatus;
};

async function lockStaff(tx: Prisma.TransactionClient, staffId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${staffId}))`;
}

export async function createBooking(input: CreateBookingInput): Promise<Appointment> {
  const service = await db.service.findFirst({
    where: { id: input.serviceId, businessId: input.businessId, active: true, business: { status: "ACTIVE" } },
    include: { business: { include: { bookingRule: true } } },
  });
  if (!service) throw new BookingError(MESSAGES.serviceUnavailable);

  let staffId = input.staffId ?? null;
  if (!staffId) {
    // "Хэн ч байсан болно": choose the free specialist with the lightest day.
    const slots = await getAvailableSlots({
      businessId: input.businessId,
      serviceId: input.serviceId,
      dateKey: toDateKey(input.startAt),
      bypassRules: input.bypassRules,
    });
    const slot = slots.find((s) => s.startAt === input.startAt.toISOString());
    if (!slot) throw new BookingError(MESSAGES.slotTaken);
    const loads = await db.appointment.groupBy({
      by: ["staffId"],
      where: { staffId: { in: slot.staffIds }, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
      _count: { _all: true },
    });
    staffId = [...slot.staffIds].sort(
      (a, b) => (loads.find((l) => l.staffId === a)?._count._all ?? 0) - (loads.find((l) => l.staffId === b)?._count._all ?? 0),
    )[0];
  }

  const endAt = addMinutes(input.startAt, service.durationMin);
  const autoConfirm = service.business.bookingRule?.autoConfirm ?? true;

  const appointment = await db.$transaction(async (tx) => {
    await lockStaff(tx, staffId!);
    const free = await isSlotFree({
      businessId: input.businessId,
      serviceId: input.serviceId,
      staffId: staffId!,
      startAt: input.startAt,
      bypassRules: input.bypassRules,
    });
    if (!free) throw new BookingError(MESSAGES.slotTaken);

    const customer = await tx.customer.upsert({
      where: { businessId_phone: { businessId: input.businessId, phone: input.customer.phone } },
      create: {
        businessId: input.businessId,
        userId: input.customer.userId ?? null,
        name: input.customer.name,
        phone: input.customer.phone,
        email: input.customer.email ?? null,
      },
      update: { userId: input.customer.userId ?? undefined },
    });

    return tx.appointment.create({
      data: {
        code: bookingCode(),
        businessId: input.businessId,
        serviceId: input.serviceId,
        staffId: staffId!,
        customerId: customer.id,
        userId: input.customer.userId ?? null,
        startAt: input.startAt,
        endAt,
        price: service.price,
        status: input.status ?? (autoConfirm ? "CONFIRMED" : "PENDING"),
        source: input.source ?? "ONLINE",
        note: input.note ?? "",
      },
    });
  });

  await notifyBookingCreated(appointment.id).catch(() => undefined);
  return appointment;
}

async function notifyBookingCreated(appointmentId: string) {
  const a = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { name: true, ownerId: true } },
      service: { select: { name: true } },
      customer: { select: { name: true } },
      staff: { select: { userId: true, name: true } },
    },
  });
  if (!a) return;
  const when = `${formatLongDate(a.startAt)}, ${formatTime(a.startAt)}`;
  if (a.userId) {
    await notify({
      userId: a.userId,
      type: "BOOKING_CONFIRMED",
      title: "Захиалга амжилттай баталгаажлаа.",
      body: `${a.business.name}, ${a.service.name}. ${when}.`,
      link: `/app/bookings/${a.id}`,
      channels: ["SMS"],
    });
  }
  if (a.source === "ONLINE") {
    const recipients = new Set([a.business.ownerId, ...(a.staff.userId ? [a.staff.userId] : [])]);
    for (const userId of recipients) {
      await notify({
        userId,
        type: "NEW_BOOKING",
        title: "Шинэ захиалга ирлээ.",
        body: `${a.customer.name} ${a.service.name} захиаллаа. ${when}, ${a.staff.name}.`,
        link: userId === a.business.ownerId ? "/owner/appointments" : "/staff",
      });
    }
  }
}

export async function rescheduleBooking(params: {
  appointmentId: string;
  startAt: Date;
  staffId?: string;
  actor: { kind: "customer"; userId: string } | { kind: "business"; businessId: string };
}): Promise<Appointment> {
  const a = await db.appointment.findUnique({
    where: { id: params.appointmentId },
    include: { service: true, business: { include: { bookingRule: true } } },
  });
  if (!a) throw new BookingError("Захиалга олдсонгүй.");
  assertActor(a, params.actor);
  if (!["PENDING", "CONFIRMED"].includes(a.status)) throw new BookingError("Энэ захиалгын цагийг өөрчлөх боломжгүй байна.");
  if (params.actor.kind === "customer") assertWithinChangeWindow(a.startAt, a.business.bookingRule?.cancelWindowHours ?? 3);

  const staffId = params.staffId ?? a.staffId;
  const bypass = params.actor.kind === "business";
  return db.$transaction(async (tx) => {
    await lockStaff(tx, staffId);
    const free = await isSlotFree({
      businessId: a.businessId,
      serviceId: a.serviceId,
      staffId,
      startAt: params.startAt,
      ignoreAppointmentId: a.id,
      bypassRules: bypass,
    });
    if (!free) throw new BookingError(MESSAGES.slotTaken);
    const updated = await tx.appointment.update({
      where: { id: a.id },
      data: { startAt: params.startAt, endAt: addMinutes(params.startAt, a.service.durationMin), staffId },
    });
    if (a.userId && params.actor.kind === "business") {
      await tx.notification.create({
        data: {
          userId: a.userId,
          type: "BOOKING_MOVED",
          title: "Захиалгын цаг өөрчлөгдлөө",
          body: `${a.business.name} таны захиалгыг ${formatLongDate(params.startAt)}, ${formatTime(params.startAt)} цагт шилжүүллээ.`,
          link: `/app/bookings/${a.id}`,
        },
      });
    }
    return updated;
  });
}

export async function cancelBooking(params: {
  appointmentId: string;
  reason?: string;
  actor: { kind: "customer"; userId: string } | { kind: "business"; businessId: string };
}): Promise<Appointment> {
  const a = await db.appointment.findUnique({
    where: { id: params.appointmentId },
    include: { business: { include: { bookingRule: true } }, service: true, customer: true },
  });
  if (!a) throw new BookingError("Захиалга олдсонгүй.");
  assertActor(a, params.actor);
  if (!["PENDING", "CONFIRMED"].includes(a.status)) throw new BookingError("Энэ захиалгыг цуцлах боломжгүй байна.");
  if (params.actor.kind === "customer") assertWithinChangeWindow(a.startAt, a.business.bookingRule?.cancelWindowHours ?? 3);

  const updated = await db.appointment.update({
    where: { id: a.id },
    data: { status: "CANCELLED", cancelReason: params.reason ?? (params.actor.kind === "customer" ? "Үйлчлүүлэгч цуцалсан" : "Бизнес цуцалсан") },
  });
  const when = `${formatLongDate(a.startAt)}, ${formatTime(a.startAt)}`;
  if (params.actor.kind === "customer") {
    await notify({
      userId: a.business.ownerId,
      type: "BOOKING_CANCELLED",
      title: "Захиалга цуцлагдлаа",
      body: `${a.customer.name} ${a.service.name} захиалгаа цуцаллаа. ${when}.`,
      link: "/owner/appointments",
    });
  } else if (a.userId) {
    await notify({
      userId: a.userId,
      type: "BOOKING_CANCELLED",
      title: "Захиалга цуцлагдлаа",
      body: `${a.business.name} таны ${when} цагийн захиалгыг цуцаллаа.`,
      link: `/app/bookings/${a.id}`,
      channels: ["SMS"],
    });
  }
  return updated;
}

export async function setBookingStatus(params: { appointmentId: string; businessId: string; status: AppointmentStatus }) {
  const a = await db.appointment.findFirst({ where: { id: params.appointmentId, businessId: params.businessId } });
  if (!a) throw new BookingError("Захиалга олдсонгүй.");
  if (params.status === "CANCELLED") {
    return cancelBooking({ appointmentId: a.id, actor: { kind: "business", businessId: params.businessId } });
  }
  if ((params.status === "COMPLETED" || params.status === "NO_SHOW") && a.startAt.getTime() > Date.now()) {
    throw new BookingError("Эхлээгүй захиалгыг дууссан гэж тэмдэглэх боломжгүй.");
  }
  const updated = await db.appointment.update({ where: { id: a.id }, data: { status: params.status } });
  if (params.status === "COMPLETED" && a.userId) {
    await notify({
      userId: a.userId,
      type: "REVIEW_REQUEST",
      title: "Үйлчилгээгээ үнэлээрэй",
      body: "Танд үйлчилсэн мэргэжилтнийг үнэлж, сэтгэгдлээ үлдээнэ үү.",
      link: `/app/bookings/${a.id}`,
      dedupeKey: `review-request:${a.id}`,
    });
  }
  return updated;
}

function assertActor(
  a: { userId: string | null; businessId: string },
  actor: { kind: "customer"; userId: string } | { kind: "business"; businessId: string },
) {
  const allowed = actor.kind === "customer" ? a.userId === actor.userId : a.businessId === actor.businessId;
  if (!allowed) throw new BookingError(MESSAGES.unauthorized);
}

function assertWithinChangeWindow(startAt: Date, hours: number) {
  if (startAt.getTime() - Date.now() < hours * 3600_000) {
    throw new BookingError(`Захиалга эхлэхээс ${hours} цагийн өмнөөс хойш цуцлах, цаг өөрчлөх боломжгүй. Бизнестэй шууд холбогдоно уу.`);
  }
}
