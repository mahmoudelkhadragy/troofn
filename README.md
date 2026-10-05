# Troofn Business Gate

Monorepo for the **Troofn Business Gate** platform:

| App           | Path                                 | Stack                                                             | Purpose                                                           |
| ------------- | ------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| **API**       | [`apps/api`](apps/api)               | NestJS 12 · Prisma 7 · PostgreSQL 16                              | One REST API serving the dashboard **and** the Flutter mobile app |
| **Dashboard** | [`apps/dashboard`](apps/dashboard)   | Angular 22 · Angular Material · Tailwind · Transloco (AR/EN, RTL) | Admin dashboard for CRUD across the whole system                  |
| **Shared**    | [`packages/shared`](packages/shared) | TypeScript                                                        | Roles, API response types and constants used by both apps         |

> The Flutter mobile app lives in its own repository and consumes the same API.

## Quick start

```bash
nvm use                       # Node 24 (see .nvmrc)
corepack enable               # or: npm i -g pnpm@10
pnpm install                  # installs everything + git hooks
cp apps/api/.env.example apps/api/.env
pnpm db:up                    # PostgreSQL in Docker (optional until the DB phase)
pnpm dev                      # API on :3000 and dashboard on :4200
```

| URL                                       | What                                |
| ----------------------------------------- | ----------------------------------- |
| http://localhost:4200                     | Dashboard                           |
| http://localhost:3000/api/v1/health       | API liveness                        |
| http://localhost:3000/api/v1/health/ready | API readiness (checks the database) |
| http://localhost:3000/api/docs            | Swagger / OpenAPI docs              |

## Scripts (run from the repo root)

| Command                               | Description                                              |
| ------------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                            | Build `shared`, then run API + dashboard in watch mode   |
| `pnpm dev:api` / `pnpm dev:dashboard` | Run one app                                              |
| `pnpm build`                          | Production build of everything                           |
| `pnpm lint`                           | Lint all packages (oxlint for API, ESLint for dashboard) |
| `pnpm test` / `pnpm test:e2e`         | Unit tests (Vitest) / API end-to-end tests               |
| `pnpm format`                         | Format with Prettier                                     |
| `pnpm db:up` / `pnpm db:down`         | Start / stop local PostgreSQL                            |
| `pnpm db:tools`                       | PostgreSQL + pgAdmin on http://localhost:5050            |

## Documentation

Start with **[docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)**, which covers how we work. Then see the [docs index](docs/README.md) for architecture, roles, API conventions, the database plan, the roadmap and deployment.
