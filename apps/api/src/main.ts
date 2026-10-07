import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, API_VERSION } from '@troofn/shared';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/index.js';

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
  const config = new DocumentBuilder()
    .setTitle('Troofn Business Gate API')
    .setDescription('REST API for the Troofn dashboard and mobile app')
    .setVersion(API_VERSION)
    .addBearerAuth()
    .build();
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, SwaggerModule.createDocument(app, config));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);

  app.useLogger(app.get(Logger));
  // Behind Nginx on the same host: trust it for the client IP (rate limits, session IPs).
  app.set('trust proxy', 'loopback');
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
