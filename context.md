# LifeSync Wellness — System Architecture & Context Documentation

> **Platform Designation:** Production-Minded Digital Wellness & Daily Lifestyle Management Platform  
> **Notice:** LifeSync Wellness is designed for lifestyle habit organization, time balance, and holistic daily well-being. It is **NOT** a clinical diagnosis or medical treatment system.

---

## 1. Executive Summary & Objective

**LifeSync Wellness** is a fullstack web application designed to help modern individuals regain balance over their daily lives. In a world saturated with digital fatigue and irregular schedules, LifeSync enables users to:

1. **Master the Daily 24 Hours (1,440 Minutes):** Intentionally allocate time across sleep, deep focus, meals, movement, rest, and personal time.
2. **Cultivate Consistent Daily Habits:** Track sleep duration, physical activity, hydration, daily steps, and emotional energy.
3. **Gain Real, Honest Insights:** Review weekly and monthly habit trends without artificial or fabricated clinical scores.
4. **Experience Layperson-Friendly Wellness:** Use straightforward, friendly language in both English (`EN`) and Bahasa Indonesia (`ID`) rather than clinical or academic jargon.
5. **Maintain Data Sovereignty:** Strict user ownership, email verification via Resend, robust role-based access control (RBAC), and a self-service account deletion mechanism.

---

## 2. Technology Stack

The project is built as a unified **Bun Monorepo** ensuring high performance, end-to-end TypeScript type safety, and clean separation of concerns.

```text
lifesync/
├── apps/
│   ├── web/                    # Frontend: Next.js 15 (App Router), React 19, Tailwind CSS v4
│   └── api/                    # Backend: Express.js, TypeScript, Better Auth, Resend
├── packages/
│   ├── db/                     # Database: Drizzle ORM, Neon PostgreSQL, Migrations & Seeds
│   └── shared/                 # Shared: Shared Types, Validation Schemas (Zod), Constants
├── package.json                # Bun workspace root configuration
├── tsconfig.base.json          # Shared compiler options
└── context.md                  # System architecture and context documentation
```

### Frontend (`apps/web`)
- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript 5.8 (Strict Mode)
- **Styling:** Tailwind CSS v4, custom `Sanctuary Flow` theme
- **UI Components:** Custom Radix / shadcn/ui patterns, Lucide React, Material Symbols Outlined
- **Charts & Visualizations:** Recharts, custom SVG circular rings, panoramic 24-hour timeline
- **Form Handling:** React Hook Form, Zod (`@hookform/resolvers/zod`)
- **Authentication Client:** `better-auth/react`
- **Localization:** Bilingual i18n Context (`EN` / `ID`)

### Backend (`apps/api`)
- **Runtime:** Bun
- **Framework:** Express.js 4 (RESTful Architecture)
- **Language:** TypeScript
- **Authentication Engine:** Better Auth (`better-auth`) with Drizzle adapter
- **Email Delivery:** Resend SDK (`resend`) for Gmail verification & password resets
- **Request Validation:** Zod middleware (`validateBody`, `validateQuery`)
- **Security:** HTTP-only cookies, SameSite Lax, CORS origin whitelisting, role-based authorization

### Database (`packages/db`)
- **Engine:** PostgreSQL
- **Cloud Provider:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Schema:** 11 normalized relational tables with foreign keys and cascading rules

---

## 3. Core Functional Requirements & Features

### A. Authentication & Email Verification
- **User Registration & Login:** Email + password authentication powered by Better Auth.
- **Strict Email Verification:**
  - Integrated with **Resend** to send branded, responsive HTML verification emails to user Gmail addresses.
  - New registrations require email verification before full platform features are unlocked.
  - Dedicated **Verification Step Screen** after sign-up with email display and resend countdown.
  - Blocking overlay in the dashboard for unverified accounts with an instant *"Resend Verification Email"* action.
- **Password Reset:** Secure 1-hour expiration token emails sent via Resend.
- **Account Deletion (Self-Service):** Users can permanently delete their account and wipe all associated schedules, logs, and profiles through a double-confirmation modal in Settings.

### B. Role-Based Access Control (RBAC)
- **`USER` Role:**
  - Default role assigned to every new registration (`input: false` prevents privilege escalation).
  - Access to personal dashboard, 24-hour schedules, wellness logging, insights, and account settings.
  - Strictly isolated: users cannot query or mutate data belonging to other users.
