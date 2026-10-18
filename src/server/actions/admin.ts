"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { BusinessStatus, ReviewStatus, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import { recomputeRatings } from "@/server/ratings";
import { type ActionState, slugify, zodFieldErrors } from "@/lib/validation";

async function admin() {
  return requireUser(["ADMIN"], "/admin");
}

export async function setBusinessStatusAction(id: string, status: BusinessStatus): Promise<ActionState> {
  await admin();
  if (!["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) return { error: "Төлөв буруу байна." };
  const b = await db.business.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true, slug: true, onboardingCompleted: true } });
  if (!b) return { error: "Бизнес олдсонгүй." };
  if (status === "ACTIVE" && !b.onboardingCompleted) return { error: "Бизнес бүртгэлээ дуусгаагүй байна." };
  await db.business.update({ where: { id }, data: { status } });
  await notify({
    userId: b.ownerId,
    type: "BUSINESS_STATUS",
    title: status === "ACTIVE" ? "Таны бизнес баталгаажлаа" : status === "SUSPENDED" ? "Таны бизнесийн хуудас түр хаагдлаа" : "Таны бизнес шалгагдаж байна",
    body: status === "ACTIVE" ? `${b.name} хайлтад харагдаж, захиалга авч эхэллээ.` : status === "SUSPENDED" ? `${b.name} түр хаагдсан. Дэлгэрэнгүйг дэмжлэгийн багаас лавлана уу.` : `${b.name} дахин шалгагдаж байна.`,
    link: "/owner",
  }).catch(() => undefined);
  revalidatePath("/admin", "layout");
  revalidatePath(`/b/${b.slug}`);
  revalidatePath("/search");
  return { ok: true };
}

export async function setUserStatusAction(id: string, status: UserStatus): Promise<ActionState> {
  const me = await admin();
  if (me.id === id) return { error: "Өөрийн эрхийг хаах боломжгүй." };
  const u = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!u) return { error: "Хэрэглэгч олдсонгүй." };
  if (u.role === "ADMIN") return { error: "Админ хэрэглэгчийг энд өөрчлөх боломжгүй." };
  await db.user.update({ where: { id }, data: { status } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setReviewStatusAction(id: string, status: ReviewStatus): Promise<ActionState> {
  await admin();
  const r = await db.review.findUnique({ where: { id }, select: { businessId: true, staffId: true } });
  if (!r) return { error: "Үнэлгээ олдсонгүй." };
  await db.review.update({ where: { id }, data: { status } });
  await recomputeRatings(r.businessId, r.staffId);
  revalidatePath("/admin/reviews");
  return { ok: true };
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Ангиллын нэрээ оруулна уу.").max(40, "Нэр хэт урт байна."),
  imageUrl: z.string().trim().url("Зургийн холбоос буруу байна."),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.coerce.boolean().default(true),
});

export async function saveCategoryAction(input: z.input<typeof categorySchema>): Promise<ActionState> {
  await admin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.id) {
    await db.serviceCategory.update({ where: { id: d.id }, data: { name: d.name, imageUrl: d.imageUrl, sortOrder: d.sortOrder, active: d.active } });
  } else {
    let slug = slugify(d.name) || "angilal";
    for (let i = 2; await db.serviceCategory.findUnique({ where: { slug } }); i++) slug = `${slugify(d.name) || "angilal"}-${i}`;
    await db.serviceCategory.create({ data: { slug, name: d.name, imageUrl: d.imageUrl, sortOrder: d.sortOrder, active: d.active } });
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionState> {
  await admin();
  const used = await db.service.count({ where: { categoryId: id } });
  const linked = await db.business.count({ where: { categories: { some: { id } } } });
  if (used || linked) return { error: "Энэ ангиллыг бизнес эсвэл үйлчилгээ ашиглаж байна. Устгахын оронд идэвхгүй болгоно уу." };
  await db.serviceCategory.delete({ where: { id } });
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function setPlatformSettingAction(key: string, value: string): Promise<ActionState> {
  await admin();
  if (!["autoApproveBusinesses", "supportEmail", "supportPhone"].includes(key)) return { error: "Тохиргоо олдсонгүй." };
  if (value.length > 120) return { error: "Утга хэт урт байна." };
  await db.platformSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  revalidatePath("/admin/settings");
  return { ok: true };
}
