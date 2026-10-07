# 04 — API conventions & endpoint catalog

## Conventions

| Topic          | Rule                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL       | `/api/v1` (URI versioning; a breaking change → `v2` alongside `v1`)                                                                                                                                        |
| Format         | JSON, `camelCase` fields, ISO-8601 UTC dates                                                                                                                                                               |
| Resource names | plural nouns, kebab-case: `/clients`, `/production-files`                                                                                                                                                  |
| Nesting        | max one level: `/clients/:id/reports`, `/projects/:id/messages`                                                                                                                                            |
| Current user   | `/me`, `/me/salary`, `/my-tasks`, `/my-projects`                                                                                                                                                           |
| IDs            | UUID (`uuid` in Postgres)                                                                                                                                                                                  |
| Methods        | `GET` read · `POST` create/action · `PATCH` partial update · `PUT` full replace · `DELETE`                                                                                                                 |
| Status codes   | `200` OK · `201` created · `204` no content · `400` validation · `401` unauthenticated · `403` missing permission · `404` not found/not yours · `409` conflict · `423` account locked · `429` rate-limited |
| Auth           | `Authorization: Bearer <accessToken>` (15 min) + refresh token (7 days)                                                                                                                                    |
| Docs           | Every endpoint has Swagger decorators; browse `/api/docs` (disabled in production)                                                                                                                         |

### Success envelope

```json
{ "success": true, "data": { "id": "…", "companyName": "Acme" } }
```

List endpoints add `meta`. A service returns `{ items, meta }` and the interceptor reshapes it:

```json
{
  "success": true,
  "data": [ … ],
  "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": ["email must be an email"],
    "path": "/api/v1/clients",
    "timestamp": "2026-10-05T21:00:00.000Z"
  }
}
```

### List query parameters

`?page=1&limit=20&search=acme&sortBy=createdAt&sortOrder=desc` plus module filters (`?status=active`). Use `PaginationQueryDto` and extend it per module. `limit` max is 100.

### Files

Uploads go through `multipart/form-data` endpoints and are stored outside the web root. Downloads go **only** through a protected endpoint (`GET /contracts/:id/file`) that runs the same role and ownership checks. There are no public direct links.

---

## Endpoint catalog (from the technical plan)

Status legend: ⬜ planned · 🟨 in progress · ✅ done

### System

| Method | Endpoint        | Roles  | Purpose             | Status |
| ------ | --------------- | ------ | ------------------- | ------ |
| GET    | `/health`       | public | Liveness            | ✅     |
| GET    | `/health/ready` | public | Readiness (DB ping) | ✅     |

### Auth

| Method | Endpoint                | Access                | Purpose                                                                  | Status |
| ------ | ----------------------- | --------------------- | ------------------------------------------------------------------------ | ------ |
| POST   | `/auth/login`           | public (5/min per IP) | Username + password → tokens + user + permissions. 401 / 403 / 423       | ✅     |
| POST   | `/auth/refresh`         | public (5/min per IP) | Rotate the token pair; reuse of an old refresh token revokes the session | ✅     |
| POST   | `/auth/logout`          | any signed-in user    | End the current session                                                  | ✅     |
| POST   | `/auth/logout-all`      | any signed-in user    | End every session (all devices)                                          | ✅     |
| GET    | `/auth/me`              | any (even pw-pending) | Current user, role, client and `permissions` map                         | ✅     |
| POST   | `/auth/change-password` | any (even pw-pending) | Change own password; other sessions end; returns a fresh token pair      | ✅     |
| POST   | `/me/fcm-token`         | all                   | Register device token (push notifications phase)                         | ⬜     |

### Users & roles (dashboard)

| Method | Endpoint                    | Permission             | Purpose                                                   | Status |
| ------ | --------------------------- | ---------------------- | --------------------------------------------------------- | ------ |
| GET    | `/roles`                    | `roles.read`           | Roles with their permissions and scopes                   | ✅     |
| GET    | `/users`                    | `users.read`           | List (filters: role, status, clientId, search; paginated) | ✅     |
| GET    | `/users/:id`                | `users.read`           | One user                                                  | ✅     |
| POST   | `/users`                    | `users.create`         | Create a staff user or a client login                     | ✅     |
| PATCH  | `/users/:id`                | `users.update`         | Profile, role, client, status                             | ✅     |
| POST   | `/users/:id/reset-password` | `users.reset_password` | Temporary password; forced change at next login           | ✅     |

### Clients & central management

