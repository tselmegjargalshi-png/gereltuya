import Link from "next/link";
import { MapPin } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Rating } from "@/components/ui/rating";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { buttonClass } from "@/components/ui/button";
import { formatMoney, formatNextAvailable } from "@/lib/format";
import type { BusinessCardData } from "@/server/discovery";
import { cn } from "@/lib/cn";

export function BusinessCard({
  business,
  base = "",
  saved,
  signedIn = false,
  priority,
  className,
  sizes = "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 90vw",
}: {
  business: BusinessCardData;
  /** "" for the public site, "/app" for the customer app. */
  base?: string;
  saved?: boolean;
  signedIn?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const href = `${base}/b/${business.slug}`;
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-ivory">
        <Link href={href} className="absolute inset-0" aria-label={business.name}>
          <SmartImage
            src={business.coverUrl ?? ""}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            fallbackLabel={business.name}
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.035]"
          />
        </Link>
        <div className="absolute right-3 top-3">
          <FavoriteButton businessId={business.id} initial={Boolean(saved)} signedIn={signedIn} />
        </div>
        {business.openNow ? (
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-medium text-success backdrop-blur">Нээлттэй</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[17px] font-semibold leading-tight tracking-tight">
            <Link href={href} className="hover:text-accent">
              {business.name}
            </Link>
          </h3>
          <Rating value={business.ratingAvg} />
        </div>
        <p className="mt-1 text-[13px] text-stone">{business.categories.slice(0, 3).join(" • ")}</p>
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-stone">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{business.district}</span>
          {business.distanceKm != null ? <span className="shrink-0 text-mute">· {business.distanceKm.toFixed(1)} км</span> : null}
          <span className="shrink-0 text-mute">· {business.reviewCount} үнэлгээ</span>
        </p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3.5">
          <div className="min-w-0">
            <p className="text-[12px] text-mute">Эхлэх үнэ</p>
            <p className="text-[15px] font-semibold tabular">{business.minPrice != null ? formatMoney(business.minPrice) : "Үнэ тодорхойгүй"}</p>
            <p className="mt-0.5 truncate text-[12px] font-medium text-success">{formatNextAvailable(business.nextAvailable)}</p>
          </div>
          <Link href={`${base}/book/${business.slug}`} className={buttonClass("primary", "sm", "shrink-0")}>
            Цаг авах
          </Link>
        </div>
      </div>
    </article>
  );
}
