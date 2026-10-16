import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, API_VERSION } from '@troofn/shared';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/index.js';
import { buildOpenApiDocument } from './openapi.js';

/** Global HTTP setup — shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, buildOpenApiDocument(app));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);

  app.useLogger(app.get(Logger));
  // Trust the reverse proxy for the client IP (rate limits, session IPs). 'loopback'
  // covers nginx on the same host; in Docker the dashboard's nginx is on the bridge
  // network, so TRUST_PROXY adds 'uniquelocal' there. See deploy/docker-compose.yml.
  app.set('trust proxy', config.get('app.trustProxy', { infer: true }));
  app.use(helmet());
  app.enableCors({ origin: config.get('app.corsOrigins', { infer: true }), credentials: true });
  app.enableShutdownHooks();
  configureApp(app);

  if (config.get('app.env', { infer: true }) !== 'production') {
    setupSwagger(app);
  }

  await app.listen(config.get('app.port', { infer: true }));
}

if (process.env.NODE_ENV !== 'test') {
  await bootstrap();
}
