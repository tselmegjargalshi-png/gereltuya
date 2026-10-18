"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppointmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getAvailableDays, getAvailableSlots } from "@/lib/availability";
import { MESSAGES } from "@/lib/labels";
import { type ActionState, nameSchema, phoneSchema, zodFieldErrors } from "@/lib/validation";
import { BookingError, cancelBooking, createBooking, rescheduleBooking, setBookingStatus } from "@/server/booking";
import { ownerCtx } from "./owner-common";

const refresh = () => {
  revalidatePath("/owner", "layout");
};

const createSchema = z.object({
  serviceId: z.string().min(1, "Үйлчилгээ сонгоно уу."),
  staffId: z.string().min(1, "Мэргэжилтэн сонгоно уу."),
  startAt: z.string().datetime({ message: "Цаг сонгоно уу." }),
  name: nameSchema,
  phone: phoneSchema,
  note: z.string().max(300).default(""),
});

export async function createOwnerAppointmentAction(input: z.input<typeof createSchema>): Promise<ActionState<{ id: string }>> {
  const { business } = await ownerCtx();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  try {
    const existingUser = await db.user.findUnique({ where: { phone: d.phone }, select: { id: true, role: true } });
    const appt = await createBooking({
      businessId: business.id,
      serviceId: d.serviceId,
      staffId: d.staffId,
      startAt: new Date(d.startAt),
      source: "MANUAL",
      bypassRules: true,
      note: d.note,
      status: "CONFIRMED",
      customer: { userId: existingUser?.role === "CUSTOMER" ? existingUser.id : null, name: d.name, phone: d.phone },
    });
    refresh();
    return { ok: true, data: { id: appt.id } };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error(e);
    return { error: `${MESSAGES.bookingFailed} ${MESSAGES.retry}` };
  }
}

export async function moveAppointmentAction(appointmentId: string, startAt: string, staffId?: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return { error: MESSAGES.retry };
  try {
    if (staffId) {
      const staff = await db.businessStaff.findFirst({ where: { id: staffId, businessId: business.id, active: true } });
      if (!staff) return { error: "Мэргэжилтэн олдсонгүй." };
    }
    await rescheduleBooking({ appointmentId, startAt: date, staffId, actor: { kind: "business", businessId: business.id } });
    refresh();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : MESSAGES.retry };
  }
}

export async function setAppointmentStatusAction(appointmentId: string, status: AppointmentStatus): Promise<ActionState> {
  const { business } = await ownerCtx();
  try {
    await setBookingStatus({ appointmentId, businessId: business.id, status });
    refresh();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : MESSAGES.retry };
  }
}

export async function cancelOwnerAppointmentAction(appointmentId: string, reason?: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  try {
    await cancelBooking({ appointmentId, reason, actor: { kind: "business", businessId: business.id } });
    refresh();
    return { ok: true };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : MESSAGES.retry };
  }
}

export async function getOwnerSlotsAction(params: { serviceId: string; staffId: string; dateKey: string; ignoreAppointmentId?: string }) {
  const { business } = await ownerCtx();
  return getAvailableSlots({ businessId: business.id, serviceId: params.serviceId, staffId: params.staffId, dateKey: params.dateKey, ignoreAppointmentId: params.ignoreAppointmentId, bypassRules: true });
}

export async function getOwnerDaysAction(params: { serviceId: string; staffId: string }) {
  const { business } = await ownerCtx();
  return getAvailableDays({ businessId: business.id, serviceId: params.serviceId, staffId: params.staffId, days: 28 });
}

export async function getOwnerAppointmentSlotsAction(appointmentId: string, dateKey: string) {
  const { business } = await ownerCtx();
  const a = await db.appointment.findFirst({ where: { id: appointmentId, businessId: business.id }, select: { id: true, serviceId: true, staffId: true } });
  if (!a) return [];
  return getAvailableSlots({ businessId: business.id, serviceId: a.serviceId, staffId: a.staffId, dateKey, ignoreAppointmentId: a.id, bypassRules: true });
}

export async function getOwnerAppointmentDaysAction(appointmentId: string) {
  const { business } = await ownerCtx();
  const a = await db.appointment.findFirst({ where: { id: appointmentId, businessId: business.id }, select: { serviceId: true, staffId: true } });
  if (!a) return {};
  return getAvailableDays({ businessId: business.id, serviceId: a.serviceId, staffId: a.staffId, days: 28 });
}

const blockSchema = z
  .object({
    staffId: z.string().optional(),
    startAt: z.string().datetime({ message: "Эхлэх цагийг сонгоно уу." }),
    endAt: z.string().datetime({ message: "Дуусах цагийг сонгоно уу." }),
    reason: z.string().trim().max(120).default(""),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), { message: "Дуусах цаг эхлэх цагаас хойш байх ёстой.", path: ["endAt"] });

export async function createBlockedTimeAction(input: z.input<typeof blockSchema>): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.staffId) {
    const s = await db.businessStaff.findFirst({ where: { id: d.staffId, businessId: business.id } });
    if (!s) return { error: "Мэргэжилтэн олдсонгүй." };
  }
  await db.blockedTime.create({ data: { businessId: business.id, staffId: d.staffId || null, startAt: new Date(d.startAt), endAt: new Date(d.endAt), reason: d.reason } });
  refresh();
  return { ok: true };
}

export async function deleteBlockedTimeAction(id: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  const res = await db.blockedTime.deleteMany({ where: { id, businessId: business.id } });
  if (!res.count) return { error: "Хаасан цаг олдсонгүй." };
  refresh();
  return { ok: true };
}

export async function updateAppointmentNoteAction(appointmentId: string, note: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  const res = await db.appointment.updateMany({ where: { id: appointmentId, businessId: business.id }, data: { note: note.slice(0, 300) } });
  if (!res.count) return { error: "Захиалга олдсонгүй." };
  refresh();
  return { ok: true };
}
