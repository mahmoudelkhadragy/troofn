> **Status:** approved 2026-10-08 · in progress on branch `feature/auth-rbac`. Progress is tracked per step in section 8.

# Plan: Troofn DB design + Authentication & Authorization (stage 1)

## Context

Troofn Business Gate is a role-based platform for a marketing agency and its clients: a NestJS API shared by the Angular dashboard and the Flutter app. The repo (`/Users/user/Desktop/troofn/project`) is a scaffold. It has typed config, envelope filter/interceptor, `PrismaService`, health module, `@Public`/`@Roles`/`@CurrentUser`, and an empty `schema.prisma`.

The earlier DB plan (`docs/05-database-plan.md`) came from the documents only. The Figma file has ~45 screens (the SRS used 19), and they change the model:

- **Login is by username.** Client users like `Wejnad#1` are created inside the client form, in the "صلاحيات التطبيق" block: role, username, password, status.
- **A client has a team.** The client form has a marketing manager and a project manager. The overview shows "account manager" and "execution team".
- **"App Access" toggle per client.** It gates whether that client's users can use the app.
- **Inactive clients show a red dot** (النخبة).
- **The Activity tab shows client devices and sessions.** The auth session table should record device info from day one.
- **Support is a chat** between the client and the project manager. One conversations model covers both support and project-team chat.
- **SOW** has a component library (categories, unit, frequency), per-client components, orders, and 7 Strike Campaign items.
- **Documents tab** holds invoices, transfers, reports & campaigns (monthly metrics), and meetings. **Financial tab** holds basic/proposal pricing (VAT 15%) and a promotion card.

**Goal of this stage:**

1. Write the full, normalized DB design for every module.
2. Migrate only the identity/access and clients-core tables.
3. Build authentication and DB-driven authorization (permissions with scope).
4. Seed one example user per role.
5. Expose auth, users-admin, and a read-only scoped clients API that proves scoping works.
6. Write a testing guide and explain each step.
7. No frontend work.

**Decisions (agreed with the user):**

- Design the whole DB now, but migrate only auth tables in this stage.
- Roles and permissions live in the DB, each with a scope.
- Include read-only `GET /clients` to prove scoping.
- Refresh token goes in the JSON body for web and mobile.
- `ADMIN` is a separate 7th role, using the existing `Role` enum in `packages/shared`.

---

## 1. Full database design (documented now, migrated per module)

Conventions (keep the existing ones from `docs/05`):

- Tables are `snake_case` and plural via `@@map`; columns use `@map`.
- PKs: `uuid(7)` `@db.Uuid` (time-ordered).
- Timestamps: `@db.Timestamptz(3)`; plain dates use `@db.Date`.
- Money: `Decimal(14,2)`.
- `deleted_at` (soft delete) on business tables.
- FKs are indexed and have an explicit `onDelete`: Restrict for business links, Cascade for owned children.
- Lookups that admins may extend become tables. Fixed workflow states become enums.
- Uploads are a single `files` table, which other tables reference.