- **`ADMIN` Role:**
  - Dedicated Admin Console (`/admin`).
  - View platform adoption metrics (total users, active users, weekly activity blocks).
  - User governance: change roles (`USER` $\leftrightarrow$ `ADMIN`) and toggle suspensions (`banned: true/false`).
  - Activity category governance: add, edit, or delete platform default categories.
  - Wellness tips management: publish and edit inspirational tips.
  - **Privacy Guarantee:** Administrators cannot inspect private personal schedules or wellness logs.

### C. 24-Hour Daily Time Allocation (`/schedule`) — Core Engine
The platform treats every day as a bounded 24-hour canvas ($1,440\text{ minutes}$):
- **Activity Blocks:** Create, edit, and delete scheduled activities with start/end times.
- **10 Default Categories:** Sleep, Work, Study, Exercise, Meals, Commute, Entertainment, Personal Time, Rest, Other (plus custom user-created categories).
- **Midnight Crossing Support:** Supports night shifts and sleep schedules spanning across midnight (e.g., `22:30` to `06:30` $\to$ $480\text{ minutes}$).
- **Server-Side Overlap Prevention:** Backend validates time intervals. If an activity conflicts with an existing block on that date, it responds with `409 SCHEDULE_OVERLAP`.
- **Unallocated Time Tracking:** Clearly indicates unassigned time remaining in the 24-hour day.
- **1-Click Starter Schedule Templates:**
  - **Copy Yesterday (`Salin Kemarin`):** Clones all schedule blocks from yesterday into today with one click.
  - **Workday Template (`Hari Kerja`):** Pre-populates a balanced routine: Morning routine, deep work, lunch reset, afternoon tasks, workout, dinner, and sleep.
  - **Weekend Template (`Akhir Pekan`):** Pre-populates a relaxed weekend: Gentle morning, outdoor walk, leisure time, hobbies, family dinner, and recovery rest.
- **24-Hour Panoramic Timeline:** Visual strip illustrating the entire day across night, morning, afternoon, and evening phases with a live time indicator.

### D. Daily Wellness & Lifestyle Tracking (`/wellness`)
- **Sleep:** Duration in hours/minutes and subjective sleep quality rating ($1\text{--}100$).
- **Hydration:** Daily water volume in milliliters with quick-add buttons (`+250ml`, `+500ml`, `+750ml`, `+1000ml`).
- **Physical Activity:** Exercise duration in minutes and daily step counter.
- **Daily Mood & Energy:** 8 everyday mood states (*Peaceful, Motivated, Calm, Focused, Vibrant, Steady, Fatigued, Restless*) paired with an energy percentage slider ($1\text{--}100\%$).
- **Personal Notes:** Daily reflection on thoughts, meals, or feelings.
- **Quick Logging Drawer:** Sliding right-side drawer to log vitals from any screen.

### E. Interactive Dashboard Utilities (`/dashboard`)
- **Daily Habits & Streak Checklist:** Real-time checklist tracking 5 core lifestyle habits (Sleep target, Hydration, Movement/Exercise, Schedule planned, Evening check-in) with a 5-day consistency streak and dynamic progress bar.
- **Relaxation & Focus Breathing Timer:** Interactive in-dashboard 1-minute box breathing widget (4s Inhale $\to$ 4s Hold $\to$ 4s Exhale $\to$ 4s Rest) featuring an animated breathing circle, countdown display, and play/pause controls.
- **24-Hour Allocation Ring:** Donut chart and chronological timeline visualizing today's hour-by-hour distribution.

### F. Analytics & Insights (`/insights`)
- **7-Day Trend Correlations:** Sleep vs. exercise vs. mood relationships.
- **Weekly & Monthly Activity Distribution:** Category breakdown showing where time was actually spent.
- **Previous-Week Comparison:** Delta indicators ($\pm\%$) comparing current week against past performance without fabricating health statistics.
- **Honest Empty States:** Clear guidance when insufficient records exist.

---

## 4. Database Schema (`packages/db`)

Managed via **Drizzle ORM** with Neon Serverless PostgreSQL. 11 normalized tables:

