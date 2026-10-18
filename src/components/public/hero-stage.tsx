"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Star, CalendarCheck2 } from "lucide-react";
import { useRef } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney, formatNextAvailable } from "@/lib/format";

export type HeroBusiness = {
  slug: string;
  name: string;
  coverUrl: string | null;
  categories: string[];
  ratingAvg: number;
  reviewCount: number;
  nextAvailable: string | null;
};
export type HeroSpecialist = { name: string; title: string; photoUrl: string | null; ratingAvg: number; nextAvailable: string | null };
export type HeroService = { name: string; durationMin: number; price: number };

/** Layered, softly parallaxed booking composition. Pure CSS transforms, no WebGL. */
export function HeroStage({
  business,
  specialist,
  service,
}: {
  business: HeroBusiness;
  specialist: HeroSpecialist | null;
  service: HeroService | null;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 18 });
  const sy = useSpring(my, { stiffness: 80, damping: 18 });

  const rotY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const aX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const aY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const bX = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const bY = useTransform(sy, [-0.5, 0.5], [12, -12]);

  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType === "touch") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative mx-auto aspect-[5/6] w-full max-w-[520px] [perspective:1400px]"
    >
      <motion.div style={reduce ? undefined : { rotateX: rotX, rotateY: rotY }} className="absolute inset-0 [transform-style:preserve-3d]">
        <div className="absolute inset-x-[8%] inset-y-[3%] overflow-hidden rounded-[28px] bg-ivory shadow-[var(--shadow-float)]">
          <SmartImage
            src={business.coverUrl ?? ""}
            alt={`${business.name} салоны дотор тал`}
            fill
            priority
            sizes="(min-width: 1024px) 460px, 90vw"
            fallbackLabel={business.name}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        </div>

        <motion.div
          style={reduce ? undefined : { x: aX, y: aY, translateZ: 60 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -left-2 top-[10%] w-[62%] rounded-[16px] border border-line bg-surface/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:-left-8"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-mute">Онцлох бизнес</p>
          <Link href={`/b/${business.slug}`} className="mt-1.5 block text-[15px] font-semibold tracking-wide hover:text-accent">
            {business.name}
          </Link>
          <p className="mt-0.5 text-[12px] text-stone">{business.categories.slice(0, 3).join(" • ")}</p>
          <div className="mt-2.5 flex items-center gap-1.5 text-[13px]">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
            <span className="font-semibold tabular">{business.ratingAvg.toFixed(1)}</span>
            <span className="text-stone">{business.reviewCount} үнэлгээ</span>
          </div>
          <p className="mt-2 inline-flex rounded-full bg-success-soft px-2.5 py-1 text-[11.5px] font-medium text-success">
            {formatNextAvailable(business.nextAvailable)}
          </p>
        </motion.div>

        <motion.div
          style={reduce ? undefined : { x: bX, y: bY, translateZ: 90 }}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -right-2 bottom-[7%] w-[66%] rounded-[18px] border border-line bg-surface p-4 shadow-[var(--shadow-float)] sm:-right-8"
        >
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-mute">
            <CalendarCheck2 className="h-3.5 w-3.5 text-accent" aria-hidden />
            Захиалга
          </div>
          <dl className="mt-3 space-y-2 text-[13px]">
            {service ? (
              <div className="flex justify-between gap-3">
                <dt className="text-stone">Үйлчилгээ</dt>
                <dd className="text-right font-medium">{service.name}</dd>
              </div>
            ) : null}
            {specialist ? (
              <div className="flex justify-between gap-3">
                <dt className="text-stone">Мэргэжилтэн</dt>
                <dd className="font-medium">{specialist.name}</dd>
              </div>
            ) : null}
            {service ? (
              <div className="flex justify-between gap-3">
                <dt className="text-stone">Үнэ</dt>
                <dd className="font-semibold tabular">{formatMoney(service.price)}</dd>
              </div>
            ) : null}
          </dl>
          <Link
            href={`/book/${business.slug}`}
            className="mt-3.5 flex h-10 w-full items-center justify-center rounded-full bg-ink text-[13px] font-medium text-paper transition-colors hover:bg-charcoal"
          >
            Цаг авах
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
