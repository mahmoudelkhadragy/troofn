# Guide 01 — Authentication & authorization, step by step

What stage 1 built, why each piece exists, and how to see it working yourself. Read it with the code open; every section names the file.

## 0. Setup in two minutes

```bash
nvm use                 # Node 24. Every new terminal starts on the old Node; run this first
pnpm db:up              # PostgreSQL 16 in Docker, on localhost:5433
pnpm db:migrate         # create the tables (first time, and after pulling new migrations)
pnpm db:seed            # 7 roles, 51 permissions, 3 clients, 9 demo users
pnpm dev:api            # API on http://localhost:3000
```

- Swagger (click-through API docs): http://localhost:3000/api/docs
- Browse the data: `pnpm db:studio`
- The password of every demo user is `SEED_DEFAULT_PASSWORD` in `apps/api/.env`.

## 1. The big picture

Two different questions are asked on every request, by two different guards:

| Question                             | Answered by        | Using                              | Wrong answer                              |
| ------------------------------------ | ------------------ | ---------------------------------- | ----------------------------------------- |
| **Who are you?** (authentication)    | `JwtAuthGuard`     | the access token                   | 401                                       |
| **May you do this?** (authorization) | `PermissionsGuard` | `role_permissions` table (+ scope) | 403 (or 404 for a row outside your scope) |

```
POST /auth/login ──► access token (15 min)  +  refresh token (7 days)
every other call ──► Authorization: Bearer <access token>
token expired    ──► POST /auth/refresh  ──► a NEW pair (the old refresh token dies)
```

## 2. The data (all in `apps/api/prisma/schema.prisma`)

| Table                 | One row is…                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `roles`               | one of the 7 roles. `audience` = STAFF or CLIENT                                   |
| `permissions`         | one action, e.g. `clients.read`                                                    |
| `role_permissions`    | "this role has this permission, on these rows" (`scope`)                           |
| `users`               | one login (username, argon2 password hash, role, and `client_id` for client roles) |
| `user_sessions`       | one login on one device. Holds the refresh-token hash; revoked on logout           |
| `clients`, `sectors`  | a client company and its specialization                                            |
| `client_team_members` | "this staff user works on this client". Drives the `ASSIGNED` scope                |

Who may do what lives in **one file**: `apps/api/src/modules/access-control/rbac.matrix.ts`. `pnpm db:seed` copies it into the tables. The generated table is in [03-roles-and-permissions.md](../03-roles-and-permissions.md).

## 3. Login, step by step (`auth.service.ts`)

1. Username is trimmed and lowercased (`Wejnad#1` and `wejnad#1` are the same account).
2. Unknown user → a fake password check runs anyway, then **401 "Invalid username or password"**. Same message and same timing as a wrong password, so nobody can discover which usernames exist.
3. Account locked → **423**.
4. Wrong password → counter +1; at 5 failures the account locks for 15 minutes. **401**.
5. Right password, but the user is inactive, or their client company is inactive, or the client's "App Access" is off → **403**.
6. Success → counter reset, a `user_sessions` row is created (platform, device name, IP), tokens returned.

Passwords are stored only as **argon2id** hashes (`password.ts`). Policy: 8+ characters with a letter and a digit.

## 4. The two tokens (`token.service.ts`)

|            | Access token                                                                    | Refresh token                   |
| ---------- | ------------------------------------------------------------------------------- | ------------------------------- |
| Looks like | a JWT: `header.payload.signature`                                               | `<sessionId>.<random secret>`   |
| Lives      | 15 minutes                                                                      | 7 days, extended on each use    |
| Checked    | signature only, no DB call                                                      | against `user_sessions`         |
| Contains   | `sub` (user), `role`, `clientId`, `sid` (session), `mcp` (must change password) | nothing readable                |
| In the DB  | never                                                                           | only an HMAC hash of the secret |

Paste an access token into https://jwt.io to read its claims: anyone can read them, but nobody can change them without the secret.

**Rotation and theft detection.** Each `/auth/refresh` replaces the refresh token. If an _old_ one is presented again, someone copied it, so the whole session is revoked (`revoke_reason = TOKEN_REUSE`).

**What logout can't do.** Access tokens are stateless, so a revoked session's access token still works until it expires (at most 15 minutes). Refresh stops immediately. That is the price of not querying the database on every request.

