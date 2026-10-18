import Link from "next/link";
import { cn } from "@/lib/cn";

/** GERELTUYA mark: a quiet horizon line with a single ray of light ("гэрэл туяа"). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)} fill="none">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 20.5h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 20.5a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 6.5v6.5" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-[1.35rem] font-semibold uppercase tracking-[0.22em]", className)}>Gereltuya</span>;
}

export function Logo({ href = "/", className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 text-ink", className)} aria-label="GERELTUYA нүүр хуудас">
      <LogoMark />
      {compact ? null : <Wordmark />}
    </Link>
  );
}
