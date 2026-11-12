# LifeSync Mobile Application

The dedicated mobile client for **LifeSync Wellness Platform**, engineered with Flutter, Dart, Riverpod, and Dio, adhering to the **Sanctuary Flow** design language.

> *"Your life, in better balance."*

---

## Architecture Overview

```text
lib/
├── app/
│   ├── app.dart                        # Root MaterialApp configuration
│   ├── router/
│   │   └── app_router.dart             # GoRouter StatefulShellRoute (5 bottom tabs + auth routes)
│   └── theme/
│       ├── app_colors.dart             # Sanctuary Flow palette (Forest Green #0D7A53, Soft Sage)
│       ├── app_text_theme.dart         # Plus Jakarta Sans & Inter typography
│       └── app_theme.dart              # Material 3 custom theme definitions
├── core/
│   ├── config/
│   │   └── app_config.dart             # API base URL (Railway production & local)
│   ├── errors/
│   │   └── failure.dart                # Unified error handling & exceptions
│   ├── network/
│   │   ├── api_client.dart             # Dio HTTP client with AuthInterceptor (Bearer & Session Cookie sync)
│   │   ├── api_endpoints.dart          # REST API route constants
│   │   └── api_response.dart           # Generic JSON envelope response model
│   └── storage/
│       ├── secure_storage_service.dart # FlutterSecureStorage for auth tokens
│       └── preferences_service.dart    # SharedPreferences for local settings
├── features/
│   ├── auth/                           # Login, Register, 5-Digit OTP Verification
│   ├── dashboard/                      # Home dashboard, vitals cards, breathing exercise
│   │   └── presentation/widgets/
│   │       ├── breathing_exercise_dialog.dart  # 1-Minute Box Breathing
│   │       ├── circadian_ring_chart.dart       # 24-Hour Donut Chart
│   │       ├── quick_sleep_sheet.dart          # Interactive Sleep hours & quality modal
│   │       ├── quick_water_sheet.dart          # Interactive Hydration intake modal
│   │       ├── quick_exercise_sheet.dart       # Exercise minutes & step counter modal
│   │       └── quick_checkin_sheet.dart        # Mood & Energy level check-in modal
│   ├── planner/                        # 24-Hour Circadian Timeline
│   │   └── presentation/widgets/
│   │       ├── circadian_ribbon_bar.dart       # Visual continuous 00:00-24:00 timeline ribbon
│   │       ├── routine_templates_bar.dart      # 1-Click presets (Salin Kemarin, Hari Kerja, Akhir Pekan)
│   │       └── add_schedule_sheet.dart         # Create/Edit schedule modal with 24-hour pickers
│   ├── wellness/                       # Health logs & consolidated biometric tracking
│   ├── insights/                       # 7-day fl_chart trend visualizations & averages
│   └── profile/                        # User targets, language toggle, and logout flow
├── shared/
│   ├── models/                         # Strongly-typed models matching backend schemas
│   └── widgets/                        # Reusable buttons, inputs, banners, loading states
└── main.dart                           # App entry point with Riverpod ProviderScope & id_ID locale
```

---

## Key Features

1. **24-Hour Circadian Ribbon Bar**:
   - Visual continuous strip across 24 hours (`00:00 - 24:00`) with live time marker (`Sekarang HH:MM`).
   - Tapping an open gap automatically opens the schedule creator pre-filled with that time buffer!
   - 1-Click Starter Routine Templates (`Salin Kemarin`, `Hari Kerja`, `Akhir Pekan`).
2. **Interactive Beranda (Dashboard)**:
   - Live daily balance score calculation.
   - Tap-to-edit modal sheets for Sleep, Water, Exercise/Steps, and Mood/Energy with visual `[ ✏️ Atur ]` badges.
   - 1-Minute Animated Box Breathing exercise.
3. **Seamless Better Auth & Neon API Integration**:
   - Automatic bearer token and cookie exchange with Railway backend API.
   - Clean overlap validation for schedule blocks across midnight.

---

## How to Run

### Development

```bash
# 1. Fetch dependencies
flutter pub get

# 2. Run on connected Android device or emulator
flutter run
```

### Build APK

```bash
# Build debug APK for testing
flutter build apk --debug

# Build release APK
flutter build apk --release
```

The compiled APK will be located at:
`build/app/outputs/flutter-apk/app-debug.apk`

---

## Verification & Testing

```bash
# Run unit & widget tests
flutter test

# Run static code analysis
flutter analyze
```
