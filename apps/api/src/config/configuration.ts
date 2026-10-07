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
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
    limit: Number(process.env.THROTTLE_LIMIT ?? 100),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
