-- CreateEnum
CREATE TYPE "client_app" AS ENUM ('DASHBOARD', 'MOBILE');

-- CreateEnum
CREATE TYPE "approval_action" AS ENUM ('DELETE_CLIENT', 'DELETE_USER');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'STALE');

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN     "app" "client_app" NOT NULL DEFAULT 'MOBILE';

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "action" "approval_action" NOT NULL,
    "target_id" UUID NOT NULL,
    "status" "approval_status" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_status_created_at_idx" ON "approval_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "approval_requests_target_id_idx" ON "approval_requests"("target_id");

-- CreateIndex
CREATE INDEX "approval_requests_requested_by_id_idx" ON "approval_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "approval_requests_decided_by_id_idx" ON "approval_requests"("decided_by_id");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Hand-written: backfill, partial unique index and CHECK constraint (Prisma's schema language can't express these) ──
-- A CHECK passes when its expression is NULL, so optional columns need no "IS NULL OR".

-- Sessions opened from the web before this migration came from the dashboard; the new column defaulted them to MOBILE.
UPDATE "user_sessions" SET "app" = 'DASHBOARD' WHERE "platform" = 'WEB';

-- At most one PENDING request per action and target. Also catches two admins submitting at the same moment.
CREATE UNIQUE INDEX "approval_requests_one_pending" ON "approval_requests"("action", "target_id") WHERE "status" = 'PENDING';

-- A request that was decided must say who decided it and when. PENDING and CANCELLED rows are not decisions.
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_chk" CHECK (
  "status" IN ('PENDING', 'CANCELLED', 'STALE') OR ("decided_by_id" IS NOT NULL AND "decided_at" IS NOT NULL)
);