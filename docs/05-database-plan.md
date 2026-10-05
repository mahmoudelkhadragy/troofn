# 05 — Database plan

> **Status:** planning only. Prisma 7 is installed and configured, and `prisma/schema.prisma` has no models yet. Implementation is in roadmap phase 1.

## Stack

- **PostgreSQL 16**: relational integrity, plus `JSONB` for flexible structures (TAPA's 8 axes)
- **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg` driver adapter), see [ADR-0002](adr/0002-prisma-orm.md)
- Local DB: `pnpm db:up` (Docker), connection in `apps/api/.env` → `DATABASE_URL`

## Conventions

| Topic        | Rule                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| Table names  | `snake_case`, plural (`sow_items`) via `@@map`                                    |
| Column names | `snake_case` in DB via `@map`, `camelCase` in Prisma/TS                           |
| Primary keys | `id String @id @default(uuid()) @db.Uuid`                                         |
| Timestamps   | every table: `createdAt`, `updatedAt` (`@updatedAt`)                              |
| Soft delete  | `deletedAt DateTime?` on business tables (clients, contracts, users, leads…)      |
| Enums        | Prisma enums for fixed sets (role, contract status, lead source…)                 |
| Money        | `Decimal @db.Decimal(12, 2)` — never `Float`                                      |
| Foreign keys | always indexed; explicit `onDelete` behaviour                                     |
| Secrets      | `password_hash` (argon2) only; card data = gateway token + last4 + brand **only** |

## Tables by module

| Module    | Table              | Key fields                                                                                                | Notes                                                                            |
| --------- | ------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Identity  | `users`            | name, email (unique), password_hash, role, client_id?, fcm_token, is_active                               | one of the 7 roles                                                               |
| Identity  | `refresh_tokens`   | user_id, token_hash, expires_at, revoked_at                                                               | supports logout / rotation                                                       |
| Identity  | `clients`          | company_name, sector, owner_user_id, assigned_manager_id, status                                          |                                                                                  |
| Central   | `contracts`        | client_id, type (base/additional), annual_value, status (active/on_hold), file_path, start_date, end_date | accountant sees value only                                                       |
| Central   | `sow`              | client_id, title, overall_progress_pct                                                                    |                                                                                  |
| Central   | `sow_items`        | sow_id, title, progress_pct                                                                               |                                                                                  |
| Central   | `milestones`       | sow_id, title, due_date, done                                                                             |                                                                                  |
| Central   | `strategic_plans`  | client_id, version                                                                                        |                                                                                  |
| Central   | `plan_axes`        | plan_id, axis_no (1–7), content                                                                           |                                                                                  |
| Central   | `t360_scores`      | client_id, score, measured_at                                                                             |                                                                                  |
| Central   | `competitors`      | client_id, name, notes                                                                                    |                                                                                  |
| Central   | `reports`          | client_id, type (campaigns/monthly), period, file_path                                                    |                                                                                  |
| Finance   | `invoices`         | client_id, contract_id, amount, status, due_date                                                          |                                                                                  |
| Finance   | `payments`         | invoice_id, amount, receipt_path, paid_at                                                                 |                                                                                  |
| Finance   | `payment_cards`    | client_id, gateway_token, last4, brand                                                                    | never store PAN                                                                  |
| HR        | `employees`        | user_id, position, hire_date, base_salary                                                                 |                                                                                  |
| HR        | `payroll`          | employee_id, month, bonus, deductions, due_date                                                           |                                                                                  |
| HR        | `attendance`       | employee_id, date, check_in, check_out, late_minutes                                                      | method pending decision                                                          |
| HR        | `leave_requests`   | employee_id, from_date, to_date, status, approved_by                                                      |                                                                                  |
| HR        | `evaluations`      | employee_id, period, score, notes                                                                         |                                                                                  |
| Marketing | `leads`            | name, phone, source (meta/google/tiktok/manual), status (new/contacted), contacted_by                     |                                                                                  |
| Marketing | `projects`         | client_id, title, type (campaign/strategic)                                                               |                                                                                  |
| Marketing | `project_members`  | project_id, user_id, project_role                                                                         |                                                                                  |
| Marketing | `tasks`            | project_id, assignee_id, title, status, due_date                                                          |                                                                                  |
| Marketing | `production_files` | project_id, element_type, status, file_path, uploaded_by                                                  | Main Ad, Carousel, Graphic Designs, UGC, AI Video, Website Article, Content Plan |
| Marketing | `tapa_analysis`    | client_id, axes (JSONB, 8 axes), updated_by                                                               |                                                                                  |
| Comms     | `meetings`         | client_id, requested_by, scheduled_at, status, summary                                                    |                                                                                  |
| Comms     | `requests`         | client_id, type (marketing/financial), priority, status, created_by                                       |                                                                                  |
| Comms     | `chat_messages`    | project_id, sender_id, body, created_at                                                                   | indexed (project_id, created_at) for polling                                     |
| Comms     | `notifications`    | user_id, title, body, is_read                                                                             |                                                                                  |

## Workflow

```bash
pnpm db:up                                   # start Postgres
cd apps/api
# 1. edit prisma/schema.prisma
pnpm prisma:migrate --name add_clients       # create + apply migration, regenerates the client
pnpm prisma:studio                           # browse data
```

- **Never edit an applied migration.** Create a new one.
- Commit `prisma/migrations/**` together with the schema change.
- Staging and production run `pnpm prisma:deploy` (applies pending migrations only).
- A seed script (`prisma/seed.ts`) will create the first admin user and demo data for local dev.

## Suggested build order

1. `users`, `refresh_tokens`, `clients` (needed by auth and everything else)
2. Central management tables
3. HR and leads
4. Projects, tasks, production files, TAPA, chat
5. Finance, meetings, requests, notifications
