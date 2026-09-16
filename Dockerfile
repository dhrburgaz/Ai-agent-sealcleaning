# Beyza Security — single-container deployment (section 56).
# Multi-stage build: install once, build once, run a minimal runtime image.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SESSION_SECRET=build-time-placeholder-not-used-at-runtime-32chars
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/storage/beyza.db
ENV STORAGE_DIR=/app/storage

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /app/storage/uploads /app/storage/backups /app/storage/quotes

EXPOSE 3000

# Apply migrations, then start. SESSION_SECRET must be provided at runtime (see .env.example).
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npm run start"]
