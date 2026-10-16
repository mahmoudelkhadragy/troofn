import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION } from '@troofn/shared';

/** The OpenAPI document of the running app. Used by Swagger UI (main.ts) and `pnpm openapi:export`. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Troofn Business Gate API')
    .setDescription('REST API for the Troofn dashboard and mobile app')
    .setVersion(API_VERSION)
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
