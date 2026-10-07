import Joi from 'joi';

/** The app refuses to start if the environment is invalid. */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(7),
  AUTH_MAX_FAILED_LOGINS: Joi.number().integer().min(1).default(5),
  AUTH_LOCKOUT_MINUTES: Joi.number().integer().min(1).default(15),
  AUTH_LOGIN_RATE_LIMIT: Joi.number().integer().min(1).default(5),

  THROTTLE_TTL_MS: Joi.number().default(60_000),
  THROTTLE_LIMIT: Joi.number().default(100),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
});