```mermaid
erDiagram
    user ||--o{ session : "has"
    user ||--o{ account : "has"
    user ||--o{ profile : "owns (1:1)"
    user ||--o{ daily_schedules : "schedules"
    user ||--o{ health_logs : "logs"
    user ||--o{ daily_checkins : "checks in"
    user ||--o{ water_logs : "drinks"
    user ||--o{ activities : "creates custom"
    activities ||--o{ daily_schedules : "categorizes"
    user ||--o{ health_tips : "authors (admin)"
    verification ||--|| user : "verifies email"

    user {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        text role "USER | ADMIN"
        boolean banned
        timestamp created_at
        timestamp updated_at
    }

    session {
        text id PK
        text user_id FK
        text token UK
        timestamp expires_at
        text ip_address
        text user_agent
    }

    account {
        text id PK
        text user_id FK
        text account_id
        text provider_id
        text password
    }

    verification {
        text id PK
        text identifier
        text value
        timestamp expires_at
    }

    profile {
        text id PK
        text user_id FK, UK
        text bio
        text primary_focus
        text target_wake_time
        text target_sleep_time
        integer daily_water_goal_ml
        integer daily_steps_goal
        integer daily_sleep_goal_minutes
        integer daily_exercise_goal_minutes
        text timezone
        boolean notifications_enabled
    }

    activities {
        text id PK
        text user_id FK "null for system defaults"
        text name
        text slug
        text color
        text bg_color
        text icon
        boolean is_default
        integer target_minutes_per_day
    }

    daily_schedules {
        text id PK
        text user_id FK
        text activity_id FK
        text title
        text description
        text date "YYYY-MM-DD"
        text start_time "HH:MM"
        text end_time "HH:MM"
        integer duration_minutes
        boolean crosses_midnight
    }

    health_logs {
        text id PK
        text user_id FK
        text date "YYYY-MM-DD"
        integer sleep_duration_minutes
        integer sleep_quality
        integer exercise_duration_minutes
        integer daily_steps
        integer water_intake_ml
        text mood
        integer energy_level
        integer resting_heart_rate
        text notes
    }

    daily_checkins {
        text id PK
        text user_id FK
        text date "YYYY-MM-DD"
        text mood
        integer energy_level
        text reflection
    }

    water_logs {
        text id PK
        text user_id FK
        text date "YYYY-MM-DD"
        integer amount_ml
        timestamp logged_at
    }

    health_tips {
        text id PK
        text author_id FK
        text title
        text category
        text content
        text action_label
        text icon
        boolean is_active
    }
```

---

## 5. REST API Specifications

The Express.js backend exposes structured REST endpoints with standardized JSON responses:

