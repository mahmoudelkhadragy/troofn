# 03 — Roles & permissions (RBAC)

## The golden rule

> **Every endpoint checks the permission first, then filters rows by the caller's scope.**
> Hiding a screen in the dashboard or the app is never enough.

## The model in one picture

```
role  ──has many──►  role_permissions (permission + scope)  ◄──is──  permission  (e.g. clients.read)
 ▲
 └── user.role_id          user.client_id is set only for client roles
```

- A **permission** is one action: `module.action` (`clients.read`, `invoices.manage`). The full list is the `Permission` enum in `packages/shared/src/enums/permission.enum.ts`.
- A **role** is a named set of permissions. There are 7 (below).
- A **scope** says _which rows_ a granted permission covers.

| Scope        | Means                                                                      | Becomes (for clients)                       |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| `ALL`        | every row                                                                  | no filter                                   |
| `ASSIGNED`   | rows of clients / projects the user is assigned to (`client_team_members`) | `team: { some: { userId } }`                |
| `OWN_CLIENT` | rows of the user's own client company                                      | `id = user.clientId`                        |
| `OWN`        | rows that belong to the user                                               | not applicable to clients (matches nothing) |

Rules the seed enforces: client roles may only use `OWN_CLIENT` / `OWN`; staff roles never use `OWN_CLIENT`.

## Roles

Defined once in `packages/shared/src/enums/role.enum.ts`; stored in the `roles` table (`key` = enum value).

| Enum value                 | Role                     | Side   | Data scope                               |
| -------------------------- | ------------------------ | ------ | ---------------------------------------- |
| `admin`                    | Troofn admin (dashboard) | Troofn | Everything                               |
| `marketing_manager`        | Troofn marketing manager | Troofn | Assigned clients (`client_team_members`) |
| `content_writer`           | Content writer           | Troofn | Assigned projects                        |
| `employee`                 | Regular employee         | Troofn | Own tasks + own HR data                  |
| `client`                   | Client (account owner)   | Client | `client_id` = own company                |
| `client_marketing_officer` | Client marketing officer | Client | own company, marketing data only         |
| `client_accountant`        | Client accountant        | Client | own company, finance data only           |

## Permission matrix

> **Generated from `apps/api/src/modules/access-control/rbac.matrix.ts`** (the source of truth). Legend: `ALL` · `ASG` = ASSIGNED · `CLI` = OWN_CLIENT · `OWN` · `—` = no access.
> Modules whose endpoints are not built yet (contracts, finance, HR, …) are already in the matrix, so the rules are decided before the code exists.

