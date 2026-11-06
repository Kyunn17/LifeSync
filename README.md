# LifeSync Wellness

**LifeSync Wellness** is a modern digital wellness and daily 24-hour lifestyle management platform built with a Bun monorepo architecture, reproducing the **LifeSync Wellness Platform** design system (`Sanctuary Flow`).

> **Note:** LifeSync Wellness is a digital wellness and lifestyle management platform, **not** a medical diagnosis application.

---

## 1. Architecture & Monorepo Structure

```text
lifesync/
├── apps/
│   ├── web/                    # Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Recharts
│   └── api/                    # Express.js REST API, TypeScript, Better Auth, RBAC, Zod validation
├── packages/
│   ├── db/                     # Drizzle ORM + Neon Serverless PostgreSQL schema, migrations & seed
│   │   ├── schema/             # 11 normalized tables + relational definitions
│   │   ├── migrations/         # SQL migration snapshots
│   │   ├── migrate.ts          # Programmatic Neon migration runner
│   │   └── seed.ts             # Default activity categories & wellness tips seeder
│   └── shared/                 # Shared TypeScript types, constants, and Zod validation schemas
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## 2. Technology Stack

- **Frontend (`apps/web`)**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, React Hook Form, Zod, Lucide React, Material Symbols Outlined
- **Backend (`apps/api`)**: Express.js, TypeScript, REST API architecture, Better Auth (`better-auth`), Zod validation
- **Database (`packages/db`)**: PostgreSQL on Neon Serverless (`@neondatabase/serverless`), Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Runtime & Tooling**: Bun runtime & workspaces, `bun test` integration suite

---

## 3. Core Features

1. **Authentication & RBAC (`USER` / `ADMIN`)**:
   - Powered by Better Auth with session cookie authentication (`httpOnly`, `sameSite: lax`).
   - All newly registered accounts automatically receive the `USER` role (`input: false` on role/ban fields prevents privilege escalation during sign-up).
   - Strict server-side `requireAuth` and `requireRole("ADMIN")` middleware on Express routes.
2. **24-Hour Daily Time Allocation (`/schedule`)**:
   - Organize daily 24 hours (`1,440 minutes`) into scheduled activities across 10 default categories (`Sleep`, `Work`, `Study`, `Exercise`, `Meals`, `Commute`, `Entertainment`, `Personal Time`, `Rest`, `Other`) or custom user categories.
   - Server-side overlap detection (`409 SCHEDULE_OVERLAP`) with full support for midnight-crossing activities (e.g., `22:30` to `06:30`) and unallocated free time.
   - Interactive 24-hour circadian ring visualization, category breakdown, and vertical timeline stream.
3. **Daily Wellness Tracking (`/wellness`)**:
   - Log sleep duration (`minutes`) & quality (`1-100`), exercise duration, daily steps, resting heart rate, water intake (`ml` with quick `+250ml` / `+500ml` logging), and daily mood/energy check-ins.
4. **Personalized Dashboard & Biometric Insights (`/dashboard`, `/insights`)**:
   - Real-time daily wellness score, 24-hour balance bar, sleep/movement/hydration cards, quick check-in widget, and 7-day trend charts.
   - Weekly and 30-day analytics with previous-week delta comparisons and dynamic circadian optimization insights.
5. **Admin Governance Console (`/admin`) & Profile Settings (`/settings`)**:
   - **Admin Console**: Platform adoption metrics, user role/status governance (`USER`/`ADMIN`, active/suspended), system activity category management, and curated wellness tips management. Strictly preserves user privacy (never exposes private user schedules or personal health logs).
   - **Settings**: Personal profile, chronotype & lifestyle goals (`sleep`, `exercise`, `water`, `steps`), and account security.

---

## 4. Database Schema (`packages/db`)

11 normalized PostgreSQL tables managed via Drizzle ORM:

| Table | Purpose |
| :--- | :--- |
| `user` | Core user identity, `role` (`USER` \| `ADMIN`), and `banned` flag (Better Auth compatible) |
| `session` | Active user sessions with token, expiration, IP, and user agent |
| `account` | Credential/OAuth account records and hashed passwords |
| `verification` | Verification tokens for email/password flows |
| `profile` | 1:1 user wellness goals (sleep, water, exercise, steps), chronotype, and timezone |
| `activities` | System default (`is_default = true`) and user-custom (`user_id`) activity categories |
| `daily_schedules` | 24-hour scheduled activity blocks (`date`, `start_time`, `end_time`, `duration_minutes`, `crosses_midnight`) |
| `health_logs` | Daily consolidated sleep, exercise, steps, water, mood, energy, and resting HR per user/date |
| `daily_checkins` | Timestamped mood, energy, and reflection check-in entries |
| `water_logs` | Individual hydration intake entries (`amount_ml`, `logged_at`) |
| `health_tips` | Curated wellness & circadian rhythm tips managed by administrators |

---

## 5. Environment Configuration

Copy `.env.example` to `.env` in `apps/api`, `packages/db`, and `apps/web`:

### Backend (`apps/api/.env` & `packages/db/.env`)

```env
DATABASE_URL="postgresql://user:password@ep-example-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-example.region.aws.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="replace-with-a-secure-32-char-random-secret-key"
BETTER_AUTH_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
PORT=3001
```

### Frontend (`apps/web/.env`)

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 6. Getting Started

```bash
# 1. Install dependencies across all workspaces
bun install