```typescript
// Standard API Envelope
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Endpoints Catalog

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `ALL` | `/api/auth/*` | Public | Better Auth endpoints (sign-in, sign-up, sign-out, session, verify-email) |
| `GET` | `/api/users/me` | Auth User | Fetch current authenticated user and 1:1 profile |
| `PATCH` | `/api/users/me` | Auth User | Update user profile goals, focus, sleep targets, and bio |
| `DELETE` | `/api/users/me` | Auth User | Permanently delete user account and cascade delete all data |
| `GET` | `/api/users/:id` | Admin / Self | Inspect user details (strictly enforced ownership/RBAC) |
| `GET` | `/api/activities` | Auth User | List default categories + user custom categories |
| `POST` | `/api/activities` | Auth User | Create custom user category |
| `GET` | `/api/schedules` | Auth User | Query 24h schedule blocks for `?date=YYYY-MM-DD` |
| `POST` | `/api/schedules` | Auth User | Create schedule block (with overlap validation) |
| `PUT` | `/api/schedules/:id`| Auth User | Update schedule block (validates ownership & overlaps) |
| `DELETE`| `/api/schedules/:id`| Auth User | Delete schedule block (validates ownership) |
| `GET` | `/api/health` | Auth User | List recent health logs or query specific date |
| `POST` | `/api/health` | Auth User | Upsert daily consolidated health log |
| `POST` | `/api/checkins` | Auth User | Record daily mood, energy level, and reflection |
| `POST` | `/api/water` | Auth User | Log hydration intake increment |
| `GET` | `/api/analytics/daily` | Auth User | Comprehensive daily dashboard bundle (schedule + vitals) |
| `GET` | `/api/analytics/weekly`| Auth User | 7-day aggregation, category distribution, delta comparison |
| `GET` | `/api/analytics/monthly`| Auth User| 30-day wellness aggregation and trend patterns |
| `GET` | `/api/admin/metrics` | Admin | Overall platform adoption metrics |
| `GET` | `/api/admin/users` | Admin | Paginated user governance list with status and roles |
| `PATCH`| `/api/admin/users/:id/role` | Admin | Update user role (`USER` $\leftrightarrow$ `ADMIN`) |
| `PATCH`| `/api/admin/users/:id/status`| Admin | Suspend or activate user account (`banned: true/false`) |
| `POST` | `/api/admin/categories` | Admin | Create system-wide default category |
| `POST` | `/api/admin/tips` | Admin | Create inspirational wellness tip |

---

## 6. Business Logic & Validation Rules

1. **Non-Overlapping Schedule Guarantee:**
   - Any proposed block on date $D$ from $S_1$ to $E_1$ cannot overlap with an existing block $S_2$ to $E_2$.
   - Converted to daily minutes ($[0, 1440)$).
   - If $E < S$, the activity crosses midnight ($[S_1, 1440)$ on date $D$ and $[0, E_1)$ on date $D+1$).
   - Rejection code: `409 SCHEDULE_OVERLAP`.
2. **Flexible 24-Hour Day:**
   - The system allows unallocated free space. It never forces every day to contain exactly 1,440 minutes of scheduled activities.
3. **Strict Data Isolation:**
   - Every read and write query on schedules, logs, check-ins, water records, and profile filters by `eq(table.userId, req.user.id)`.
   - The user ID is strictly taken from the verified Better Auth session token on the backend, never trusted from frontend request bodies.
4. **Email Verification Enforcement:**
   - If `REQUIRE_EMAIL_VERIFICATION` is enabled, unverified users are blocked at the middleware level from fetching private dashboard data and must verify their Gmail first.
5. **Admin Privacy Boundary:**
   - Administrators manage roles and categories, but the backend does not expose private schedules, diaries, or individual health metrics to administrative endpoints.

---

## 7. Localization (`i18n`) System

LifeSync includes first-class bilingual support:
- **English (`EN`)** & **Bahasa Indonesia (`ID`)**.
- Implemented via `LanguageContext` ([i18n.tsx](file:///c:/belajarotodidak/Project%20Latihan/LifeSync/apps/web/src/lib/i18n.tsx)) with `localStorage` persistence.
- Helper function `t(enText, idText)` provides inline bilingual translations across all pages and components.
- Default categories provide bilingual translations (e.g., `Sleep` $\leftrightarrow$ `Tidur`, `Work` $\leftrightarrow$ `Kerja`, `Meals` $\leftrightarrow$ `Makan`).

---

## 8. Brand Assets & Visual Identity

- **Primary Brand Color:** Forest Green (`#0D7A53` / `rgb(13, 122, 83)`)
- **Secondary Accent:** Soft Sage Green (`#E8F5E9` / `#C8E6C9`)
- **Surface Background:** Pure White (`#FFFFFF`) and Light Neutral Surface (`#F7FAF8`)
- **Typography:** Inter (Body) and Plus Jakarta Sans (Headlines)
- **Brand Logo:** Official high-resolution 500x500 squircle icon representing holistic heart & nature balance:
  - Static public assets: `/favicon.png`, `/logo.png`, `/icon.png` in `apps/web/public/`
  - Next.js auto-icon: `apps/web/src/app/icon.png`
  - Rendered at `w-12 h-12` (48px) in navbars and `w-20 h-20` (80px) in auth cards with clean, unconstrained borders.

---

## 9. Environment Setup & Execution

### Environment Variables

#### Backend (`apps/api/.env` & `packages/db/.env`)
```env
DATABASE_URL="postgresql://user:password@ep-pooler.region.neon.tech/lifesync?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-direct.region.neon.tech/lifesync?sslmode=require"
BETTER_AUTH_SECRET="your-32-character-random-secret"
BETTER_AUTH_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
PORT=3001
RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="LifeSync Wellness <onboarding@resend.dev>"
REQUIRE_EMAIL_VERIFICATION=true
```

#### Frontend (`apps/web/.env`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Essential CLI Commands

```bash
# Install all monorepo dependencies
bun install

# Run database migrations
bun run db:migrate

# Seed default categories & wellness tips
bun run db:seed

# Start development servers (frontend on :3000, backend on :3001)
bun run dev

# Run TypeScript compilation checks across all 4 workspaces
bun run typecheck

# Run test suites
bun run test
```

---

*Documentation Version: 1.0.0 — LifeSync Wellness Platform*
