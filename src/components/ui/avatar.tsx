import { SmartImage } from "./smart-image";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export function Avatar({ src, name, size = 40, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-ivory ring-1 ring-line", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <SmartImage src={src} alt={name} fill sizes={`${size * 2}px`} className="object-cover" fallbackLabel={name} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-stone">{initials(name)}</span>
      )}
    </span>
  );
}
