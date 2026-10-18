import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Үйлчлүүлэгчид",
    links: [
      { href: "/search", label: "Салон хайх" },
      { href: "/search?view=specialists", label: "Мэргэжилтнүүд" },
      { href: "/register", label: "Бүртгүүлэх" },
      { href: "/login", label: "Нэвтрэх" },
    ],
  },
  {
    title: "Бизнесүүдэд",
    links: [
      { href: "/register/business", label: "Бизнесээ бүртгүүлэх" },
      { href: "/#pricing", label: "Үнийн санал" },
      { href: "/#business", label: "Хянах самбар" },
      { href: "/login", label: "Бизнесийн нэвтрэлт" },
    ],
  },
  {
    title: "GERELTUYA",
    links: [
      { href: "/#faq", label: "Түгээмэл асуулт" },
      { href: "/terms", label: "Үйлчилгээний нөхцөл" },
      { href: "/privacy", label: "Нууцлалын бодлого" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-ivory/60">
      <div className="container-page grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 font-display text-xl leading-snug text-charcoal">Өөртөө зориулсан цагаа захиалаарай.</p>
          <p className="mt-4 text-sm text-stone">Улаанбаатар хот, Монгол улс</p>
          <p className="mt-1 text-sm text-stone">hello@gereltuya.mn · 7700 1010</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-charcoal transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-[13px] text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GERELTUYA. Бүх эрх хуулиар хамгаалагдсан.</p>
          <p>Демо өгөгдөл дахь бизнесүүд зохиомол болно.</p>
        </div>
      </div>
    </footer>
  );
}
