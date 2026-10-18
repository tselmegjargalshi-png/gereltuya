"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/payments";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";
import { uploadImage } from "@/lib/storage";
import { type ActionState, phoneSchema, slugify, zodFieldErrors } from "@/lib/validation";
import { addDays } from "@/lib/time";
import { ownerCtx } from "./owner-common";

const url = z.string().trim().url("Холбоос буруу байна.").or(z.literal("")).default("");

const profileSchema = z.object({
  name: z.string().trim().min(2, "Бизнесийн нэрээ оруулна уу.").max(60),
  tagline: z.string().trim().max(90, "Богино тайлбар хэт урт байна.").default(""),
  description: z.string().trim().max(1200, "Тайлбар хэт урт байна.").default(""),
  address: z.string().trim().min(5, "Хаягаа оруулна уу.").max(200),
  district: z.string().trim().min(1, "Дүүрэг сонгоно уу."),
  phone: phoneSchema,
  email: z.string().trim().email("И-мэйл хаяг буруу байна.").or(z.literal("")).default(""),
  instagram: url,
  facebook: url,
  website: url,
  logoUrl: url,
  coverUrl: url,
  categoryIds: z.array(z.string()).default([]),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function saveBusinessProfileAction(input: ProfileInput): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  await db.business.update({
    where: { id: business.id },
    data: {
      name: d.name,
      tagline: d.tagline || null,
      description: d.description,
      address: d.address,
      district: d.district,
      phone: d.phone,
      email: d.email || null,
      instagram: d.instagram || null,
      facebook: d.facebook || null,
      website: d.website || null,
      logoUrl: d.logoUrl || null,
      coverUrl: d.coverUrl || null,
      categories: { set: d.categoryIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/owner", "layout");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

export async function uploadImageAction(formData: FormData): Promise<ActionState<{ url: string }>> {
  const { business } = await ownerCtx();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Зураг сонгоно уу." };
  try {
    const url = await uploadImage(file, `businesses/${business.id}`);
    return { ok: true, data: { url } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Зураг хадгалж чадсангүй. Дахин оролдоно уу." };
  }
}

export async function addGalleryImageAction(imageUrl: string, caption = ""): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = z.string().url("Зургийн холбоос буруу байна.").safeParse(imageUrl);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const count = await db.businessGallery.count({ where: { businessId: business.id } });
  if (count >= 24) return { error: "Цомогт хамгийн ихдээ 24 зураг оруулна." };
  await db.businessGallery.create({ data: { businessId: business.id, imageUrl: parsed.data, caption, sortOrder: count } });
  revalidatePath("/owner/profile");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

export async function removeGalleryImageAction(id: string): Promise<ActionState> {
  const { business } = await ownerCtx();
  await db.businessGallery.deleteMany({ where: { id, businessId: business.id } });
  revalidatePath("/owner/profile");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hoursSchema = z.array(z.object({ weekday: z.number().int().min(0).max(6), isClosed: z.boolean(), openTime: hhmm, closeTime: hhmm })).length(7);

export async function saveBusinessHoursAction(input: z.input<typeof hoursSchema>): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { error: "Цагийн мэдээлэл буруу байна." };
  for (const d of parsed.data) if (!d.isClosed && d.openTime >= d.closeTime) return { error: "Нээх цаг хаах цагаас өмнө байх ёстой." };
  await db.$transaction([
    db.workingHour.deleteMany({ where: { businessId: business.id, staffId: null } }),
    db.workingHour.createMany({ data: parsed.data.map((d) => ({ businessId: business.id, staffId: null, ...d })) }),
  ]);
  revalidatePath("/owner", "layout");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true };
}

const rulesSchema = z.object({
  minLeadMinutes: z.coerce.number().int().min(0, "Утга сөрөг байж болохгүй.").max(60 * 24 * 7),
  maxAdvanceDays: z.coerce.number().int().min(1, "Хамгийн багадаа 1 өдөр.").max(180, "Хамгийн ихдээ 180 өдөр."),
  cancelWindowHours: z.coerce.number().int().min(0).max(168),
  slotStepMin: z.coerce.number().int().refine((v) => [15, 20, 30, 60].includes(v), "Алхам буруу байна."),
  bufferMin: z.coerce.number().int().min(0).max(120),
  autoConfirm: z.coerce.boolean(),
  cancellationPolicy: z.string().trim().max(600, "Нөхцөл хэт урт байна.").default(""),
});

export async function saveBookingRulesAction(input: z.input<typeof rulesSchema>): Promise<ActionState> {
  const { business } = await ownerCtx();
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  await db.bookingRule.upsert({ where: { businessId: business.id }, create: { businessId: business.id, ...parsed.data }, update: parsed.data });
  revalidatePath("/owner", "layout");
  return { ok: true };
}

/** Demo billing: no money moves until a real PaymentProvider is configured. */
export async function changePlanAction(plan: "FREE" | "PRO" | "BUSINESS"): Promise<ActionState<{ demo: boolean }>> {
  const { business } = await ownerCtx();
  if (!(plan in PLANS)) return { error: "Багц олдсонгүй." };
  const provider = getPaymentProvider();
  const def = PLANS[plan];
  const invoice = def.price > 0 ? await provider.createInvoice({ businessId: business.id, plan, amount: def.price, description: `GERELTUYA ${plan}` }) : null;
  if (invoice && invoice.status === "FAILED") return { error: "Төлбөр амжилтгүй боллоо. Дахин оролдоно уу." };

  const sub = await db.subscription.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, plan, status: "ACTIVE", currentPeriodEnd: plan === "FREE" ? null : addDays(new Date(), 30) },
    update: { plan, status: "ACTIVE", currentPeriodEnd: plan === "FREE" ? null : addDays(new Date(), 30) },
  });
  if (invoice) {
    await db.payment.create({
      data: {
        businessId: business.id,
        subscriptionId: sub.id,
        plan,
        amount: def.price,
        status: invoice.status === "PAID" ? "PAID" : "PENDING",
        provider: provider.name,
        providerRef: invoice.providerRef,
        paidAt: invoice.status === "PAID" ? new Date() : null,
      },
    });
  }
  revalidatePath("/owner", "layout");
  return { ok: true, data: { demo: !provider.live } };
}

// ---------------------------------------------------------------- onboarding

async function onboardingBusiness() {
  const user = await requireUser(["BUSINESS_OWNER"], "/owner/onboarding");
  let business = await db.business.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" } });
  if (!business) {
    const base = slugify(user.name) || "biznes";
    let slug = base;
    for (let i = 2; await db.business.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    business = await db.business.create({
      data: {
        slug,
        name: `${user.name} салон`,
        ownerId: user.id,
        phone: user.phone ?? "",
        status: "PENDING",
        bookingRule: { create: {} },
        subscription: { create: { plan: "PRO", status: "TRIAL", currentPeriodEnd: addDays(new Date(), TRIAL_DAYS) } },
      },
    });
  }
  return { user, business };
}

export async function startOnboardingAction() {
  await onboardingBusiness();
}

const infoSchema = z.object({
  name: z.string().trim().min(2, "Бизнесийн нэрээ оруулна уу.").max(60),
  tagline: z.string().trim().max(90).default(""),
  address: z.string().trim().min(5, "Хаягаа оруулна уу.").max(200),
  district: z.string().trim().min(1, "Дүүрэг сонгоно уу."),
  phone: phoneSchema,
  description: z.string().trim().max(1200).default(""),
  categoryIds: z.array(z.string()).min(1, "Хамгийн багадаа нэг ангилал сонгоно уу."),
});

export async function saveOnboardingInfoAction(input: z.input<typeof infoSchema>): Promise<ActionState> {
  const { business } = await onboardingBusiness();
  const parsed = infoSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  let slug = business.slug;
  const wanted = slugify(d.name);
  if (wanted && business.slug !== wanted && !business.onboardingCompleted) {
    slug = wanted;
    for (let i = 2; ; i++) {
      const clash = await db.business.findUnique({ where: { slug } });
      if (!clash || clash.id === business.id) break;
      slug = `${wanted}-${i}`;
    }
  }
  await db.business.update({
    where: { id: business.id },
    data: {
      name: d.name,
      slug,
      tagline: d.tagline || null,
      address: d.address,
      district: d.district,
      phone: d.phone,
      description: d.description,
      categories: { set: d.categoryIds.map((id) => ({ id })) },
      onboardingStep: Math.max(business.onboardingStep, 3),
    },
  });
  return { ok: true };
}

export async function setOnboardingStepAction(step: number): Promise<ActionState> {
  const { business } = await onboardingBusiness();
  await db.business.update({ where: { id: business.id }, data: { onboardingStep: Math.max(business.onboardingStep, Math.min(step, 7)) } });
  return { ok: true };
}

export async function finishOnboardingAction(): Promise<ActionState> {
  const { business } = await onboardingBusiness();
  const [services, staff, hours] = await Promise.all([
    db.service.count({ where: { businessId: business.id, active: true } }),
    db.businessStaff.count({ where: { businessId: business.id, active: true } }),
    db.workingHour.count({ where: { businessId: business.id } }),
  ]);
  if (!services) return { error: "Хамгийн багадаа нэг үйлчилгээ нэмнэ үү." };
  if (!staff) return { error: "Хамгийн багадаа нэг мэргэжилтэн нэмнэ үү." };
  if (!hours) return { error: "Ажлын цагаа тохируулна уу." };
  const staffWithServices = await db.businessStaff.count({ where: { businessId: business.id, active: true, services: { some: {} } } });
  if (!staffWithServices) return { error: "Мэргэжилтэн дор хаяж нэг үйлчилгээ үзүүлдэг байх ёстой." };

  const setting = await db.platformSetting.findUnique({ where: { key: "autoApproveBusinesses" } });
  await db.business.update({
    where: { id: business.id },
    data: { onboardingCompleted: true, onboardingStep: 7, status: setting?.value === "true" ? "ACTIVE" : business.status === "SUSPENDED" ? "SUSPENDED" : "PENDING" },
  });
  revalidatePath("/owner", "layout");
  redirect("/owner?welcome=1");
}