| Module (phase)              | Tables (key relations)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity & access (NOW)** | `roles`, `permissions`, `role_permissions(role_id, permission_id, scope)`, `users(role_id, client_id?)`, `user_sessions(user_id)`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Clients core (NOW)**      | `sectors`, `clients(sector_id)`, `client_team_members(client_id, user_id, team_role)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Shared (P2)                 | `files(storage_key, mime, size, uploaded_by)`. Added to clients: `logo_file_id`, `commercial_register_file_id`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Contracts (P2)              | `contracts(client_id, code, type BASIC/ADDITIONAL, status, start, end, annual_value, file_id)`, `work_plans(contract_id)`, `work_plan_stages(work_plan_id, title, start, end, status, sort_order)`                                                                                                                                                                                                                                                                                                                                                        |
| Client app flags (P3)       | `client_sow_versions(client_id, version 1..4)` for the SOW 1.0–4.0 toggles. `clients.app_access_enabled` exists now                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| T-360 & strategy (P3)       | `strategic_axes` (lookup, 7 rows, shared by T-360 and strategy) · `t360_assessments(client_id, assessed_at, overall_score)` → `t360_axis_results(axis_id, score, summary, note)` → `t360_axis_elements(name, value, details jsonb, image_file_id)` · `competitors(client_id, logo_file_id)` + `competitor_axis_scores` · `strategic_plans(client_id)` → `strategic_plan_axes(axis_id, current, target)` → `strategic_plan_elements(name, development_idea)` · `strategic_plan_stages(title, date, status, category_id, description)` + `stage_categories` |
| SOW (P3)                    | `sow_component_categories`, `sow_component_catalog(category_id, unit, default_frequency)` (component library) · `client_sow_components(client_id, catalog_item_id?, quantity, monthly_quantity, quantity_label, frequency)` · `strike_campaigns(client_id, sequence_no, month)` → `strike_campaign_items(item_type_id, spec, status)` + `campaign_item_types` · `client_requests(client_id, category MARKETING/FINANCIAL, priority, status, requested_by)` + `request_attachments`. SOW "Orders" are the client's MARKETING requests: one table, not two  |
| Documents (P3/P6)           | `reports(client_id, type, period_month, file_id)`, `campaign_metrics(client_id, month, views, reach, clicks, followers)`, `meetings(client_id, title, starts_at, ends_at, url, status, summary)`                                                                                                                                                                                                                                                                                                                                                          |
| Finance (P6)                | `billing_plans(client_id, kind BASIC/PROPOSAL)` + `billing_plan_items(amount, recurrence)` · `invoices(client_id, contract_id?, number, subtotal, tax_rate, tax, total, status)` · `payments(invoice_id?, reference, amount, receipt_file_id, status)` · `payment_methods(client_id, gateway_token, brand, last4, exp)`. PAN and CVV are never stored                                                                                                                                                                                                     |
| HR (P4)                     | `departments`, `job_titles` · `employees(user_id? unique, job_title_id, hire_date, base_salary, shift_id)` · `work_shifts`, `holidays`, `attendance_records(employee_id, work_date, check_in, check_out, status, source)` · `leave_types`, `leave_requests` · `payroll_periods(month, status OPEN/CLOSED)` → `payslips` → `payslip_adjustments(BONUS/DEDUCTION)` · `performance_reviews`                                                                                                                                                                  |
| Leads (P4)                  | `leads(full_name, phone, source, campaign_name, external_id, status NEW/CONTACTED/INTERESTED/CONVERTED, received_at, contacted_by)` + `lead_status_history`. The sidebar month is derived from `received_at`, not stored                                                                                                                                                                                                                                                                                                                                  |
| Work & production (P5)      | `projects(client_id)`, `project_members`, `tasks(client_id, project_id?, assignee_id, priority, status, due_date)` (the HR Tasks tab and Flutter "my tasks"), `production_files`, `tapa_analyses` + `tapa_axis_answers(axis_key, data jsonb)`                                                                                                                                                                                                                                                                                                             |
| Comms (P5)                  | `conversations(type CLIENT_SUPPORT/PROJECT_TEAM, client_id, project_id?)`, `conversation_participants(can_send, last_read_at)`, `messages`, `message_attachments`, `notifications`, `device_tokens`                                                                                                                                                                                                                                                                                                                                                       |
| Audit & analytics (later)   | `audit_logs(actor, client_id?, entity, action, changes jsonb)`, `app_sessions`, `app_screen_views` (the Activity tab)                                                                                                                                                                                                                                                                                                                                                                                                                                     |

Business questions that block only their own modules: KPI formulas, leads webhooks vs manual entry, polling vs Socket.io, SOW version meaning, stage tag list, attendance source, payment gateway, and whether the client form's "contract start / renewal" belongs on the client or the contract. They go in `docs/05`.

## 2. Stage-1 schema (migration `init_identity_access`)

File: `apps/api/prisma/schema.prisma`

- **Enums:**
  - `RoleAudience` (STAFF, CLIENT)
  - `PermissionScope` (ALL, ASSIGNED, OWN_CLIENT, OWN)
  - `UserStatus` (ACTIVE, INACTIVE)
  - `ClientStatus` (ACTIVE, INACTIVE)
  - `ClientTeamRole` (MARKETING_MANAGER, PROJECT_MANAGER, EXECUTION)
  - `SessionPlatform` (WEB, IOS, ANDROID, UNKNOWN)
  - `SessionRevokeReason` (LOGOUT, LOGOUT_ALL, TOKEN_REUSE, PASSWORD_CHANGED, PASSWORD_RESET, USER_DEACTIVATED)
- **`roles`:**
  - `key` is unique and equals the `Role` enum value (`admin`, `client`, …).
  - Also `name_ar`, `name_en`, `audience`, `description`, `is_system`.
- **`permissions`:** `key` unique (`clients.read`), `module`, `description`.
- **`role_permissions`:** PK `(role_id, permission_id)`, plus `scope`. Cascade on delete.
- **`users`:**
  - Identity: `username` (unique, stored lowercase), `email?` (unique), `display_name`, `phone?`, `password_hash`.
  - Status and links: `status`, `role_id` (Restrict), `client_id?` (Restrict).
  - Security: `must_change_password`, `failed_login_attempts`, `locked_until?`, `last_login_at?`, `password_changed_at?`.
  - Audit and lifecycle: `created_by_id?` (self, SetNull), timestamps, `deleted_at?`.
- **`user_sessions`:**
  - `user_id` (Cascade), `refresh_token_hash`.
  - Device info: `platform`, `device_name?`, `user_agent?`, `ip_address?`.
  - Lifecycle: `created_at`, `last_used_at`, `expires_at`, `revoked_at?`, `revoke_reason?`.
  - One row per login and device. It also feeds the Activity tab later.
- **`sectors`:** `name_ar` (unique), `name_en`.
- **`clients`:**
  - `code` (unique, e.g. TID00S1W), `company_name`, `contact_name`, `email?` (unique), `phone?`, `website?`, `sector_id?`.
  - `legal_representative?`, `drive_url?`, `contract_start_date?` (Date), `renewal_period_months?` (SmallInt).
  - `app_access_enabled`, `status`, timestamps, `deleted_at?`.
- **`client_team_members`:** PK `(client_id, user_id)`, plus `team_role`, `assigned_at`, `assigned_by_id?`.
- **Custom SQL** added after `migrate dev --create-only`. Prisma can't express these, so this step also teaches how to extend a migration by hand:
  - `CHECK (username = lower(username))`
  - `CHECK (renewal_period_months > 0)`
  - `CHECK (failed_login_attempts >= 0)`
- **App-level rules** (cross-table, enforced in `UsersService`):
  - A CLIENT-audience role requires `client_id`.
  - A STAFF role requires `client_id IS NULL`.

## 3. Authorization design

- **Permission keys:** `packages/shared/src/enums/permission.enum.ts`. This is the full catalog for all modules (~45 keys, `module.action`). The dashboard and Flutter can use it for navigation later.
- **Matrix:** `apps/api/src/modules/access-control/rbac.matrix.ts` maps role → permission → scope. It is the source of truth for the seed. The seed syncs it into the DB idempotently and asserts that CLIENT roles only use `OWN_CLIENT`/`OWN`. The matrix comes from `docs/03`:
  - **admin:** everything with `ALL`, except payment cards and HR self-service.
  - **marketing_manager:** `ASSIGNED` on client data, `ALL` on leads.
  - **content_writer** and **employee:** `ASSIGNED`/`OWN`.
  - **Client roles:** `OWN_CLIENT`, each on its own subset of modules.
- **`AccessControlService`** loads `Map<roleKey, Map<permissionKey, scope>>` from the DB and caches it with a short TTL.
- **Guards** (global, in this order):
  1. `ThrottlerGuard`
  2. `JwtAuthGuard`: verifies the Bearer token and sets `request.user = {sub, role, clientId, sid, mcp}`. It skips `@Public()` routes, and blocks everything except `@AllowPendingPasswordChange()` routes while `mcp` (must change password) is true.
  3. `PermissionsGuard`: reads `@RequirePermissions('clients.read')`, returns 403 if missing, and attaches the resolved scope. The `@AccessScope()` param decorator then passes that scope into the service.
- **Scope → Prisma `where`** (`access-control/scopes/client-scope.ts`):
  - `ALL` → `{}`
  - `ASSIGNED` → `{ team: { some: { userId } } }`
  - `OWN_CLIENT` → `{ id: clientId }`
  - A record that exists but is outside the caller's scope returns **404**, so IDs can't be probed.
- **Replaced:** `common/guards/roles.guard.ts` and `common/decorators/roles.decorator.ts` are removed, so only one mechanism remains. Nothing uses them yet.

## 4. Authentication design

- **Passwords:** argon2id via the `argon2` package. Helpers live in `modules/auth/password.ts` and are reused by the seed. Policy: at least 8 characters, with a letter and a digit.
- **Access token:** JWT signed with `@nestjs/jwt` (^12.0.2; it supports Nest 12). It lasts 900 s and carries the claims `sub, role, clientId, sid, mcp`, with issuer/audience `troofn-api`.
- **Refresh token:** opaque `<sessionId>.<random 32B base64url>`. The DB stores only HMAC-SHA256(secret, `REFRESH_TOKEN_SECRET`).
  - Each refresh rotates the token and slides expiry by 7 days.
  - Reuse detection: a valid session id with the wrong secret means the token was stolen and reused. The session is revoked (`TOKEN_REUSE`) and the call returns 401.
- **Login checks, in this order:**
  1. Normalize the username.
  2. Look up the user. If not found, run a dummy hash verify so timing doesn't reveal it, then return 401 with a generic message.
  3. If `locked_until` is in the future, return 423.
  4. Verify the password. On failure, increment the attempt counter. After 5 failures, lock the account for 15 minutes. Return 401.
  5. If the user is INACTIVE, return 403.
  6. For client users, if the client is INACTIVE or `app_access_enabled` is false, return 403.
  7. On success, reset the counter, set `last_login_at`, create the session, and return the tokens.
- **Rate limit:** the login and refresh routes get a stricter `@Throttle`, configurable through env so e2e tests can raise it. `main.ts` sets `trust proxy` so the real client IP is used behind Nginx.
- **Admin password reset and deactivation:** these revoke all of the user's sessions. A reset also sets `must_change_password`. Access tokens are stateless, so they stay valid until they expire (at most 15 minutes). This trade-off is documented.

**Env:** update `config/env.validation.ts`, `config/configuration.ts`, `.env.example`, and the local `.env`. Existing secrets are kept, and `JWT_REFRESH_*` is renamed for clarity.

- `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_SECONDS=900`
- `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_TTL_DAYS=7`
- `AUTH_MAX_FAILED_LOGINS=5`, `AUTH_LOCKOUT_MINUTES=15`, `AUTH_LOGIN_RATE_LIMIT=5`
- `SEED_DEFAULT_PASSWORD` (dev only; the demo password lives here, not in chat)

## 5. API (stage 1, all under `/api/v1`)

| Method | Path                        | Guard                   | Purpose                                                                                                                     |
| ------ | --------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`               | public, throttled       | `{username, password, platform?, deviceName?}` → `{accessToken, refreshToken, tokenType, expiresIn, user}`                  |
| POST   | `/auth/refresh`             | public, throttled       | Rotates the pair                                                                                                            |
| POST   | `/auth/logout`              | auth                    | Revokes the current session                                                                                                 |
| POST   | `/auth/logout-all`          | auth                    | Revokes all of the user's sessions                                                                                          |
| GET    | `/auth/me`                  | auth (pending pw ok)    | User, role, client, and `permissions: {key: scope}`                                                                         |
| POST   | `/auth/change-password`     | auth (pending pw ok)    | Revokes the other sessions and returns a fresh pair                                                                         |
| GET    | `/roles`                    | `roles.read`            | Roles with permissions and scopes (the "app permissions" dropdown)                                                          |
| GET    | `/users`                    | `users.read`            | Paginated; filter by role, status, clientId, search                                                                         |
| GET    | `/users/:id`                | `users.read`            | One user                                                                                                                    |
| POST   | `/users`                    | `users.create`          | Create a staff or client user (audience rules apply; 409 on duplicate username)                                             |
| PATCH  | `/users/:id`                | `users.update`          | Profile, role, client, status. Deactivating revokes sessions. An admin can't deactivate themselves or change their own role |
| POST   | `/users/:id/reset-password` | `users.reset_password`  | Temporary password; forces a change                                                                                         |
| GET    | `/clients`                  | `clients.read` (scoped) | Proof of scoping: list with team                                                                                            |
| GET    | `/clients/:id`              | `clients.read` (scoped) | 404 when outside scope                                                                                                      |

