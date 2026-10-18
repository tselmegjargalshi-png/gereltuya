import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("container-page scroll-mt-24 py-14 md:py-20", className)}>
      <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
          <h2 className="font-display text-[2rem] leading-[1.1] md:text-[2.75rem]">{title}</h2>
          {description ? <p className="mt-3 text-[15px] leading-relaxed text-stone md:text-base">{description}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-ink">
            {action.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ScrollRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none md:mx-0 md:grid md:overflow-visible md:px-0", className)}>
      {children}
    </div>
  );
}
