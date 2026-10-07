import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/index.js';
import { TransformResponseInterceptor } from './common/interceptors/index.js';
import { type AppConfig, configuration, envValidationSchema } from './config/index.js';
import { PrismaModule } from './database/index.js';
import { AccessControlModule, PermissionsGuard } from './modules/access-control/index.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    // ── Infrastructure ──
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        pinoHttp: {
          level:
            config.get('app.env', { infer: true }) === 'test'
              ? 'silent'
              : config.get('log.level', { infer: true }),
          transport:
            config.get('app.env', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        {
          ttl: config.get('throttle.ttl', { infer: true }),
          limit: config.get('throttle.limit', { infer: true }),
        },
      ],
    }),
    PrismaModule,

    // ── Feature modules (added per roadmap phase) ──
    HealthModule,
    AuthModule,
    AccessControlModule,
    UsersModule,
    ClientsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global guards run in this order: rate limit → valid access token → permission.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