Responses use explicit Prisma `select` objects and mappers, so `password_hash` and token hashes are never returned. Every controller has Swagger decorators (`@ApiBearerAuth`).

## 6. Seed (`apps/api/prisma/seed.ts`, run with `tsx`)

- `seed:rbac` runs in every environment: roles, permissions, and role_permissions.
- Demo data runs only when `NODE_ENV !== 'production'`.
- The seed is idempotent (upserts by unique keys). Every demo user's password comes from `SEED_DEFAULT_PASSWORD`.
- Wired through `migrations.seed` in `prisma.config.ts` and `pnpm db:seed`.

**Clients** (from Figma):

| Client                 | Status                | Sector   |
| ---------------------- | --------------------- | -------- |
| شركة وجناد العقارية    | ACTIVE, app access on | عقارات   |
| شركة الجبر للسيارات    | ACTIVE                | سيارات   |
| شركة النخبة للاستشارات | INACTIVE              | استشارات |

**Users:**

| Username            | Role                     | Client / team            | Shows                                        |
| ------------------- | ------------------------ | ------------------------ | -------------------------------------------- |
| `admin`             | admin                    | —                        | sees all 3 clients and all users             |
| `fahad.mm`          | marketing_manager        | team: Wejnad + Al-Jabr   | ASSIGNED: sees 2 clients, 404 on Al-Nukhba   |
| `abdullah.writer`   | content_writer           | team: Wejnad (EXECUTION) | 403 on /clients                              |
| `ahmed.employee`    | employee                 | —                        | 403 on /clients and /users                   |
| `wejnad.owner`      | client                   | Wejnad                   | OWN_CLIENT: sees only Wejnad                 |
| `wejnad.marketing`  | client_marketing_officer | Wejnad                   | OWN_CLIENT; different `/auth/me` permissions |
| `wejnad.accountant` | client_accountant        | Wejnad                   | OWN_CLIENT; finance-only permissions         |
| `jabr.owner`        | client                   | Al-Jabr                  | isolation: 404 on Wejnad                     |
| `nukhba.owner`      | client                   | Al-Nukhba (inactive)     | login refused (403)                          |

