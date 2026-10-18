"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { type ActionState, zodFieldErrors } from "@/lib/validation";
import { ownerCtx, tooMany } from "./owner-common";

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Үйлчилгээний нэрээ оруулна уу.").max(80, "Нэр хэт урт байна."),
  description: z.string().trim().max(400, "Тайлбар хэт урт байна.").default(""),
  categoryId: z.string().min(1, "Ангилал сонгоно уу."),
  durationMin: z.coerce.number().int("Хугацаа бүхэл тоо байна.").min(5, "Хугацаа хамгийн багадаа 5 минут.").max(600, "Хугацаа хэт урт байна."),
  price: z.coerce.number().int("Үнэ бүхэл тоо байна.").min(0, "Үнэ сөрөг байж болохгүй.").max(100_000_000, "Үнэ хэт өндөр байна."),
  active: z.coerce.boolean().default(true),
  staffIds: z.array(z.string()).default([]),
});

export type ServiceInput = z.input<typeof serviceSchema>;

export async function saveServiceAction(input: ServiceInput): Promise<ActionState> {
  const { business, plan, limits } = await ownerCtx();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  const [category, staff] = await Promise.all([
    db.serviceCategory.findUnique({ where: { id: d.categoryId } }),
    db.businessStaff.findMany({ where: { businessId: business.id, id: { in: d.staffIds } }, select: { id: true } }),
  ]);
  if (!category) return { fieldErrors: { categoryId: "Ангилал сонгоно уу." } };

  if (d.id) {
    const own = await db.service.findFirst({ where: { id: d.id, businessId: business.id } });
    if (!own) return { error: "Үйлчилгээ олдсонгүй." };
    await db.service.update({
      where: { id: d.id },
      data: {
        name: d.name,
        description: d.description,
        categoryId: d.categoryId,
        durationMin: d.durationMin,
        price: d.price,
        active: d.active,
        staff: { set: staff.map((s) => ({ id: s.id })) },
      },
    });
  } else {
    const count = await db.service.count({ where: { businessId: business.id } });
    if (count >= limits.services) return { error: tooMany("үйлчилгээний тоо", plan) };
    await db.service.create({
      data: {
        businessId: business.id,
        name: d.name,
        description: d.description,
        categoryId: d.categoryId,
        durationMin: d.durationMin,
        price: d.price,
        active: d.active,
        sortOrder: count,
        staff: { connect: staff.map((s) => ({ id: s.id })) },
      },
    });
    // Business shows up under every category it offers.
    await db.business.update({ where: { id: business.id }, data: { categories: { connect: { id: d.categoryId } } } });
  }
  revalidatePath("/owner/services");
  return { ok: true };
}

export async function toggleServiceAction(id: string, active: boolean): Promise<ActionState> {
  const { business } = await ownerCtx();
  const res = await db.service.updateMany({ where: { id, businessId: business.id }, data: { active } });
  if (!res.count) return { error: "Үйлчилгээ олдсонгүй." };
  revalidatePath("/owner/services");
  return { ok: true };
}

export async function deleteServiceAction(id: string): Promise<ActionState<{ archived: boolean }>> {
  const { business } = await ownerCtx();
  const svc = await db.service.findFirst({ where: { id, businessId: business.id }, select: { id: true } });
  if (!svc) return { error: "Үйлчилгээ олдсонгүй." };
  const used = await db.appointment.count({ where: { serviceId: id } });
  if (used > 0) {
    // History must stay intact: hide instead of deleting.
    await db.service.update({ where: { id }, data: { active: false } });
    revalidatePath("/owner/services");
    return { ok: true, data: { archived: true } };
  }
  await db.service.delete({ where: { id } });
  revalidatePath("/owner/services");
  return { ok: true, data: { archived: false } };
}
