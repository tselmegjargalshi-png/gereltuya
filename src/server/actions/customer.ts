"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { MESSAGES } from "@/lib/labels";
import { type ActionState, nameSchema, passwordSchema, phoneSchema, zodFieldErrors } from "@/lib/validation";
import { recomputeRatings } from "@/server/ratings";
import { BookingError, cancelBooking, createBooking, rescheduleBooking } from "@/server/booking";

export type BookingResult = ActionState<{ appointmentId: string }>;

const bookingSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  startAt: z.string().datetime(),
  note: z.string().max(300).optional(),
});

export async function createBookingAction(input: z.infer<typeof bookingSchema>): Promise<BookingResult> {
  const user = await requireUser(["CUSTOMER", "ADMIN", "BUSINESS_OWNER", "STAFF"]);
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { error: MESSAGES.bookingFailed };
  const full = await db.user.findUnique({ where: { id: user.id } });
  if (!full) return { error: MESSAGES.bookingFailed };
  try {
    const appt = await createBooking({
      businessId: parsed.data.businessId,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId || null,
      startAt: new Date(parsed.data.startAt),
      note: parsed.data.note,
      customer: { userId: full.id, name: full.name, phone: full.phone ?? "0000 0000", email: full.email },
    });
    revalidatePath("/app/bookings");
    return { ok: true, data: { appointmentId: appt.id } };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    console.error(e);
    return { error: `${MESSAGES.bookingFailed} ${MESSAGES.retry}` };
  }
}

export async function cancelMyBookingAction(appointmentId: string): Promise<ActionState> {
  const user = await requireUser(["CUSTOMER", "ADMIN", "BUSINESS_OWNER", "STAFF"]);
  try {
    await cancelBooking({ appointmentId, actor: { kind: "customer", userId: user.id } });
    revalidatePath("/app/bookings");
    revalidatePath(`/app/bookings/${appointmentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : MESSAGES.retry };
  }
}

export async function rescheduleMyBookingAction(appointmentId: string, startAt: string, staffId?: string): Promise<ActionState> {
  const user = await requireUser(["CUSTOMER", "ADMIN", "BUSINESS_OWNER", "STAFF"]);
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return { error: MESSAGES.retry };
  try {
    await rescheduleBooking({ appointmentId, startAt: date, staffId, actor: { kind: "customer", userId: user.id } });
    revalidatePath("/app/bookings");
    revalidatePath(`/app/bookings/${appointmentId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof BookingError ? e.message : MESSAGES.retry };
  }
}

const reviewSchema = z.object({
  appointmentId: z.string(),
  rating: z.coerce.number().int().min(1, "Үнэлгээгээ сонгоно уу.").max(5),
  comment: z.string().trim().max(600, "Сэтгэгдэл хэт урт байна.").optional(),
});

export async function submitReviewAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const a = await db.appointment.findFirst({
    where: { id: parsed.data.appointmentId, userId: user.id, status: "COMPLETED" },
    include: { review: true },
  });
  if (!a) return { error: "Зөвхөн дууссан захиалгыг үнэлэх боломжтой." };
  if (a.review) return { error: "Та энэ захиалгыг аль хэдийн үнэлсэн байна." };

  await db.review.create({
    data: {
      businessId: a.businessId,
      staffId: a.staffId,
      appointmentId: a.id,
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? "",
    },
  });
  await recomputeRatings(a.businessId, a.staffId);
  revalidatePath(`/app/bookings/${a.id}`);
  revalidatePath("/app/bookings");
  return { ok: true };
}

export async function toggleFavoriteAction(target: { businessId?: string; staffId?: string }): Promise<ActionState<{ saved: boolean }>> {
  const user = await requireUser();
  if (!target.businessId && !target.staffId) return { error: MESSAGES.retry };
  const where = target.businessId
    ? { userId_businessId: { userId: user.id, businessId: target.businessId } }
    : { userId_staffId: { userId: user.id, staffId: target.staffId! } };
  const existing = await db.favorite.findUnique({ where });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
  } else {
    await db.favorite.create({ data: { userId: user.id, businessId: target.businessId, staffId: target.staffId } });
  }
  revalidatePath("/app/saved");
  return { ok: true, data: { saved: !existing } };
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionState> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({ name: nameSchema, phone: phoneSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const clash = await db.user.findFirst({ where: { phone: parsed.data.phone, NOT: { id: user.id } } });
  if (clash) return { fieldErrors: { phone: "Энэ утасны дугаар бүртгэлтэй байна." } };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("next"));
  if (!parsed.success) return { fieldErrors: { next: parsed.error.issues[0].message } };
  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await verifyPassword(current, row.passwordHash))) return { fieldErrors: { current: "Одоогийн нууц үг буруу байна." } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data) } });
  return { ok: true };
}

export async function rebookRedirect(appointmentId: string) {
  const user = await requireUser();
  const a = await db.appointment.findFirst({ where: { id: appointmentId, userId: user.id }, include: { business: { select: { slug: true } } } });
  if (!a) redirect("/app/bookings");
  redirect(`/book/${a.business.slug}?service=${a.serviceId}&staff=${a.staffId}`);
}