## 7. Files

- **Modify:**
  - API: `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/package.json` (adds `@nestjs/jwt`, `argon2`, `tsx`, and the `db:seed` script), `src/app.module.ts` (guards and modules), `src/main.ts` (trust proxy).
  - Config: `src/config/*`, `.env.example`, `.env`.
  - Shared: `packages/shared/src/types/auth.ts` (keeps `role: Role` on `AuthUser`, so the dashboard compiles untouched) and `src/enums/index.ts`.
  - CI: `.github/workflows/ci.yml` gets a `postgres:16` service so e2e tests have a DB.
  - Root: `package.json` (`db:seed`, `db:studio`).
- **Add:**
  - `src/modules/auth/` (controller, service, `token.service`, `sessions.service`, `password.ts`, `guards/jwt-auth.guard.ts`, dto/, decorators)
  - `src/modules/access-control/` (module, service, `rbac.matrix.ts`, `permissions.guard.ts`, `require-permissions` / `access-scope` decorators, `scopes/client-scope.ts`, `roles.controller.ts`)
  - `src/modules/users/` (controller, service, dto/, mapper)
  - `src/modules/clients/` (read-only controller, service, dto)
  - `prisma/seed.ts` (+ `prisma/seed/*`)
  - `packages/shared/src/enums/permission.enum.ts`
  - `test/setup/global-setup.ts` (creates `troofn_test` if missing, runs `migrate deploy` and the seed)
  - `test/auth.e2e-spec.ts`, `test/rbac.e2e-spec.ts`
  - `apps/api/requests/auth.http`
