"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { type ActionState, emailSchema, passwordSchema, zodFieldErrors } from "@/lib/validation";
import { ownerCtx, tooMany } from "./owner-common";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Цаг буруу байна.");

const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Нэрээ оруулна уу.").max(60),
  title: z.string().trim().min(2, "Мэргэжлээ оруулна уу.").max(60),
  photoUrl: z.string().trim().url("Зургийн холбоос буруу байна.").or(z.literal("")).default(""),
  experienceYears: z.coerce.number().int().min(0, "Туршлага сөрөг байж болохгүй.").max(60),
  bio: z.string().trim().max(500, "Тайлбар хэт урт байна.").default(""),
  serviceIds: z.array(z.string()).default([]),
  active: z.coerce.boolean().default(true),
  loginEmail: z.string().trim().default(""),
  loginPassword: z.string().default(""),
});

export type StaffInput = z.input<typeof staffSchema>;

export async function saveStaffAction(input: StaffInput): Promise<ActionState> {
  const { business, plan, limits } = await ownerCtx();
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const services = await db.service.findMany({ where: { businessId: business.id, id: { in: d.serviceIds } }, select: { id: true } });
  const colors = ["#8e4f36", "#5b6b5a", "#6b5a7a", "#a07a3d", "#4f6475", "#7a5560"];

  // Optional login for the specialist.
  let userId: string | undefined;
  if (d.loginEmail || d.loginPassword) {
    const email = emailSchema.safeParse(d.loginEmail);
    if (!email.success) return { fieldErrors: { loginEmail: email.error.issues[0].message } };
    const existingStaff = d.id ? await db.businessStaff.findFirst({ where: { id: d.id, businessId: business.id }, select: { userId: true } }) : null;
    const clash = await db.user.findUnique({ where: { email: email.data } });
    if (clash && clash.id !== existingStaff?.userId) return { fieldErrors: { loginEmail: "Энэ и-мэйл хаяг бүртгэлтэй байна." } };
    if (existingStaff?.userId) {
      userId = existingStaff.userId;
      const data: { email: string; name: string; passwordHash?: string } = { email: email.data, name: d.name };
      if (d.loginPassword) {
        const pw = passwordSchema.safeParse(d.loginPassword);
        if (!pw.success) return { fieldErrors: { loginPassword: pw.error.issues[0].message } };
        data.passwordHash = await hashPassword(pw.data);
      }
      await db.user.update({ where: { id: userId }, data });
    } else {
      const pw = passwordSchema.safeParse(d.loginPassword);
      if (!pw.success) return { fieldErrors: { loginPassword: pw.error.issues[0].message } };
      const created = await db.user.create({ data: { name: d.name, email: email.data, passwordHash: await hashPassword(pw.data), role: "STAFF" } });
      userId = created.id;
    }
  }

  if (d.id) {
    const own = await db.businessStaff.findFirst({ where: { id: d.id, businessId: business.id } });
    if (!own) return { error: "Мэргэжилтэн олдсонгүй." };
    await db.businessStaff.update({
      where: { id: d.id },
      data: {
        name: d.name,
        title: d.title,
        photoUrl: d.photoUrl || null,
        experienceYears: d.experienceYears,
        bio: d.bio,
        active: d.active,
        userId: userId ?? undefined,
        services: { set: services.map((s) => ({ id: s.id })) },
      },
    });
  } else {
    const count = await db.businessStaff.count({ where: { businessId: business.id, active: true } });
    if (count >= limits.staff) return { error: tooMany("мэргэжилтний тоо", plan) };
    await db.businessStaff.create({
      data: {
        businessId: business.id,
        name: d.name,
        title: d.title,
        photoUrl: d.photoUrl || null,
        experienceYears: d.experienceYears,
        bio: d.bio,
        active: d.active,
        userId,
        sortOrder: count,
        color: colors[count % colors.length],
        services: { connect: services.map((s) => ({ id: s.id })) },
      },
    });
  }
  revalidatePath("/owner/staff");
  revalidatePath("/owner/calendar");
  return { ok: true };
}

export async function deleteStaffAction(id: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  const s = await db.businessStaff.findFirst({ where: { id, businessId: business.id } });
  if (!s) return { error: "Мэргэжилтэн олдсонгүй." };
  const hasHistory = await db.appointment.count({ where: { staffId: id } });
  if (hasHistory) await db.businessStaff.update({ where: { id }, data: { active: false } });
  else {
    await db.workingHour.deleteMany({ where: { staffId: id } });
    await db.businessStaff.delete({ where: { id } });
  }
  revalidatePath("/owner/staff");
  return { ok: true };
}

const scheduleSchema = z.object({
  staffId: z.string(),
  days: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        isClosed: z.boolean(),
        openTime: hhmm,
        closeTime: hhmm,
        breakStart: hhmm.or(z.literal("")).default(""),
        breakEnd: hhmm.or(z.literal("")).default(""),
      }),
    )
    .length(7),
});

export type ScheduleInput = z.input<typeof scheduleSchema>;

export async function saveStaffScheduleAction(input: ScheduleInput): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Хуваарийн мэдээлэл буруу байна." };
  const staff = await db.businessStaff.findFirst({ where: { id: parsed.data.staffId, businessId: business.id } });
  if (!staff) return { error: "Мэргэжилтэн олдсонгүй." };
  for (const d of parsed.data.days) {
    if (!d.isClosed && d.openTime >= d.closeTime) return { error: "Эхлэх цаг дуусах цагаас өмнө байх ёстой." };
    if ((d.breakStart && !d.breakEnd) || (!d.breakStart && d.breakEnd)) return { error: "Завсарлагын эхлэх, дуусах цагийг хоёуланг нь оруулна уу." };
    if (d.breakStart && d.breakStart >= d.breakEnd) return { error: "Завсарлагын эхлэх цаг дуусах цагаас өмнө байх ёстой." };
  }
  await db.$transaction([
    db.workingHour.deleteMany({ where: { businessId: business.id, staffId: staff.id } }),
    db.workingHour.createMany({
      data: parsed.data.days.map((d) => ({
        businessId: business.id,
        staffId: staff.id,
        weekday: d.weekday,
        isClosed: d.isClosed,
        openTime: d.openTime,
        closeTime: d.closeTime,
        breakStart: d.breakStart || null,
        breakEnd: d.breakEnd || null,
      })),
    }),
  ]);
  revalidatePath("/owner/staff");
  revalidatePath("/owner/calendar");
  return { ok: true };
}
