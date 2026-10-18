"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LineChart,
  MoreHorizontal,
  Scissors,
  Settings,
  Store,
  UserRound,
  Users,
  FileBarChart,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { Modal } from "@/components/ui/modal";

const NAV = [
  { href: "/owner", label: "Хянах самбар", icon: LayoutDashboard, exact: true },
  { href: "/owner/appointments", label: "Захиалгууд", icon: ClipboardList },
  { href: "/owner/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/owner/services", label: "Үйлчилгээ", icon: Scissors },
  { href: "/owner/staff", label: "Мэргэжилтнүүд", icon: UserRound },
  { href: "/owner/customers", label: "Үйлчлүүлэгчид", icon: Users },
  { href: "/owner/revenue", label: "Орлого", icon: LineChart },
  { href: "/owner/reports", label: "Тайлан", icon: FileBarChart },
  { href: "/owner/profile", label: "Профайл", icon: Store },
  { href: "/owner/settings", label: "Тохиргоо", icon: Settings },
] as const;

const MOBILE = [
  { href: "/owner", label: "Самбар", icon: LayoutDashboard, exact: true },
  { href: "/owner/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/owner/appointments", label: "Захиалга", icon: ClipboardList },
  { href: "/owner/services", label: "Үйлчилгээ", icon: Scissors },
  { href: "/owner/profile", label: "Профайл", icon: Store },
] as const;

type Item = { href: string; exact?: boolean };
const isActive = (pathname: string, item: Item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

export function OwnerSidebar({ businessName, slug }: { businessName: string; slug: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col border-r border-line bg-paper px-4 py-6 lg:flex">
      <Logo href="/owner" className="px-2" />
      <div className="mt-8 px-2">
        <p className="eyebrow">Бизнес</p>
        <p className="mt-1 truncate text-[15px] font-semibold tracking-wide">{businessName}</p>
      </div>
      <nav aria-label="Бизнесийн цэс" className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors",
                active ? "bg-ink text-paper" : "text-stone hover:bg-ivory hover:text-ink",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link href={`/b/${slug}`} target="_blank" className="mt-4 flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[13px] text-stone hover:bg-ivory hover:text-ink">
        <ExternalLink className="h-4 w-4" aria-hidden />
        Нийтийн хуудас харах
      </Link>
    </aside>
  );
}

export function OwnerMobileNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = !MOBILE.some((m) => isActive(pathname, m));
  return (
    <>
      <nav aria-label="Үндсэн цэс" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-6">
          {MOBILE.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-1 py-2.5 text-[10.5px]">
                  {active ? <motion.span layoutId="owner-tab" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-ink" /> : null}
                  <item.icon className={cn("h-[21px] w-[21px]", active ? "text-ink" : "text-mute")} strokeWidth={active ? 2.2 : 1.7} aria-hidden />
                  <span className={active ? "font-semibold text-ink" : "text-mute"}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px]" aria-haspopup="dialog">
              <MoreHorizontal className={cn("h-[21px] w-[21px]", moreActive ? "text-ink" : "text-mute")} aria-hidden />
              <span className={moreActive ? "font-semibold text-ink" : "text-mute"}>Бусад</span>
            </button>
          </li>
        </ul>
      </nav>
      <Modal open={open} onClose={() => setOpen(false)} title="Бүх цэс" size="sm">
        <ul className="grid grid-cols-2 gap-2">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-[14px]", isActive(pathname, item) ? "border-ink bg-ink text-paper" : "border-line bg-surface")}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
          <li className="col-span-2">
            <Link href={`/b/${slug}`} target="_blank" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-[12px] border border-line px-4 py-3.5 text-[14px]">
              <ExternalLink className="h-[18px] w-[18px]" aria-hidden />
              Нийтийн хуудас харах
            </Link>
          </li>
          <li className="col-span-2">
            <Link href="/owner/notifications" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-[12px] border border-line px-4 py-3.5 text-[14px]">
              <Bell className="h-[18px] w-[18px]" aria-hidden />
              Мэдэгдэл
            </Link>
          </li>
        </ul>
        <span className="hidden"><X /></span>
      </Modal>
    </>
  );
}
