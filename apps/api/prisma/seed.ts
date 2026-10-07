/**
 * Database seed: `pnpm db:seed` (runs `prisma db seed`, configured in prisma.config.ts).
 * - RBAC (roles, permissions, grants) in every environment.
 * - Demo clients and one user per role, except in production.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { isStrongPassword } from '../src/modules/auth/password.js';
import { seedDemoData } from './seed/demo.seed.js';
import { seedRbac } from './seed/rbac.seed.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  await seedRbac(prisma);

  if (process.env.NODE_ENV === 'production') {
    console.log('Production: demo data skipped.');
    return;
  }

  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (!password || !isStrongPassword(password)) {
    throw new Error('Set SEED_DEFAULT_PASSWORD (8+ chars, a letter and a digit) in apps/api/.env');
  }
  await seedDemoData(prisma, password);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
