import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/index.css";
import "@fontsource/cormorant-garamond/cyrillic-500.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/cyrillic-600.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Pages read live data (database, session cookie); never prerender them at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "GERELTUYA | Өөртөө зориулсан цагаа захиалаарай",
    template: "%s | GERELTUYA",
  },
  description:
    "Салон, үйлчилгээ, мэргэжилтнээ сонгоод хүссэн цагаа хэдхэн алхмаар захиалаарай. Үс, хумс, сормуус, хөмсөг, барбер, спа.",
  applicationName: "GERELTUYA",
  openGraph: {
    type: "website",
    siteName: "GERELTUYA",
    locale: "mn_MN",
    title: "GERELTUYA | Өөртөө зориулсан цагаа захиалаарай",
    description: "Салон, үйлчилгээ, мэргэжилтнээ сонгоод хүссэн цагаа хэдхэн алхмаар захиалаарай.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Үндсэн агуулга руу очих
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
