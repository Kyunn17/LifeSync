# LifeSync Wellness Platform

**LifeSync Wellness Platform** is an all-in-one digital wellness and daily 24-hour lifestyle management platform designed to help users build balance, track circadian routines, and nurture personal growth without comparison. Built with a modern Bun monorepo and cross-platform Flutter mobile architecture adhering to the **Sanctuary Flow** design system.

> *"Your life, in better balance."*  
> **Note:** LifeSync Wellness is a digital wellness and lifestyle management platform, **not** a medical diagnosis application.

---

## 1. Architecture & Monorepo Structure

```text
LifeSync/
├── apps/
│   ├── mobile/                 # Flutter 3.50+ Android/iOS Mobile App (Riverpod, Dio, GoRouter, fl_chart)
│   ├── web/                    # Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Recharts
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

### Mobile Application (`apps/mobile`)
- **Framework**: Flutter 3.50+ / Dart 3.7+
- **State Management**: Flutter Riverpod (`flutter_riverpod: ^2.6.1`)
- **Networking**: Dio (`dio: ^5.7.0`) with `AuthInterceptor` (Session Cookie & Bearer sync)
- **Navigation & Routing**: GoRouter (`go_router: ^14.6.2`) with `StatefulShellRoute` (5 persistent navigation branches)
- **Local Storage**: `flutter_secure_storage` & `shared_preferences`
- **Charts & Data Viz**: `fl_chart: ^0.69.2`
- **Typography & UI**: Google Fonts (*Plus Jakarta Sans* & *Inter*), Material 3 Sanctuary Flow styling

### Web Frontend (`apps/web`)
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, shadcn/ui, Lucide React, Material Symbols
- **Visualizations**: Recharts, Circadian Ribbon Timeline, 24-Hour Ring Chart
- **Form Management**: React Hook Form, Zod

### Backend API (`apps/api`)
- **Runtime & Server**: Bun, Express.js 4, TypeScript
- **Authentication**: Better Auth (`better-auth`) with session cookie management, 5-digit OTP verification, and RBAC
- **Validation**: Zod with `@lifesync/shared` schemas
- **Production Host**: Railway (`https://lifesyncapi-production.up.railway.app`)

### Database (`packages/db`)
- **Database Engine**: Neon Serverless PostgreSQL
- **ORM & Migrations**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Tables**: 11 normalized tables covering auth, sessions, profiles, categories, daily schedules, health logs, check-ins, water logs, and wellness tips

---

## 3. Core Applications & Features

### A. Mobile Application (`apps/mobile`)
1. **Beranda Interaktif (Home Dashboard)**:
   - **Skor Keseimbangan Harian (*Daily Balance Score*)**: Ringkasan performa circadian 24 jam real-time.
   - **Kartu Metrik Interaktif**: Ketuk untuk mengatur langsung (*Sleep Sheet*, *Water Sheet*, *Exercise Sheet*, *Check-in Sheet*).
   - **Latihan Pernapasan 1 Menit (*Box Breathing Exercise*)**: Animasi visual relaksasi 4-4-4-4 untuk menurunkan stres.
   - **Daftar Kebiasaan Harian (*Habit Checklist*)** & Tips Harian (*Wellness Tips*).
2. **Rencana 24 Jam (*24-Hour Circadian Planner*)**:
   - **Pita Sirkadian 24 Jam (*Continuous Circadian Ribbon Bar*)**: Garis waktu kontinu 00:00 - 24:00 dengan penanda waktu langsung (*Live Time Marker*), blok berkode warna kategori, dan celah waktu luang (*free time gaps*).
   - **Template Rutinitas Cepat (*1-Click Presets*)**: *"Salin Kemarin"*, *"Hari Kerja"*, dan *"Akhir Pekan"*.
   - **Isi Slot Luang Otomatis**: Mendeteksi celah kosong (>= 30 menit) dan langsung membuka form jadwal.
   - **Manajemen Blok**: Tambah, ubah, bagi menjadi 2 blok (*Split*), dan hapus.
