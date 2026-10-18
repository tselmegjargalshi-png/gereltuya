import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Diagnostic endpoint: reports whether the database is reachable and seeded. Never returns credentials.
export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };
  try {
    const [users, businesses] = await Promise.all([db.user.count(), db.business.count()]);
    return NextResponse.json({ ok: true, env, users, businesses });
  } catch (e) {
    const err = e as { name?: string; code?: string; message?: string };
    const message = (err.message ?? "").replace(/[a-z]+:\/\/\S+/gi, "<url>").slice(0, 600);
    console.error("[health] database check failed", err.name, err.code, message);
    return NextResponse.json({ ok: false, env, error: { name: err.name, code: err.code, message } }, { status: 503 });
  }
}
