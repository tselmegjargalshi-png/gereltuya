import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[14px] border border-dashed border-sand px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 text-mute">{icon}</div> : null}
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-stone">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