3. **Pencatatan Kesehatan (*Wellness Hub*)**:
   - Monitor tidur, olahraga, langkah kaki, hidrasi air, mood (8 varian emosi), dan level energi (0-100%).
4. **Wawasan & Tren (*Insights*)**:
   - Grafik tren tidur 7 hari (*fl_chart*), statistik rata-rata mingguan, dan observasi gaya hidup.
5. **Profil & Pengaturan Akun (*Profile*)**:
   - Pengaturan target tidur, air minum, olahraga, pergantian bahasa, serta manajemen akun & logout aman.

### B. Web Frontend (`apps/web`)
- Dashboard analitik circadian lengkap dengan diagram cincin 24 jam.
- Perencana jadwal dengan drag/filter slot waktu dan template hari kerja.
- Konsol administrasi (**Admin Console** di `/admin`) untuk tata kelola pengguna, kategori sistem, dan kurasi tips wellness.

---

## 4. Visual Identity — *Sanctuary Flow*

The LifeSync platform is styled with a calm, premium wellness aesthetic:
- **Primary Color**: Forest Green (`#0D7A53`)
- **Secondary / Accent**: Soft Sage (`#BEE9D4` / `#486557`)
- **Neutral Light**: Crisp white surfaces (`#FFFFFF`) and warm grey canvas (`#F7FAF8`)
- **Typography**: *Plus Jakarta Sans* (Headings & Numbers) and *Inter* (Body & Micro-copy)

---

## 5. Database Schema (`packages/db`)

11 normalized PostgreSQL tables managed via Drizzle ORM:

| Table | Purpose |
| :--- | :--- |
| `user` | Core user identity, `role` (`USER` \| `ADMIN`), and `banned` flag |
| `session` | Active user sessions with token, expiration, IP, and user agent |
| `account` | Credential/OAuth account records and hashed passwords |
| `verification` | Verification tokens for email/password and OTP flows |
| `profile` | 1:1 user wellness goals (sleep, water, exercise, steps), chronotype, and timezone |
| `activities` | System default (`is_default = true`) and user-custom (`user_id`) activity categories |
| `daily_schedules` | 24-hour scheduled activity blocks (`date`, `start_time`, `end_time`, `duration_minutes`, `crosses_midnight`) |
| `health_logs` | Daily consolidated sleep, exercise, steps, water, mood, energy, and resting HR |
| `daily_checkins` | Timestamped mood, energy, and reflection check-in entries |
| `water_logs` | Individual hydration intake entries (`amount_ml`, `logged_at`) |
| `health_tips` | Curated wellness & circadian rhythm tips managed by administrators |

---

## 6. Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (v1.2+)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (v3.50+ / Dart 3.7+)
- [Android Studio & Android SDK](https://developer.android.com/studio) (API 34+ / NDK 28)

### Installation & Local Setup

```bash
# 1. Clone repository
git clone https://github.com/your-username/LifeSync.git
cd LifeSync

# 2. Install workspace dependencies
bun install

# 3. Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Running Backend & Web

```bash
# Run database migrations against Neon PostgreSQL
bun run db:migrate

# Seed default categories & tips
bun run db:seed

# Start backend (port 3001) & web app (port 3000)
bun run dev
```

### Running Flutter Mobile Application

```bash
cd apps/mobile

# Install Flutter dependencies
flutter pub get

# Run on connected Android device or emulator
flutter run

# Build Debug APK
flutter build apk --debug
# Output: apps/mobile/build/app/outputs/flutter-apk/app-debug.apk
```

---

## 7. Verification & Testing

```bash
# Typecheck TypeScript monorepo packages (shared, db, web, api)
bun run typecheck

# Run backend test suite
bun run test

# Run Flutter mobile unit & widget tests
cd apps/mobile
flutter test

# Run Flutter static analysis
flutter analyze
```

---

## 8. License

LifeSync Wellness Platform is developed for digital health and circadian balance management.  
All rights reserved © 2026 LifeSync Wellness.
