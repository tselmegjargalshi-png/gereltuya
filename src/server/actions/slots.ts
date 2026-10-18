"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getAvailableDays, getAvailableSlots } from "@/lib/availability";

async function ownAppointment(appointmentId: string, userId: string) {
  return db.appointment.findFirst({ where: { id: appointmentId, userId }, select: { id: true, businessId: true, serviceId: true, staffId: true } });
}

export async function getDaysForAppointmentAction(appointmentId: string) {
  const user = await requireUser();
  const a = await ownAppointment(appointmentId, user.id);
  if (!a) return {};
  return getAvailableDays({ businessId: a.businessId, serviceId: a.serviceId, staffId: a.staffId, days: 28 });
}

export async function getSlotsForAppointmentAction(appointmentId: string, dateKey: string) {
  const user = await requireUser();
  const a = await ownAppointment(appointmentId, user.id);
  if (!a) return [];
  return getAvailableSlots({ businessId: a.businessId, serviceId: a.serviceId, staffId: a.staffId, dateKey, ignoreAppointmentId: a.id });
}
