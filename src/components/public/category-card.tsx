import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/cn";

export function CategoryCard({
  slug,
  name,
  imageUrl,
  count,
  base = "",
  className,
}: {
  slug: string;
  name: string;
  imageUrl: string;
  count: number;
  base?: string;
  className?: string;
}) {
  return (
    <Link
      href={`${base}/search?category=${slug}`}
      className={cn("group relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-ivory", className)}
    >
      <SmartImage
        src={imageUrl}
        alt=""
        fill
        sizes="(min-width: 1024px) 200px, 40vw"
        fallbackLabel={name}
        className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 p-4 text-paper">
        <span className="block text-[16px] font-semibold leading-tight">{name}</span>
        <span className="mt-0.5 block text-[12px] text-paper/80">{count} үйлчилгээ</span>
      </span>
    </Link>
  );
}
