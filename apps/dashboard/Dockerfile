# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.34.6 --activate

WORKDIR /workspace

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/shared/ ./packages/shared/
COPY apps/dashboard/ ./apps/dashboard/

# Build shared package first, then the dashboard
RUN pnpm --filter @troofn/shared build
RUN pnpm --filter @troofn/dashboard build

# ── Stage 2: Nginx ────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# Angular 17+ application builder outputs to dist/<project>/browser
COPY --from=builder /workspace/apps/dashboard/dist/dashboard/browser /usr/share/nginx/html

# SPA routing + API proxy config
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
