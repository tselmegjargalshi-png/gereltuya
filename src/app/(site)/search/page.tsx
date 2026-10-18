import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { SearchView } from "@/components/public/search-view";

export const metadata: Metadata = {
  title: "Салон, мэргэжилтэн хайх",
  description: "Үс, хумс, сормуус, хөмсөг, барбер, спа. Үнэ, үнэлгээ, байршлаар шүүж, хүссэн цагаа захиалаарай.",
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, user] = await Promise.all([searchParams, getCurrentUser()]);
  return <SearchView raw={raw} userId={user?.id} />;
}
