/**
 * Writes the API description to a file: `pnpm openapi:export [path]` (default openapi.json).
 * Needs no running server and no database: it only reads the code. The file can be opened in
 * Swagger Editor or Postman, or fed to a generator such as openapi-generator (Dart for Flutter).
 */
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// The app validates its environment on start. Nothing here connects or signs a token, so
// placeholders are enough when the real values are not set (for example in CI).
process.env.NODE_ENV = 'test'; // also skips the startup data step
process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@localhost:5432/openapi';
process.env.JWT_ACCESS_SECRET ??= 'openapi-export-placeholder-access-secret';
process.env.REFRESH_TOKEN_SECRET ??= 'openapi-export-placeholder-refresh-secret';

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('../app.module.js');
const { configureApp } = await import('../main.js');
const { buildOpenApiDocument } = await import('../openapi.js');

const app = await NestFactory.create(AppModule, { logger: false });
configureApp(app);
const document = buildOpenApiDocument(app);
await app.close();

const target = resolve(process.argv[2] ?? 'openapi.json');
await writeFile(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`OpenAPI: ${Object.keys(document.paths).length} paths written to ${target}`);