- **Remove:** `src/common/guards/roles.guard.ts`, `src/common/decorators/roles.decorator.ts`
- **Docs:**
  - Rewrite `docs/05-database-plan.md` (full ERD, with Mermaid for identity and access).
  - Update `docs/03-roles-and-permissions.md` (permission + scope model, full matrix) and `docs/04-api-conventions.md` (statuses ✅, 423).
  - Add `docs/guides/01-auth-walkthrough.md`: each concept explained, how to test, and the role-by-role expectations.
  - Update `docs/HANDOFF.md` at the end.

## 8. Step-by-step execution (we stop after each step; I explain what was done and why)

Branching: create `develop` from `main`, then `feature/auth-rbac`. Each step is a Conventional Commit (`db`, `shared`, `api`, `docs`, `ci` scopes). Nothing is pushed until you say so.

0. ✅ **Prep (your machine):** `nvm use` (the shell is on Node 20; the project needs 24), start Docker Desktop, then `pnpm db:up`. Done: Postgres runs on host port **5433**, because a native PostgreSQL 18 already uses 5432.
1. ✅ **DB design doc:** rewrite `docs/05`, then review it together.
2. ✅ **Schema and migration:**
   - Write the stage-1 models, run `prisma migrate dev --create-only --name init_identity_access`, read the SQL together, add the CHECKs, and apply.
   - Check in Prisma Studio and `\d users` in psql.
