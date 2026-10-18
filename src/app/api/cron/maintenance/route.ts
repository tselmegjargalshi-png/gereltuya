import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

/** Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET when it is set. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Эрх байхгүй." }, { status: 401 });
  }
  const result = await runMaintenance();
  return NextResponse.json({ ok: true, ...result });
}
