import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SmartImage } from "@/components/ui/smart-image";
import { IMG, unsplash } from "@/lib/images";

export function AuthShell({ title, subtitle, children, footer, image = IMG.interiors[0] }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; image?: string }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-[2.4rem] leading-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-[15px] text-stone">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-center text-sm text-stone">{footer}</div> : null}
        </main>
        <p className="text-[12px] text-mute">
          <Link href="/" className="hover:text-ink">GERELTUYA</Link> · Өөртөө зориулсан цагаа захиалаарай.
        </p>
      </div>
      <div className="relative hidden lg:block">
        <SmartImage src={unsplash(image, 1400)} alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
        <p className="absolute bottom-12 left-12 right-12 font-display text-4xl leading-tight text-paper">
          Салон, үйлчилгээ, мэргэжилтнээ сонгоод хүссэн цагаа хэдхэн алхмаар захиалаарай.
        </p>
      </div>
    </div>
  );
}
