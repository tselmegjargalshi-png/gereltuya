import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-ivory text-charcoal",
  accent: "bg-accent-soft text-accent-deep",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  dark: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
