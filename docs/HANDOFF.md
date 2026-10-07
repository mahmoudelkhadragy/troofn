# Handoff: where the project stands

Paste this file (or point the next chat at it) to continue without re-explaining. Last updated 2026-10-08 (end of stage 1: DB design, auth, RBAC).

## Goal

Troofn Business Gate is a marketing-agency platform. This repo holds the **NestJS API** (serves the Angular dashboard and the Flutter mobile app, which lives in a separate repo) and the **Angular admin dashboard** for CRUD over the system. Stage 1 (this file's latest state) added the database design, authentication and permission-based authorization on the API. There is still **no dashboard UI** beyond the scaffold.

Source documents (outside the repo, in `/Users/user/Desktop/troofn/`): `Troofn_Technical_Plan_EN.docx` (stack, 7 roles, about 30 tables, endpoint list, timeline) and `خطة - Troofn Business Gate.pdf` (role-tagged tasks, 8-phase timeline).

## Repo

- Remote: https://github.com/mahmoudelkhadragy/troofn, branch `main`
- Commit `d0b3e59 chore: scaffold troofn monorepo` is pushed.
- Local path: `/Users/user/Desktop/troofn/project`

## Stack and decisions

| Area           | Choice                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo       | pnpm workspaces: `apps/api`, `apps/dashboard`, `packages/shared`                                                                            |
| Backend        | NestJS 12, ESM, Vitest and oxlint, Prisma 7.10 with `@prisma/adapter-pg`, PostgreSQL 16 (Docker, host port **5433**), `@nestjs/jwt`, argon2 |
| Frontend       | Angular 22, **Angular Material** (MIT), Tailwind 4 for layout utilities, Transloco                                                          |
| Languages      | Arabic (default, RTL) and English; `LanguageService` sets `<html lang dir>`                                                                 |
| Shared package | `@troofn/shared`, built with `tsdown` to ESM and CJS. Run `pnpm build:shared` after editing it                                              |
| Tooling        | Husky, lint-staged, Prettier, commitlint (Conventional Commits), GitHub Actions CI                                                          |
| Runtime        | Node 24 (via nvm, see `.nvmrc`), pnpm 10                                                                                                    |

Why these were chosen:

- **Material, not PrimeNG:** PrimeNG 22 requires a PrimeUI license key and shows a red "Invalid PrimeUI License" banner without one. The user chose Material.
- **Node 24:** Angular 22 needs Node ≥22.22, and the machine had Node 20.
- **Prisma 7.10, not 8:** 8.x is still a release candidate.
- **tsdown, not tsup:** tsup's type build fails under TypeScript 6.

## What exists

- **Database** (`apps/api/prisma`): migration `init_identity_access` with `roles`, `permissions`, `role_permissions` (with scope), `users`, `user_sessions`, `sectors`, `clients`, `client_team_members`, plus hand-written CHECK constraints. The **full design for all later modules** is in `docs/05-database-plan.md`. `pnpm db:seed` loads the RBAC matrix and demo data (3 clients, 9 users, one per role).
- **Auth** (`modules/auth`): login by username, argon2id, 15-minute JWT + rotating opaque refresh token (reuse detection), lockout (5 failures → 15 min, 423), per-IP rate limit on login/refresh, inactive user/client and "App Access" off → 403, change-password, logout and logout-all. Global `JwtAuthGuard`.
- **Authorization** (`modules/access-control`): `rbac.matrix.ts` is the source of truth for role → permission → scope. Global `PermissionsGuard` + `@RequirePermissions()` + `@Access()`, scope builders in `scopes/` (fail closed), `GET /roles`. The old `@Roles`/`RolesGuard` is gone.
- **Users admin** (`modules/users`): list, get, create, patch, reset-password. **Clients, read-only and scoped** (`modules/clients`): `GET /clients`, `GET /clients/:id` (404 outside scope).
- **Shared package**: `Role`, `Permission`, `PermissionScope`, auth types (`JwtPayload`, `LoginResponse`, `AuthUser`).
- **Tests**: 57 unit tests (matrix, password, tokens, guards, scopes) and 69 e2e tests (`apps/api/test`) against a separate `troofn_test` database, created and seeded automatically.
- **Dashboard**: still the scaffold (`core/` with a stub `AuthService`, empty `layout/`, `shared/`, one bare home page). Its `AuthService` is **not** wired to the new API yet.
- **Docs**: `docs/01`–`05`, `docs/plans/stage-1-auth-rbac.md` (the plan, with each step ticked), `docs/guides/01-auth-walkthrough.md` (how it works and how to test it), `apps/api/requests/auth.http` (click-through requests).

## What is not done

1. **Docs still missing** (linked from `docs/README.md`): `06-roadmap.md`, `07-deployment.md`, `DEVELOPMENT_GUIDE.md`, `adr/0001..0004`. `docs/02-architecture.md`'s dashboard section is still stale (describes removed layout/sidebar code).
2. **CI Postgres service** was added to `.github/workflows/ci.yml` but never run on GitHub. Check the Actions tab after the first push.
3. **Branch**: all stage-1 work is on `feature/auth-rbac` (from `develop`, from `main`). Nothing has been pushed or merged.
4. **Not built yet**: client CRUD (create/edit/deactivate), files, contracts, and every later module in `docs/05`. The dashboard login page.
5. **Deferred from the stage-1 review** (minor): a production bootstrap admin (the seed creates no users in production, so the first admin needs a one-off script); a cleanup job for expired/revoked `user_sessions` rows; the login limit of 5/min per IP may be too tight for an office sharing one IP, so tune `AUTH_LOGIN_RATE_LIMIT` for production.
6. **Known trade-offs**: access tokens stay valid until they expire (≤ 15 min) after logout or deactivation; the rate-limit counter is in memory (fine for one VPS process).

## Next steps

1. Review and merge `feature/auth-rbac` into `develop` (and push, when ready).
2. Dashboard: login page, layout shell, `AuthService` wired to `/auth/login`, `/auth/refresh`, `/auth/me`; route guards and menu from `permissions`.
3. Phase 2: `files` table, client create/edit (the Figma client form, including the client's users in one transaction), contracts and work plans.
4. Four business decisions are still open (needed before their phases): lead intake (webhooks or manual), chat (polling or Socket.io), payment gateway, attendance (fingerprint or app). `docs/05` lists 9 open questions in total.

## How to run

```bash
nvm use                                   # Node 24: every new terminal starts on the old Node
pnpm install
cp apps/api/.env.example apps/api/.env    # only on a fresh clone; then set real secrets
pnpm db:up                                # PostgreSQL on localhost:5433
pnpm db:migrate && pnpm db:seed
pnpm dev                                  # API :3000 (Swagger /api/docs), dashboard :4200
```

Also: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (needs `pnpm db:up`), `pnpm db:studio`.

## Working agreements with the user

- Keep to what was asked. The user stopped extra modules and UI mid-session ("we just needed the structure in first phase") and asked to leave what was built as it is.
- Commits follow Conventional Commits with scopes `api`, `dashboard`, `shared`, `docs`, `ci`, `deps`, `db` and `infra`. Husky runs Prettier and commitlint on commit.
- Ask before pushing. Docker, the OS and global installs are the user's machine, so say what you change there.
- Work step by step: after each step, commit, explain what was built and why, and say how to test it, then wait.
- No new unit tests (the user's instruction on 2026-10-08). Verify with e2e tests and manual API checks; keep the existing unit tests.
