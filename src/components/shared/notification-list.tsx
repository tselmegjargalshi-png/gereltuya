"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { markNotificationsReadAction } from "@/server/actions/customer";

export type NotificationItem = { id: string; title: string; body: string; link: string | null; createdAt: string; read: boolean };

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((i) => !i.read).length;
  const markAll = () =>
    start(async () => {
      await markNotificationsReadAction();
      router.refresh();
    });
  const open = (id: string) =>
    start(async () => {
      await markNotificationsReadAction([id]);
    });
  return (
    <div className="mt-6">
      {unread ? (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-stone">{unread} шинэ мэдэгдэл</p>
          <Button variant="ghost" size="sm" onClick={markAll} loading={pending}>
            Бүгдийг уншсан болгох
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {items.map((n) => {
          const inner = (
            <div className="flex gap-3 p-4">
              <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")} aria-hidden />
              <div className="min-w-0">
                <p className={cn("text-[14.5px]", n.read ? "font-medium" : "font-semibold")}>{n.title}</p>
                <p className="mt-0.5 text-[14px] text-stone">{n.body}</p>
                <p className="mt-1.5 text-[12px] text-mute">{formatRelativeTime(new Date(n.createdAt))}</p>
              </div>
            </div>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => open(n.id)} className="block transition-colors hover:bg-ivory/60">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
