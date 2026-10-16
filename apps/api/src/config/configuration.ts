/**
 * Typed application configuration. Read values through ConfigService:
 *   this.config.get('app.port', { infer: true })
 */
export const configuration = () => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // Express 'trust proxy'. A bare number means "trust N hops"; anything else is a
    // comma-separated list of names / IPs / subnets. Behind the dashboard's nginx
    // container this has to include the Docker bridge range, or req.ip is the proxy's
    // address for every caller and the per-IP login limit becomes a single global one.
    trustProxy: /^\d+$/.test(process.env.TRUST_PROXY ?? '')
      ? Number(process.env.TRUST_PROXY)
      : (process.env.TRUST_PROXY ?? 'loopback'),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
    refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? '',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
    maxFailedLogins: Number(process.env.AUTH_MAX_FAILED_LOGINS ?? 5),
    lockoutMinutes: Number(process.env.AUTH_LOCKOUT_MINUTES ?? 15),
    loginRateLimit: Number(process.env.AUTH_LOGIN_RATE_LIMIT ?? 5),
  },
  seed: {
    demoData: process.env.SEED_DEMO_DATA === 'true',
    password: process.env.SEED_DEFAULT_PASSWORD ?? '',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 100),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
