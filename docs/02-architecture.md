# 02 — Architecture

## System overview

```
 ┌──────────────┐   ┌──────────────┐
 │ Flutter app  │   │  Dashboard   │  Angular SPA (static files)
 └──────┬───────┘   └──────┬───────┘
        │   HTTPS / JSON   │
        ▼                  ▼
 ┌──────────────────────────────────┐
 │ Nginx (TLS, reverse proxy, gzip) │   Hostinger VPS
 └──────────────┬───────────────────┘
                ▼
 ┌──────────────────────────────────┐
 │ NestJS API  /api/v1/*            │──► FCM (push notifications)
 │ PM2 / Docker, auto-restart       │──► Local file storage (protected)
 └──────────────┬───────────────────┘
                ▼
 ┌──────────────────────────────────┐
 │ PostgreSQL 16  (daily backups)   │
 └──────────────────────────────────┘
```

**One API for all clients.** The dashboard and the mobile app call the same endpoints. What each caller gets back is decided by its **role** and **data ownership** on the server, never by the UI.

## Monorepo layout

```
troofn/
├─ apps/
│  ├─ api/          NestJS REST API
│  └─ dashboard/    Angular admin dashboard
├─ packages/
│  └─ shared/       @troofn/shared: Role enum, API envelope types, constants
├─ docs/            Planning & engineering docs (you are here)
├─ .github/         CI workflow, PR template
└─ docker-compose.yml   Local PostgreSQL (+ pgAdmin)
```

Managed with **pnpm workspaces**. Each app keeps its own official CLI (`nest`, `ng`) and can be built and deployed independently. See [ADR-0001](adr/0001-pnpm-monorepo.md).

### `packages/shared`

The contract between the backend and the frontend. Put here **only** things both sides need:

- `Role` enum and role groups
- `ApiResponse<T>`, `ApiError`, `PaginationMeta`, `PaginationQuery`
- `JwtPayload`, `AuthUser`
- constants (API prefix/version, page sizes, languages)

It is built with `tsdown` into ESM + CJS, so both Angular and Nest consume it. **Run `pnpm build:shared` after changing it** (`pnpm dev` does this for you).

> Do not put NestJS decorators, Angular code or DB entities in `shared`.

## API (`apps/api`)

```
src/
├─ main.ts                 bootstrap: helmet, CORS, /api prefix, URI versioning (v1), ValidationPipe, Swagger
├─ app.module.ts           root module: config, logger, throttler, prisma, global guards/filters/interceptors
├─ config/                 typed configuration + Joi env validation (app refuses to start on bad env)
├─ common/
│  ├─ decorators/          @Public(), @CurrentUser(), @AllowPendingPasswordChange()
│  ├─ filters/             AllExceptionsFilter → { success:false, error:{…} }
│  ├─ interceptors/        TransformResponseInterceptor → { success:true, data, meta? }
│  └─ dto/                 PaginationQueryDto
├─ database/               PrismaModule (global) + PrismaService (lazy connection)
├─ generated/prisma/       generated Prisma client (git-ignored)
└─ modules/                one folder per feature module
   ├─ health/              GET /health, GET /health/ready
   ├─ auth/                (skeleton) login / refresh / logout / me
   └─ users/               (skeleton)
prisma/schema.prisma       DB schema (models added in the DB phase)
prisma.config.ts           Prisma CLI config (reads DATABASE_URL from .env)
test/                      e2e tests (Vitest + Supertest)
```

### Feature module anatomy

```
modules/clients/
├─ clients.module.ts
├─ clients.controller.ts        HTTP only: routing, @Roles, DTOs, Swagger decorators
├─ clients.service.ts           business logic + ownership checks + Prisma queries
├─ dto/
│  ├─ create-client.dto.ts      class-validator + @ApiProperty
│  ├─ update-client.dto.ts      PartialType(CreateClientDto)
│  └─ client-query.dto.ts       extends PaginationQueryDto
├─ clients.service.spec.ts
└─ (entities/ or mappers/ if responses must hide fields, e.g. accountant sees contract value only)
```

### Request pipeline

```
Request → helmet/CORS → ThrottlerGuard → JwtAuthGuard → PermissionsGuard → ValidationPipe
        → Controller (@Access() scope) → Service (scope → Prisma where) → TransformResponseInterceptor → Response
Errors anywhere → AllExceptionsFilter → standard error envelope
(* added in the auth phase)
```

## Dashboard (`apps/dashboard`)

```
src/
├─ app/
│  ├─ core/                 app-wide singletons. No UI.
│  │  ├─ auth/              AuthService (current user, token)
│  │  ├─ guards/            authGuard, roleGuard(...roles)
│  │  ├─ interceptors/      authInterceptor (Bearer), errorInterceptor (401 → login, toast)
│  │  ├─ i18n/              Transloco loader + LanguageService (lang + RTL)
│  │  ├─ navigation/        NAV_GROUPS: the single source for the sidebar & planned routes
│  │  └─ services/          ApiService (typed HttpClient wrapper), NotificationService
│  ├─ layout/               MainLayout (sidenav + toolbar), AuthLayout, Sidebar, Topbar
│  ├─ shared/               reusable dumb components / pipes / directives (PageHeader…)
│  ├─ features/             one folder per feature, lazy-loaded
│  │  ├─ home/  auth/login/  coming-soon/  not-found/
│  ├─ app.config.ts         providers: router, http, i18n, icons
│  ├─ app.routes.ts
│  └─ app.ts                root: dir wrapper + router-outlet
├─ environments/            apiUrl per environment
├─ styles/                  tailwind.css (utilities + theme tokens), _theme-colors.scss (Material palette)
└─ styles.scss              Material theme (brand maroon, fonts)
public/i18n/{ar,en}.json    translations
```

Path aliases: `@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*`.

### Feature folder anatomy

```
features/clients/
├─ clients.routes.ts            lazy child routes (list, new, :id, :id/edit)
├─ data/
│  ├─ client.model.ts           interfaces for this feature
│  └─ clients.service.ts        calls ApiService
├─ client-list/                 page: mat-table + paginator + search
├─ client-form/                 page/dialog: reactive form
└─ client-details/
```

### Dashboard rules

- Standalone components, **signals** for state, `ChangeDetectionStrategy.OnPush` everywhere.
- Components never call `HttpClient` directly. Go through a feature service, which uses `ApiService`.
- Every UI string goes through Transloco (`'key' | transloco`) and must exist in **both** `ar.json` and `en.json`.
- Use logical CSS (`ms-*`, `me-*`, `ps-*`, `start-*`, `end-*`, `border-e`) and never `left`/`right`, so RTL works for free.
- Material components first. Tailwind is for layout/spacing around them. Material's styles are unlayered and beat Tailwind utilities on Material host elements, so put utilities on a wrapper `<div>` (or use `!` important) instead of on `<mat-card-content>`, `<mat-sidenav-content>`, etc.

## Environments

| Env        | API                    | Dashboard          | DB                   |
| ---------- | ---------------------- | ------------------ | -------------------- |
| local      | `localhost:3000`       | `localhost:4200`   | Docker Postgres      |
| staging    | `staging.<domain>/api` | `staging.<domain>` | separate DB on VPS   |
| production | `<domain>/api`         | `<domain>`         | production DB on VPS |

See [07-deployment.md](07-deployment.md).
