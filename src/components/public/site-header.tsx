import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { AccountMenu } from "@/components/shared/account-menu";
import { MobileNav } from "@/components/public/mobile-nav";
import { getCurrentUser, homeForRole } from "@/lib/auth/session";

export const PUBLIC_NAV = [
  { href: "/search", label: "Салон хайх" },
  { href: "/search?view=specialists", label: "Мэргэжилтнүүд" },
  { href: "/#business", label: "Бизнест зориулсан" },
  { href: "/#pricing", label: "Үнийн санал" },
];

const ROLE_HOME_LABEL = {
  CUSTOMER: "Миний хуудас",
  BUSINESS_OWNER: "Хянах самбар",
  STAFF: "Миний хуваарь",
  ADMIN: "Админ самбар",
} as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Үндсэн цэс" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm text-stone transition-colors hover:bg-ivory hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <AccountMenu name={user.name} avatarUrl={user.avatarUrl} homeHref={homeForRole(user.role)} homeLabel={ROLE_HOME_LABEL[user.role]} />
          ) : (
            <>
              <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-ink transition-colors hover:bg-ivory sm:block">
                Нэвтрэх
              </Link>
              <ButtonLink href="/register/business" variant="primary" size="sm" className="hidden sm:inline-flex">
                Бизнесээ бүртгүүлэх
              </ButtonLink>
            </>
          )}
          <MobileNav items={PUBLIC_NAV} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
