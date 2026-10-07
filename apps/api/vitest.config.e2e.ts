import 'dotenv/config';
import { defineConfig } from 'vitest/config';

/**
 * E2E tests run the real app against a separate database (`troofn_test` by default),
 * so they never touch development data. test/setup/global-setup.ts creates it,
 * applies migrations and seeds it once per run.
 */
const devUrl = process.env.DATABASE_URL ?? '';
const alreadyTest = /_test(\?|$)/.test(devUrl); // config may be evaluated more than once
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  (alreadyTest ? devUrl : devUrl.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2'));

const testEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  // Rate limits are tested on purpose in their own test; elsewhere they'd only get in the way.
  THROTTLE_LIMIT: '10000',
  AUTH_LOGIN_RATE_LIMIT: '10000',
};
// `test.env` reaches the test workers only; globalSetup runs in this process, so set it here too.
Object.assign(process.env, testEnv);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup/global-setup.ts'],
    // Test files share one database, so run them one at a time.
    fileParallelism: false,
    env: testEnv,
  },
});
