# LifeSync Wellness

A modern digital wellness and 24-hour lifestyle management platform built with a Bun monorepo architecture.

## Architecture

```
lifesync/
├── apps/
│   ├── web/         # Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Recharts
│   └── api/         # Express.js REST API, TypeScript, Better Auth, Zod validation
├── packages/
│   ├── db/          # Drizzle ORM + Neon Serverless PostgreSQL schema & migrations
│   └── shared/      # Shared TypeScript types, constants, and Zod validation schemas
├── package.json
└── tsconfig.base.json
```

## Environment Variables

Copy `.env.example` in `apps/api`, `apps/web`, and `packages/db` to `.env`:

- `apps/api/.env`: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `PORT`
- `apps/web/.env`: `NEXT_PUBLIC_API_URL`

