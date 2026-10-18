import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { generateReminders } from "@/lib/notifications/reminders";
import { AppNav } from "@/components/app/app-nav";

export const metadata: Metadata = { title: { default: "GERELTUYA", template: "%s | GERELTUYA" }, robots: { index: false } };

export default async function CustomerAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(undefined, "/app");
  await generateReminders({ userId: user.id }).catch(() => undefined);
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <AppNav unread={unread} />
      <main id="main">{children}</main>
    </div>
  );
}