3. ✅ **RBAC catalog and seed:** permission enum, matrix, seed script. Run it, then inspect the `role_permissions` rows.
4. **Authentication:** env and config, password and token helpers, sessions, `AuthService`/`AuthController`, global `JwtAuthGuard`, throttling. Unit tests. Try login in Swagger.
5. **Authorization:** `AccessControlService`, `PermissionsGuard`, decorators, scope builder; remove `RolesGuard`; `GET /roles`. Unit tests.
6. **Users admin API and scoped Clients read API.**
7. **E2E tests, test tooling, and docs:**
   - E2E role-matrix and auth-flow tests, the `.http` file, the walkthrough guide, the CI Postgres service.
   - Updates to `docs/03`/`docs/04`/HANDOFF.

## 9. Verification

- `pnpm lint`, `pnpm test` (unit: token hashing and rotation, permission guard, scope builder, password policy), and `pnpm test:e2e` against `troofn_test`. The e2e tests cover:
  - Login success, failure, and lockout (423).
  - Refresh rotation, and reuse detection revoking the session.
  - Logout invalidating refresh.
  - `mustChangePassword` blocking other routes.
  - Inactive client login refused.
  - Every seeded user against `GET /clients` and `GET /clients/:id` (counts, 403, 404) and against `/users`.
- Manually: start the API with `pnpm dev:api` and open Swagger at `http://localhost:3000/api/docs`. Use Authorize with the access token, or run `apps/api/requests/auth.http` step by step: log in as each role, compare `/auth/me` permissions and `/clients` results to the table in §6. Open Prisma Studio (`pnpm --filter @troofn/api prisma:studio`) to watch the `user_sessions` rows rotate and get revoked.
