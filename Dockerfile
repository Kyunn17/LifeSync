FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy root and workspace package files
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install workspace dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source files needed for the API
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/api", "start"]

