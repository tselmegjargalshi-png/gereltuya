import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
