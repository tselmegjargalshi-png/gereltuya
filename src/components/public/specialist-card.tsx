import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { buttonClass } from "@/components/ui/button";
import { formatNextAvailable } from "@/lib/format";
import type { SpecialistCardData } from "@/server/discovery";
import { cn } from "@/lib/cn";

export function SpecialistCard({ specialist, base = "", className }: { specialist: SpecialistCardData; base?: string; className?: string }) {
  return (
    <article className={cn("group flex flex-col", className)}>
      <Link href={`${base}/s/${specialist.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-[14px] bg-ivory" aria-label={specialist.name}>
        <SmartImage
          src={specialist.photoUrl ?? ""}
          alt=""
          fill
          sizes="(min-width: 1024px) 280px, 50vw"
          fallbackLabel={specialist.name}
          className="object-cover object-top transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pb-3 pt-10 text-[12px] font-medium text-paper">
          {specialist.businessName}
        </span>
      </Link>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[17px] font-semibold leading-tight">
              <Link href={`${base}/s/${specialist.id}`} className="hover:text-accent">
                {specialist.name}
              </Link>
            </h3>
            <p className="mt-0.5 text-[13px] text-stone">{specialist.title}</p>
          </div>
          <Rating value={specialist.ratingAvg} />
        </div>
        <p className="mt-2 text-[13px] text-stone">{specialist.experienceYears} жилийн туршлагатай</p>
        <p className="mt-0.5 text-[12px] font-medium text-success">{formatNextAvailable(specialist.nextAvailable)}</p>
        <Link
          href={`${base}/book/${specialist.businessSlug}?staff=${specialist.id}`}
          className={buttonClass("outline", "sm", "mt-3.5 w-full")}
        >
          Цаг авах
        </Link>
      </div>
    </article>
  );
}
