// Runs on hosted builds (Vercel): applies migrations and seeds demo data once, only when the database is empty.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (!process.env.VERCEL && process.env.DEPLOY_DB !== "1") {
  console.log("[deploy-db] skipped (not a hosted build)");
  process.exit(0);
}
if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
  console.log("[deploy-db] skipped (no database url)");
  process.exit(0);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

run("npx prisma migrate deploy");
const db = new PrismaClient();
try {
  const users = await db.user.count();
  if (users === 0 && process.env.SEED_DEMO !== "0") {
    console.log("[deploy-db] empty database, seeding demo data");
    run("npx tsx prisma/seed.ts");
  } else {
    console.log(`[deploy-db] ${users} users present, seed skipped`);
  }
} finally {
  await db.$disconnect();
}
