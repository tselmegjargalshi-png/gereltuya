"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/auth";

export function AccountMenu({ name, avatarUrl, homeHref, homeLabel }: { name: string; avatarUrl?: string | null; homeHref: string; homeLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-sand bg-surface py-1 pl-1 pr-3 text-sm transition-colors hover:border-ink/40"
      >
        <Avatar name={name} src={avatarUrl} size={30} />
        <span className="hidden max-w-[110px] truncate sm:block">{name}</span>
        <ChevronDown className="h-4 w-4 text-stone" aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[14px] border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]">
          <Link
            role="menuitem"
            href={homeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm hover:bg-ivory"
          >
            <LayoutDashboard className="h-4 w-4 text-stone" aria-hidden />
            {homeLabel}
          </Link>
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm hover:bg-ivory">
              <LogOut className="h-4 w-4 text-stone" aria-hidden />
              Гарах
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
