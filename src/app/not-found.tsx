import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="eyebrow mt-16">404</p>
      <h1 className="mt-3 font-display text-5xl">Хуудас олдсонгүй</h1>
      <p className="mt-3 max-w-md text-stone">Таны хайсан хуудас байхгүй эсвэл зөөгдсөн байна.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-8")}>
        Нүүр хуудас руу очих
      </Link>
    </div>
  );
}
