import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { SearchView } from "@/components/public/search-view";

export const metadata: Metadata = { title: "Хайх" };

export default async function AppSearch({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, user] = await Promise.all([searchParams, requireUser()]);
  return <SearchView raw={raw} base="/app" userId={user.id} />;
}