| Method       | Endpoint                   | Roles                                   | Purpose                            | Status |
| ------------ | -------------------------- | --------------------------------------- | ---------------------------------- | ------ |
| GET          | `/clients`                 | `clients.read` (scoped)                 | List clients visible to the caller | ✅     |
| GET          | `/clients/:id`             | `clients.read` (scoped, 404 outside)    | Client profile with its team       | ✅     |
| POST / PATCH | `/clients`, `/clients/:id` | admin                                   | Create / edit client               | ⬜     |
| GET          | `/clients/:id/overview`    | client roles, admin, mkt manager        | Financial figures, team, timeline  | ⬜     |
| GET          | `/contracts`               | client, accountant (value only), admin  | List contracts                     | ⬜     |
| POST         | `/contracts`               | admin                                   | Upload contract                    | ⬜     |
| GET          | `/contracts/:id/file`      | client, accountant, admin               | Download contract                  | ⬜     |
| GET          | `/clients/:id/sow`         | client, mkt officer, admin              | SOW + completion %                 | ⬜     |
| PATCH        | `/sow/:id/progress`        | admin                                   | Update completion %                | ⬜     |
| GET / PUT    | `/plans/:id/axes`          | view: client, mkt officer · edit: admin | Strategic plan 7 axes              | ⬜     |
| GET          | `/clients/:id/reports`     | client, mkt officer, admin              | Monthly reports                    | ⬜     |
| GET          | `/clients/:id/t360`        | client, mkt officer, admin              | T-360 index + competitors          | ⬜     |

### Finance

| Method              | Endpoint    | Roles                     | Purpose                           | Status |
| ------------------- | ----------- | ------------------------- | --------------------------------- | ------ |
| GET                 | `/invoices` | client, accountant, admin | List invoices                     | ⬜     |
| POST                | `/invoices` | admin                     | Generate invoice                  | ⬜     |
| POST                | `/payments` | client, accountant        | Record transfer + upload receipt  | ⬜     |
| GET / POST / DELETE | `/cards`    | client, accountant        | Payment card (gateway token only) | ⬜     |

### Communication

| Method     | Endpoint                        | Roles                           | Purpose                        | Status |
| ---------- | ------------------------------- | ------------------------------- | ------------------------------ | ------ |
| GET / POST | `/meetings`                     | client + marketing roles, admin | Request / view meetings        | ⬜     |
| GET / POST | `/requests?status=`             | client roles by type, admin     | Marketing / financial requests | ⬜     |
| GET / POST | `/projects/:id/messages?after=` | project members                 | Team chat (polling 3–5 s)      | ⬜     |
| GET        | `/notifications`                | all                             | List notifications             | ⬜     |
| PATCH      | `/notifications/:id/read`       | all                             | Mark as read                   | ⬜     |

### Leads

| Method     | Endpoint                          | Roles              | Purpose                              | Status |
| ---------- | --------------------------------- | ------------------ | ------------------------------------ | ------ |
| GET / POST | `/leads`                          | mkt manager, admin | List / add lead manually             | ⬜     |
| PATCH      | `/leads/:id/contacted`            | mkt manager        | Mark as contacted                    | ⬜     |
| DELETE     | `/leads/:id`                      | mkt manager, admin | Delete lead                          | ⬜     |
| POST       | `/webhooks/meta` (google, tiktok) | external (signed)  | Automatic intake, _pending decision_ | ⬜     |

### Projects & production

| Method     | Endpoint              | Roles                           | Purpose                           | Status |
| ---------- | --------------------- | ------------------------------- | --------------------------------- | ------ |
| GET        | `/my-clients`         | mkt manager                     | Assigned clients + new task count | ⬜     |
| GET        | `/my-projects`        | mkt manager, writer             | Own projects                      | ⬜     |
| GET        | `/my-tasks`           | employee, writer                | Assigned tasks                    | ⬜     |
| PATCH      | `/tasks/:id`          | mkt manager, writer, employee   | Update task status                | ⬜     |
| GET / POST | `/projects/:id/files` | mkt manager, writer             | Production files                  | ⬜     |
| PATCH      | `/files/:id/status`   | mkt manager, writer             | Update element status             | ⬜     |
| GET        | `/clients/:id/tapa`   | mkt manager, writer (read-only) | TAPA analysis                     | ⬜     |
| PUT        | `/clients/:id/tapa`   | mkt manager                     | Edit TAPA                         | ⬜     |

### HR

| Method | Endpoint                                | Roles        | Purpose             | Status |
| ------ | --------------------------------------- | ------------ | ------------------- | ------ |
| GET    | `/me/salary`                            | Troofn staff | Salary & deductions | ⬜     |
| POST   | `/me/attendance/check-in`, `/check-out` | Troofn staff | Attendance          | ⬜     |
| POST   | `/me/leaves`                            | Troofn staff | Request leave       | ⬜     |
| GET    | `/me/evaluation`                        | Troofn staff | Own evaluation      | ⬜     |
| GET    | `/employees`                            | admin        | Employees table     | ⬜     |
| PUT    | `/leaves/:id/approve`                   | admin        | Approve leave       | ⬜     |
| POST   | `/payroll/run`                          | admin        | Monthly payroll     | ⬜     |

> When an endpoint is built, update its status here **in the same PR**.
