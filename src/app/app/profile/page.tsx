import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight, LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, homeForRole } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { ProfileForm, PasswordForm } from "@/components/app/profile-forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDateDots } from "@/lib/format";

export const metadata: Metadata = { title: "Профайл" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [unread, count] = await Promise.all([
    db.notification.count({ where: { userId: user.id, readAt: null } }),
    db.appointment.count({ where: { userId: user.id, status: "COMPLETED" } }),
  ]);
  return (
    <div className="container-page max-w-2xl py-6 md:py-10">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} src={user.avatarUrl} size={64} />
        <div>
          <h1 className="font-display text-[2.2rem] leading-none">{user.name}</h1>
          <p className="mt-1.5 text-sm text-stone">{count} үйлчилгээ авсан · {formatDateDots(user.createdAt)}-с бүртгэлтэй</p>
        </div>
      </div>

      <Link href="/app/notifications" className="mt-8 flex items-center justify-between rounded-[14px] border border-line bg-surface p-4 hover:border-ink/40">
        <span className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-stone" aria-hidden />
          Мэдэгдэл
          {unread ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-paper">{unread} шинэ</span> : null}
        </span>
        <ChevronRight className="h-4 w-4 text-mute" aria-hidden />
      </Link>
      {user.role !== "CUSTOMER" ? (
        <Link href={homeForRole(user.role)} className="mt-3 flex items-center justify-between rounded-[14px] border border-line bg-surface p-4 hover:border-ink/40">
          Ажлын самбар руу очих
          <ChevronRight className="h-4 w-4 text-mute" aria-hidden />
        </Link>
      ) : null}

      <section className="mt-10" aria-labelledby="pi">
        <h2 id="pi" className="mb-5 text-[15px] font-semibold">Хувийн мэдээлэл</h2>
        <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} />
      </section>
      <section className="mt-12" aria-labelledby="pw">
        <h2 id="pw" className="mb-5 text-[15px] font-semibold">Нууц үг</h2>
        <PasswordForm />
      </section>
      <form action={logoutAction} className="mt-12">
        <Button type="submit" variant="outline">
          <LogOut className="h-4 w-4" aria-hidden />
          Гарах
        </Button>
      </form>
    </div>
  );
}
