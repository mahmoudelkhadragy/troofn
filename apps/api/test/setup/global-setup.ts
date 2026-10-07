import { execSync } from 'node:child_process';
import pg from 'pg';

/**
 * Runs once before the e2e suite: creates the test database if it is missing,
 * applies all migrations and seeds it (RBAC + demo users).
 * DATABASE_URL here is the test URL set in vitest.config.e2e.ts.
 */
export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || !/_test(\?|$)/.test(new URL(url).pathname + '?')) {
    throw new Error(`Refusing to run e2e tests against a non-test database: ${url}`);
  }

  await createDatabaseIfMissing(url);

  const run = (command: string) =>
    execSync(command, { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url } });
  run('npx prisma migrate deploy');
  run('npx prisma db seed');
}

async function createDatabaseIfMissing(url: string): Promise<void> {
  const target = new URL(url);
  const database = target.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      database,
    ]);
    if (!rowCount) await client.query(`CREATE DATABASE "${database}"`);
  } finally {
    await client.end();
  }
}
