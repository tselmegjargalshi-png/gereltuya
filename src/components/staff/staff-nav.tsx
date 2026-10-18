"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/staff", label: "Өнөөдөр", icon: Home, exact: true },
  { href: "/staff/schedule", label: "Хуваарь", icon: CalendarDays },
  { href: "/staff/profile", label: "Профайл", icon: UserRound },
] as const;

export function StaffNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Үндсэн цэс" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:static md:border-0 md:bg-transparent md:pb-0">
      <ul className="mx-auto grid max-w-md grid-cols-3 md:flex md:max-w-none md:gap-1">
        {NAV.map((item) => {
          const on = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={on ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10.5px] md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-2 md:text-[13px]", on ? "font-semibold text-ink md:bg-ink md:text-paper" : "text-mute md:text-stone")}>
                <item.icon className="h-5 w-5 md:h-4 md:w-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
