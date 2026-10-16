-- Users no longer change their own password: only an owner or admin sets it (POST /users, POST /users/:id/reset-password),
-- so the forced-change flag has no meaning left.
ALTER TABLE "users" DROP COLUMN "must_change_password";
