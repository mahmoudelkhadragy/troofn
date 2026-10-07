# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

WORKDIR /workspace

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# prisma generate runs as a postinstall hook — schema must exist before pnpm install
COPY apps/api/prisma/ ./apps/api/prisma/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Build shared package first, then the API
RUN pnpm --filter @troofn/shared build
RUN pnpm --filter @troofn/api build

# Prisma 7's prisma-client generator outputs TypeScript with .ts import extensions.
# TypeScript's module:preserve setting doesn't rewrite them to .js, so the compiled
# .js files reference non-existent .ts paths at runtime. Fix them in place.
RUN find apps/api/dist/generated -name "*.js" \
    -exec sed -i "s/\.ts'/\.js'/g; s/\.ts\"/\.js\"/g" {} +

# Create a self-contained deployment directory.
# DATABASE_URL is required by Prisma 7 config resolution during `prisma generate` (postinstall).
# The value is a build-time placeholder — no real connection is made; the actual URL is
# injected at runtime via docker-compose.
# --legacy is needed because pnpm v10 changed the default deploy behaviour for shared lockfiles.
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" \
    pnpm --filter ./apps/api deploy --legacy /deploy

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /deploy ./

EXPOSE 3000

# Run pending migrations then start the compiled app
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
