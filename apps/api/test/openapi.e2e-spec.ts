import { buildOpenApiDocument } from '../src/openapi.js';
import { createTestApp } from './helpers/app.js';

/** The document handed to the Flutter developer (`pnpm openapi:export`) must describe the real API. */
describe('OpenAPI document (e2e)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let document: ReturnType<typeof buildOpenApiDocument>;

  beforeAll(async () => {
    app = await createTestApp();
    document = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the routes under the versioned prefix', () => {
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/me',
        '/api/v1/users',
        '/api/v1/clients',
        '/api/v1/roles',
      ]),
    );
  });

  it('documents the login body, including the required app', () => {
    const login = document.components?.schemas?.LoginDto as {
      required?: string[];
      properties: Record<string, { enum?: string[] }>;
    };
    expect(login.required).toEqual(expect.arrayContaining(['username', 'password', 'app']));
    expect(login.properties.app.enum).toEqual(['DASHBOARD', 'MOBILE']);
  });

  it('leaves the optional session details (platform, deviceName) out of the login body', () => {
    const login = document.components?.schemas?.LoginDto as { properties: Record<string, unknown> };
    expect(Object.keys(login.properties).sort()).toEqual(['app', 'password', 'username']);
  });

  it('describes bearer authentication', () => {
    expect(document.components?.securitySchemes).toHaveProperty('bearer');
  });
});
