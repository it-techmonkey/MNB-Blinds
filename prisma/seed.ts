import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Match Next.js so seed uses the same DATABASE_URL / ADMIN_* as `next dev` (.env.local overrides .env).
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

async function main() {
  const adminName = (process.env.ADMIN_NAME ?? "Admin").trim();
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@mnbblinds.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "MnbBlinds#2026!";

  const rawUrl = process.env.DATABASE_URL ?? "";
  const masked = rawUrl.replace(/:([^:@/]{1,})@/, ":****@");
  console.log(`Seed using DATABASE_URL host: ${masked ? masked.split("@").pop()?.slice(0, 80) : "(missing)"}`);

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash },
    create: { name: adminName, email: adminEmail, passwordHash },
  });

  console.log(`Admin user ready: ${adminName} <${adminEmail}>`);
  console.log(`Sign in with: ${adminEmail} / ${adminPassword}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
