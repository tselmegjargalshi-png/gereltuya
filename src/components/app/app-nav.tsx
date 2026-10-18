"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Heart, Home, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/brand/logo";

const items = [
  { href: "/app", label: "Нүүр", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/search", label: "Хайх", icon: Search, match: (p: string) => p.startsWith("/app/search") || p.startsWith("/app/b/") || p.startsWith("/app/s/") || p.startsWith("/app/book") },
  { href: "/app/bookings", label: "Захиалга", icon: CalendarDays, match: (p: string) => p.startsWith("/app/bookings") },
  { href: "/app/saved", label: "Хадгалсан", icon: Heart, match: (p: string) => p.startsWith("/app/saved") },
  { href: "/app/profile", label: "Профайл", icon: User, match: (p: string) => p.startsWith("/app/profile") || p.startsWith("/app/notifications") },
];

export function AppNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-line bg-paper/90 backdrop-blur-md md:block">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo href="/app" />
          <nav aria-label="Үндсэн цэс" className="flex items-center gap-1">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={it.match(pathname) ? "page" : undefined}
                className={cn("rounded-full px-4 py-2 text-sm transition-colors", it.match(pathname) ? "bg-ink text-paper" : "text-stone hover:bg-ivory hover:text-ink")}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <Link href="/app/notifications" aria-label={`Мэдэгдэл${unread ? `, ${unread} шинэ` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ivory">
            <Bell className="h-5 w-5" />
            {unread ? <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">{unread}</span> : null}
          </Link>
        </div>
      </header>
      <nav aria-label="Үндсэн цэс" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-5">
          {items.map((it) => {
            const active = it.match(pathname);
            return (
              <li key={it.href}>
                <Link href={it.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-1 py-2.5 text-[11px]">
                  {active ? <motion.span layoutId="app-tab" className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-ink" /> : null}
                  <it.icon className={cn("h-[22px] w-[22px]", active ? "text-ink" : "text-mute")} strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                  <span className={active ? "font-semibold text-ink" : "text-mute"}>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