# 2. Run PostgreSQL migrations against Neon
bun run db:migrate

# 3. Seed the 10 default activity categories and curated wellness tips
bun run db:seed

# 4. Start both Backend API (port 3001) and Frontend Web App (port 3000)
bun run dev
```

---

## 7. REST API Overview (`apps/api`)

- **Auth**: `ALL /api/auth/*` (Better Auth sign-up, sign-in, sign-out, session)
- **Users**:
  - `GET /api/users/me` — Current authenticated user + wellness profile
  - `PATCH /api/users/me` — Update personal profile & daily wellness targets
  - `GET /api/users/:id` — User profile (restricted to owner or `ADMIN`)
- **Activity Categories**:
  - `GET /api/activities` — List system defaults + user's custom categories
  - `POST /api/activities` — Create custom category
  - `PATCH /api/activities/:id` / `DELETE /api/activities/:id` — Update/delete custom category
- **24-Hour Daily Schedules**:
  - `GET /api/schedules?date=YYYY-MM-DD` — Blocks, allocated/remaining minutes, and category distribution
  - `POST /api/schedules` — Schedule block with overlap validation (`409 SCHEDULE_OVERLAP`)
  - `PATCH /api/schedules/:id` / `DELETE /api/schedules/:id` — Update/remove block (owner-isolated)
- **Wellness Tracking**:
  - `GET /api/health?date=YYYY-MM-DD` / `POST /api/health` / `PATCH /api/health/:id`
  - `GET /api/water?date=YYYY-MM-DD` / `POST /api/water` / `DELETE /api/water/:id`
  - `GET /api/checkins?date=YYYY-MM-DD` / `POST /api/checkins`
  - `GET /api/tips`
- **Analytics & Insights**:
  - `GET /api/analytics/daily?date=YYYY-MM-DD`
  - `GET /api/analytics/weekly?date=YYYY-MM-DD`
  - `GET /api/analytics/monthly?date=YYYY-MM-DD`
- **Admin Governance (`ADMIN` role required)**:
  - `GET /api/admin/stats`
  - `GET /api/admin/users` / `PATCH /api/admin/users/:id`
  - `GET /api/admin/categories` / `POST /api/admin/categories` / `PATCH /api/admin/categories/:id` / `DELETE /api/admin/categories/:id`
  - `GET /api/admin/tips` / `POST /api/admin/tips` / `PATCH /api/admin/tips/:id` / `DELETE /api/admin/tips/:id`

---

## 8. Verification & Automated Tests

```bash
# Typecheck all packages and applications
bun run typecheck

# Run the backend unit & integration test suite (17 tests covering auth, RBAC, overlap validation, and user isolation)
bun run test
```