## 5. Authorization in practice

A route declares what it needs; the guard and the service do the rest. **A route that declares nothing is 403 for everyone** (deny by default); use `@Public()` or `@Authenticated()` to open one deliberately:

```ts
@Get()
@RequirePermissions(Permission.CLIENTS_READ)          // PermissionsGuard: 403 if the role lacks it
findAll(@Access() access: AccessContext) {            // access.scope = ALL | ASSIGNED | OWN_CLIENT
  return this.clients.findAll(access, query);         // service: where = clientScopeWhere(access)
}
```

What `GET /clients` returns:

| User                                                    | Role                     | Sees                                        | Scope      |
| ------------------------------------------------------- | ------------------------ | ------------------------------------------- | ---------- |
| `admin`                                                 | admin                    | all 3 clients                               | ALL        |
| `fahad.mm`                                              | marketing_manager        | Wejnad + Al-Jabr (his team)                 | ASSIGNED   |
| `wejnad.owner`, `wejnad.marketing`, `wejnad.accountant` | client roles             | Wejnad only                                 | OWN_CLIENT |
| `jabr.owner`                                            | client                   | Al-Jabr only                                | OWN_CLIENT |
| `abdullah.writer`, `ahmed.employee`                     | content_writer, employee | **403** (no `clients.read`)                 | —          |
| `nukhba.owner`                                          | client                   | **can't log in** (403): company is inactive | —          |

A client outside your scope is **404**, not 403: you can't tell "doesn't exist" from "not yours".

## 6. Try it

### In Swagger

1. `POST /auth/login` with `{ "username": "fahad.mm", "password": "<SEED_DEFAULT_PASSWORD>" }`.
2. Copy `data.accessToken`, click **Authorize** (top right), paste it.
3. `GET /auth/me`: look at `permissions` (25 keys; `clients.read` is `ASSIGNED`).
4. `GET /clients`: 2 companies. `GET /users`: 403.
5. Log in as `admin`, authorize again: `GET /clients` returns 3, `GET /users` works.

### With the request file

Open `apps/api/requests/auth.http` in VS Code (extension **REST Client**), set `@password`, and click **Send Request** down the file. It is ordered as a lesson: login → scoping → refresh rotation → lockout → users admin → logout.

### Watch the database

`pnpm db:studio` → `user_sessions`: log in twice and see two rows. Refresh and watch `last_used_at` and `expires_at` move. Reuse an old refresh token and watch `revoked_at` / `revoke_reason` fill in. In `users`, five wrong passwords make `locked_until` appear.

### Automated

```bash
pnpm test:e2e     # 69 tests against a separate troofn_test database (created and seeded automatically)
```

`test/auth.e2e-spec.ts`, `test/rbac.e2e-spec.ts` and `test/users.e2e-spec.ts` read as a specification of every rule above. The e2e database is separate, so your dev data is never touched.

## 7. Things that look like bugs but aren't

| You see                               | Because                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **429** on login                      | More than 5 login/refresh calls in a minute from one IP (`AUTH_LOGIN_RATE_LIMIT`). Wait, or restart the server                   |
| **423** on login                      | Account locked after 5 wrong passwords. Clears after 15 minutes, or an admin resets the password                                 |
| **403 "Password change required"**    | The user's password was reset by an admin. Only `/auth/me`, `/auth/change-password` and `/auth/logout` work until they change it |
| **401** a few seconds after a refresh | You used the old refresh token. Always keep the newest pair                                                                      |
| Port 5432 error from Docker           | A native PostgreSQL owns 5432. The project uses 5433                                                                             |
| `ERR_PNPM_UNSUPPORTED_ENGINE`         | The terminal is on Node 20. Run `nvm use`                                                                                        |

## 8. Adding a permission later

1. Add the key to `packages/shared/src/enums/permission.enum.ts`, then `pnpm build:shared`.
2. Give it a description in `rbac.matrix.ts` and grant it to roles, with a scope.
3. `pnpm db:seed`.
4. Protect the route with `@RequirePermissions(Permission.YOUR_KEY)` (forgetting it gives 403, not an open route) and scope the service query.
5. Extend `test/rbac.e2e-spec.ts` with who must get 200, 403 and 404.
