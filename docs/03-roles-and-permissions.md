# 03 — Roles & permissions (RBAC)

## The golden rule

> **Every endpoint checks the role first, then data ownership, before returning anything.**
> Hiding a screen in the dashboard or the app is never enough.

## Roles

Defined once in `packages/shared/src/enums/role.enum.ts`:

| Enum value                 | Role                     | Side   | Data scope                                       |
| -------------------------- | ------------------------ | ------ | ------------------------------------------------ |
| `admin`                    | Troofn admin (dashboard) | Troofn | Everything                                       |
| `client`                   | Client (account owner)   | Client | `client_id` = own company                        |
| `client_marketing_officer` | Client marketing officer | Client | `client_id` = own company, marketing data only   |
| `client_accountant`        | Client accountant        | Client | `client_id` = own company, finance data only     |
| `marketing_manager`        | Troofn marketing manager | Troofn | Assigned clients (`clients.assigned_manager_id`) |
| `content_writer`           | Content writer           | Troofn | Assigned projects (`project_members`)            |
| `employee`                 | Regular employee         | Troofn | Own tasks + own HR data                          |

## Visibility matrix

`R` = read, `W` = create/update, `—` = no access, `own` = only own records, `value` = restricted fields.

| Module                      | admin | client | mkt officer    | accountant     | mkt manager | writer    | employee        |
| --------------------------- | ----- | ------ | -------------- | -------------- | ----------- | --------- | --------------- |
| Clients (CRUD)              | RW    | R own  | R own          | R own          | R assigned  | —         | —               |
| Contracts                   | RW    | R      | —              | R value        | R assigned  | —         | —               |
| SOW & milestones            | RW    | R      | R              | —              | R assigned  | —         | —               |
| Strategic plan (7 axes)     | RW    | R      | R              | —              | R assigned  | —         | —               |
| T-360 & competitors         | RW    | R      | R              | —              | R assigned  | —         | —               |
| Reports                     | RW    | R      | R (marketing)  | —              | R assigned  | —         | —               |
| Invoices                    | RW    | R      | —              | R              | —           | —         | —               |
| Payments (receipts)         | RW    | W      | —              | W              | —           | —         | —               |
| Payment cards (token)       | —     | RW     | —              | RW             | —           | —         | —               |
| Meetings                    | RW    | RW     | RW             | —              | RW assigned | —         | —               |
| Requests                    | RW    | RW     | RW (marketing) | RW (financial) | R assigned  | —         | —               |
| Leads                       | RW    | —      | —              | —              | RW          | —         | —               |
| Projects                    | RW    | —      | —              | —              | RW assigned | R own     | R own           |
| Tasks                       | RW    | —      | —              | —              | RW assigned | RW own    | RW own (status) |
| Production files            | RW    | —      | —              | —              | RW assigned | RW own    | —               |
| TAPA analysis               | RW    | —      | —              | —              | RW assigned | R         | —               |
| Project chat                | R     | —      | —              | —              | RW member   | RW member | RW member       |
| Employees / payroll (admin) | RW    | —      | —              | —              | —           | —         | —               |
| HR self-service (`/me/*`)   | —     | —      | —              | —              | RW own      | RW own    | RW own          |
| Notifications               | own   | own    | own            | own            | own         | own       | own             |

## How it is enforced in the API

1. **Authentication**: a global `JwtAuthGuard` (auth phase) validates the access token and sets `request.user = { sub, role, clientId }`. Routes marked `@Public()` skip it.
2. **Role gate**: the global `RolesGuard` reads `@Roles(...)`:
   ```ts
   @Roles(Role.ADMIN, Role.CLIENT, Role.CLIENT_ACCOUNTANT)
   @Get()
   findAll(@CurrentUser() user: JwtPayload, @Query() query: InvoiceQueryDto) { … }
   ```
3. **Ownership / scope**: inside the **service**, every query is scoped by the caller:
   ```ts
   // client-side roles → always filter by their own company
   if (CLIENT_ROLES.includes(user.role)) where.clientId = user.clientId;
   // marketing manager → only assigned clients
   if (user.role === Role.MARKETING_MANAGER) where.client = { assignedManagerId: user.sub };
   ```
   A record that exists but isn't yours returns **404** (not 403), so IDs can't be probed.
4. **Field-level restriction**: when a role may see a record but not all fields (e.g. accountant → contract _value only_), map the record to a role-specific response DTO. Never return the raw Prisma object.

## How it is used in the dashboard

- `roleGuard(Role.ADMIN)` on routes, plus the `roles` field on `NAV_GROUPS` items to hide menu entries.
- This is **UX only**. The API is the source of truth.
