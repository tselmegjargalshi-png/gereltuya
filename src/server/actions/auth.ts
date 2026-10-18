"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, homeForRole } from "@/lib/auth/session";
import { getChannelProvider } from "@/lib/notifications/channels";
import {
  type ActionState,
  emailSchema,
  loginSchema,
  passwordSchema,
  registerCustomerSchema,
  registerOwnerSchema,
  zodFieldErrors,
} from "@/lib/validation";

function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string") return null;
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function formObject(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) return { error: "И-мэйл эсвэл нууц үг буруу байна." };
  if (user.status !== "ACTIVE") return { error: "Таны эрх түр хаагдсан байна. Тусламж авахын тулд бидэнтэй холбогдоно уу." };

  await createSession(user);
  const next = safeNext(formData.get("next"));
  redirect(next ?? homeForRole(user.role));
}

export async function registerCustomerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerCustomerSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { name, email, phone, password } = parsed.data;

  const [emailTaken, phoneTaken] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.user.findUnique({ where: { phone } }),
  ]);
  if (emailTaken) return { fieldErrors: { email: "Энэ и-мэйл хаяг бүртгэлтэй байна." } };
  if (phoneTaken) return { fieldErrors: { phone: "Энэ утасны дугаар бүртгэлтэй байна." } };

  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: "CUSTOMER" },
  });
  await db.notification.create({
    data: {
      userId: user.id,
      type: "WELCOME",
      title: "GERELTUYA-д тавтай морил",
      body: "Өөртөө ойрхон салон, мэргэжилтнээ сонгоод хүссэн цагаа захиалаарай.",
      link: "/app/search",
    },
  });
  await createSession(user);
  redirect(safeNext(formData.get("next")) ?? "/app");
}

export async function registerOwnerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerOwnerSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const { name, email, phone, password } = parsed.data;

  const [emailTaken, phoneTaken] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.user.findUnique({ where: { phone } }),
  ]);
  if (emailTaken) return { fieldErrors: { email: "Энэ и-мэйл хаяг бүртгэлтэй байна." } };
  if (phoneTaken) return { fieldErrors: { phone: "Энэ утасны дугаар бүртгэлтэй байна." } };

  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password), role: "BUSINESS_OWNER" },
  });
  await createSession(user);
  redirect("/owner/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const RESET_TTL_MS = 60 * 60 * 1000;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function requestPasswordResetAction(_: ActionState<{ demoLink?: string }>, formData: FormData): Promise<ActionState<{ demoLink?: string }>> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0].message } };

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  let demoLink: string | undefined;
  if (user && user.status === "ACTIVE") {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const link = `${base}/reset-password?token=${token}`;
    await getChannelProvider("EMAIL").send({
      to: user.email,
      title: "Нууц үг сэргээх",
      body: `Нууц үгээ сэргээхийн тулд энэ холбоосоор орно уу: ${link}. Холбоос 1 цагийн дотор хүчинтэй.`,
    });
    // Without a configured email provider the link is shown on screen so the flow stays testable.
    if (!process.env.EMAIL_PROVIDER) demoLink = link;
  }
  // Same response whether or not the account exists.
  return { ok: true, data: { demoLink } };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: "Нууц үг таарахгүй байна." } };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Холбоосын хугацаа дууссан эсвэл буруу байна. Дахин хүсэлт илгээнэ үү." };
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  redirect("/login?reset=1");
}
