"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function MobileNav({ items, signedIn }: { items: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Цэс хаах" : "Цэс нээх"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ivory"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-16 border-b border-line bg-paper px-5 pb-6 pt-2 shadow-[var(--shadow-lift)]"
          >
            <nav aria-label="Гар утасны цэс" className="flex flex-col">
              {items.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b border-line py-4 text-[17px]">
                  {item.label}
                </Link>
              ))}
              {signedIn ? null : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-full border border-sand py-3 text-center text-sm font-medium">
                    Нэвтрэх
                  </Link>
                  <Link href="/register/business" onClick={() => setOpen(false)} className="rounded-full bg-ink py-3 text-center text-sm font-medium text-paper">
                    Бизнесээ бүртгүүлэх
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