| Permission                | admin | mkt mgr | writer | employee | client | client mkt | accountant |
| ------------------------- | ----- | ------- | ------ | -------- | ------ | ---------- | ---------- |
| `users.read`              | ALL   | —       | —      | —        | —      | —          | —          |
| `users.create`            | ALL   | —       | —      | —        | —      | —          | —          |
| `users.update`            | ALL   | —       | —      | —        | —      | —          | —          |
| `users.reset_password`    | ALL   | —       | —      | —        | —      | —          | —          |
| `roles.read`              | ALL   | —       | —      | —        | —      | —          | —          |
| `clients.read`            | ALL   | ASG     | —      | —        | CLI    | CLI        | CLI        |
| `clients.manage`          | ALL   | —       | —      | —        | —      | —          | —          |
| `contracts.read`          | ALL   | ASG     | —      | —        | CLI    | —          | CLI        |
| `contracts.manage`        | ALL   | —       | —      | —        | —      | —          | —          |
| `work_plans.read`         | ALL   | ASG     | —      | —        | CLI    | —          | —          |
| `work_plans.manage`       | ALL   | —       | —      | —        | —      | —          | —          |
| `t360.read`               | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `t360.manage`             | ALL   | —       | —      | —        | —      | —          | —          |
| `strategy.read`           | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `strategy.manage`         | ALL   | —       | —      | —        | —      | —          | —          |
| `sow.read`                | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `sow.manage`              | ALL   | —       | —      | —        | —      | —          | —          |
| `requests.read`           | ALL   | ASG     | —      | —        | CLI    | CLI        | CLI        |
| `requests.create`         | ALL   | —       | —      | —        | CLI    | CLI        | CLI        |
| `requests.manage`         | ALL   | —       | —      | —        | —      | —          | —          |
| `reports.read`            | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `reports.manage`          | ALL   | —       | —      | —        | —      | —          | —          |
| `meetings.read`           | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `meetings.create`         | ALL   | ASG     | —      | —        | CLI    | CLI        | —          |
| `meetings.manage`         | ALL   | ASG     | —      | —        | —      | —          | —          |
| `activity.read`           | ALL   | —       | —      | —        | —      | —          | —          |
| `invoices.read`           | ALL   | —       | —      | —        | CLI    | —          | CLI        |
| `invoices.manage`         | ALL   | —       | —      | —        | —      | —          | —          |
| `payments.read`           | ALL   | —       | —      | —        | CLI    | —          | CLI        |
| `payments.create`         | ALL   | —       | —      | —        | CLI    | —          | CLI        |
| `payments.manage`         | ALL   | —       | —      | —        | —      | —          | —          |
| `payment_methods.manage`  | —     | —       | —      | —        | CLI    | —          | CLI        |
| `projects.read`           | ALL   | ASG     | ASG    | —        | —      | —          | —          |
| `projects.manage`         | ALL   | ASG     | —      | —        | —      | —          | —          |
| `tasks.read`              | ALL   | ASG     | OWN    | OWN      | —      | —          | —          |
| `tasks.update_status`     | ALL   | ASG     | OWN    | OWN      | —      | —          | —          |
| `tasks.manage`            | ALL   | ASG     | —      | —        | —      | —          | —          |
| `production_files.read`   | ALL   | ASG     | ASG    | —        | —      | —          | —          |
| `production_files.manage` | ALL   | ASG     | ASG    | —        | —      | —          | —          |
| `tapa.read`               | ALL   | ASG     | ASG    | —        | —      | —          | —          |
| `tapa.manage`             | ALL   | ASG     | —      | —        | —      | —          | —          |
| `chat.read`               | ALL   | ASG     | ASG    | ASG      | CLI    | CLI        | —          |
| `chat.send`               | ALL   | ASG     | ASG    | ASG      | CLI    | CLI        | —          |
| `leads.read`              | ALL   | ALL     | —      | —        | —      | —          | —          |
| `leads.manage`            | ALL   | ALL     | —      | —        | —      | —          | —          |
| `employees.read`          | ALL   | —       | —      | —        | —      | —          | —          |
| `employees.manage`        | ALL   | —       | —      | —        | —      | —          | —          |
| `payroll.manage`          | ALL   | —       | —      | —        | —      | —          | —          |
| `attendance.manage`       | ALL   | —       | —      | —        | —      | —          | —          |
| `leaves.approve`          | ALL   | —       | —      | —        | —      | —          | —          |
| `hr.self_service`         | —     | OWN     | OWN    | OWN      | —      | —          | —          |

## How a request is checked

```
Request → ThrottlerGuard → JwtAuthGuard → PermissionsGuard → controller → service → database
          rate limit       who are you?    may you do this?    @Access()    scope → where
```

1. **JwtAuthGuard** (global) verifies the access token and sets `request.user = { sub, role, clientId, sid, mcp }`. Routes marked `@Public()` skip it. While `mcp` (must change password) is true, only routes marked `@AllowPendingPasswordChange()` work.
2. **PermissionsGuard** (global) reads `@RequirePermissions(...)`, looks the role up in `role_permissions` (cached 60 s), and answers **403** if any permission is missing. Otherwise it builds an `AccessContext { userId, role, clientId, scope }`.
3. **The controller** receives it with `@Access()` and passes it to the service.
4. **The service** turns the scope into a query filter and always combines it with the other filters:
   ```ts
   @Get()
   @RequirePermissions(Permission.CLIENTS_READ)
   findAll(@Access() access: AccessContext) {
     return this.prisma.client.findMany({ where: { AND: [clientScopeWhere(access), { deletedAt: null }] } });
   }
   ```
   Scope builders live in `modules/access-control/scopes/`. Anything that doesn't fit **fails closed** (no rows).
5. **A record that exists but is outside the caller's scope returns 404, not 403**, so ids can't be probed.
6. **Field-level restriction:** when a role may see a record but not all of its fields (e.g. the accountant sees a contract's value only), map the record to a role-specific response DTO. Never return the raw Prisma object.

## Changing who can do what

1. Edit `rbac.matrix.ts` (add a permission to a role, change a scope). Add a new key to the `Permission` enum first if needed.
2. Run `pnpm db:seed`. It makes the tables match the matrix exactly, including removing grants you deleted.
3. Regenerate the matrix table above and commit.

Access tokens carry only the role, not the permissions, so a grant change applies within a minute (the cache TTL), with no re-login needed.

## How it is used in the dashboard

- `GET /auth/me` returns `permissions: { "clients.read": "ASSIGNED", … }`. Use it to decide which menu entries and routes to show.
- This is **UX only**. The API is the source of truth.
