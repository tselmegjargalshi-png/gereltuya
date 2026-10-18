import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./token";

export async function createSession(user: Pick<User, "id" | "role" | "name">) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "BUSINESS_OWNER":
      return "/owner";
    case "STAFF":
      return "/staff";
    default:
      return "/app";
  }
}

export async function requireUser(roles?: Role[], next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (roles && !roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

/** Returns the business owned by the current owner. Owners only ever see their own business. */
export const requireOwnerBusiness = cache(async () => {
  const user = await requireUser(["BUSINESS_OWNER"], "/owner");
  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    include: { subscription: true, bookingRule: true },
  });
  if (!business) redirect("/owner/onboarding");
  return { user, business };
});

export const requireStaff = cache(async () => {
  const user = await requireUser(["STAFF"], "/staff");
  const staff = await db.businessStaff.findUnique({
    where: { userId: user.id },
    include: { business: true },
  });
  if (!staff) redirect("/login");
  return { user, staff };
});
