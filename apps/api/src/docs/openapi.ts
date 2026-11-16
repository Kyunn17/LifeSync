export const openApiDocument: Record<string, unknown> = {
  openapi: "3.1.0",
  info: {
    title: "LifeSync Wellness API",
    version: "0.2.0",
    description:
      "REST API untuk **LifeSync Wellness** — sistem kesehatan personal adaptif berbasis biometrik tubuh, NEAT, kondisi medis, pelacakan berat badan harian dengan deteksi anomali >= 10 kg, nutrisi, jadwal harian, dan analitik kesejahteraan.",
  },
  servers: [
    {
      url: "https://life-sync-uizr-six.vercel.app",
      description: "Production (Vercel Serverless)",
    },
    {
      url: "http://localhost:3001",
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "System", description: "Health check dan status layanan" },
    {
      name: "Auth & Verification",
      description: "Autentikasi Better Auth dan verifikasi kode OTP Gmail 5 digit",
    },
    {
      name: "Users & Biometrics",
      description:
        "Profil pengguna, onboarding biometrik wajib, kalkulasi target adaptif (BMR/TDEE/NEAT), serta pencatatan & evaluasi mingguan berat badan",
    },
    { name: "Activities", description: "Kategori aktivitas harian & custom" },
    {
      name: "Schedules",
      description: "Blok jadwal harian 24 jam (termasuk lintas tengah malam)",
    },
    {
      name: "Wellness",
      description: "Log kesehatan harian (tidur, olahraga, langkah, stres), check-in mood, air minum, dan tips kesehatan",
    },
    {
      name: "Nutrition",
      description: "Pencatatan makanan harian, makanan custom, dan target kalori",
    },
    {
      name: "Analytics",
      description: "Skor wellness harian, tren mingguan, dan ringkasan bulanan",
    },
    {
      name: "Admin",
      description: "Endpoint khusus role ADMIN (RBAC) untuk mengelola pengguna, kategori sistem, dan tips",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Session token dari Better Auth sign-in/sign-up response",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Session cookie otomatis dari Better Auth",
      },
    },
    schemas: {
      ApiErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Request validation failed" },
              details: { type: "object", nullable: true },
            },
          },
        },
      },
      BiometricsSummary: {
        type: "object",
        properties: {
          bmi: { type: "number", example: 22.5 },
          bmiCategory: {
            type: "string",
            enum: ["Underweight", "Normal", "Overweight", "Obese"],
            example: "Normal",
          },
          bmr: { type: "integer", example: 1620 },
          tdee: { type: "integer", example: 2511 },
          neatMultiplier: { type: "number", example: 1.55 },
          dailyCalorieGoal: { type: "integer", example: 2111 },
          macroTargets: {
            type: "object",
            properties: {
              proteinGrams: { type: "integer", example: 117 },
              carbsGrams: { type: "integer", example: 279 },
              fatGrams: { type: "integer", example: 59 },
            },
          },
          dailyWaterGoalMl: { type: "integer", example: 2600 },
          dailyStepsGoal: { type: "integer", example: 9500 },
          dailyExerciseGoalMinutes: { type: "integer", example: 30 },
          dailyPushupGoal: { type: "integer", example: 16 },
          dailySleepGoalMinutes: { type: "integer", example: 480 },
          advisories: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      OnboardingProfileInput: {
        type: "object",
        required: [
          "gender",
          "age",
          "weightKg",
          "heightCm",
          "neatLevel",
          "fitnessGoal",
        ],
        properties: {
          gender: { type: "string", enum: ["MALE", "FEMALE"], example: "MALE" },
          age: { type: "integer", minimum: 10, maximum: 120, example: 25 },
          weightKg: { type: "number", minimum: 20, maximum: 350, example: 68.5 },
          heightCm: { type: "number", minimum: 80, maximum: 260, example: 172 },
          neatLevel: {
            type: "string",
            enum: ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"],
            example: "MODERATE",
          },
          fitnessGoal: {
            type: "string",
            enum: ["CUTTING", "MAINTENANCE", "BULKING", "ENDURANCE"],
            example: "CUTTING",
          },
          fitnessLevel: {
            type: "string",
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
            default: "BEGINNER",
          },
          medicalConditions: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "NONE",
                "ASTHMA",
                "HEART_CONDITION",
                "JOINT_PAIN",
                "DIABETES",
                "HYPERTENSION",
                "BACK_INJURY",
                "VERTIGO",
                "PREGNANCY",
              ],
            },
            example: ["ASTHMA"],
          },
          customMedicalCondition: {
            type: "string",
            nullable: true,
            maxLength: 300,
            example: "Pemulihan cedera lutut ringan",
          },
          targetWakeTime: { type: "string", example: "06:30" },
          targetSleepTime: { type: "string", example: "22:30" },
        },
      },
      UpdateProfileInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          primaryFocus: { type: "string" },
          targetWakeTime: { type: "string", example: "06:45" },
          targetSleepTime: { type: "string", example: "22:30" },
          dailyWaterGoalMl: { type: "integer", example: 2500 },
          dailyStepsGoal: { type: "integer", example: 9500 },
          dailySleepGoalMinutes: { type: "integer", example: 480 },
          dailyExerciseGoalMinutes: { type: "integer", example: 45 },
          dailyCalorieGoal: { type: "integer", example: 2100 },
          dailyPushupGoal: { type: "integer", example: 20 },
          weightKg: { type: "number", example: 67.8 },
          heightCm: { type: "number", example: 172 },
          neatLevel: {
            type: "string",
            enum: ["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"],
          },
          fitnessGoal: {
            type: "string",
            enum: ["CUTTING", "MAINTENANCE", "BULKING", "ENDURANCE"],
          },
          fitnessLevel: {
            type: "string",
            enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
          },
          medicalConditions: { type: "array", items: { type: "string" } },
          customMedicalCondition: { type: "string", nullable: true },
          isAutoCalculated: { type: "boolean" },
          bio: { type: "string", nullable: true },
          timezone: { type: "string", example: "Asia/Jakarta" },
          notificationsEnabled: { type: "boolean" },
        },
      },
      WeightLogInput: {
        type: "object",
        required: ["date", "weightKg"],
        properties: {
          date: { type: "string", example: "2026-11-16" },
          weightKg: { type: "number", minimum: 20, maximum: 350, example: 68.3 },
          confirmAnomaly: {
            type: "boolean",
            default: false,
            description:
              "Wajib bernilai true jika selisih dengan berat sebelumnya >= 10 kg",
          },
          anomalyNote: {
            type: "string",
            nullable: true,
            maxLength: 500,
            description:
              "Catatan alasan perubahan drastis >= 10 kg (wajib diisi jika selisih >= 10 kg)",
          },
          notes: { type: "string", nullable: true, maxLength: 500 },
        },
      },
      ActivityCategoryInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Deep Work" },
          slug: { type: "string", example: "deep-work" },
          color: { type: "string", example: "#0d7a53" },
          bgColor: { type: "string", example: "#eef4ff" },
          icon: { type: "string", example: "psychology" },
          description: { type: "string", nullable: true },
          targetMinutesPerDay: { type: "integer", example: 240 },
        },
      },
      ScheduleBlockInput: {
        type: "object",
        required: ["title", "activityId", "date", "startTime", "endTime"],
        properties: {
          title: { type: "string", example: "Morning Workout" },
          activityId: { type: "string", example: "act_exercise" },
          date: { type: "string", example: "2026-11-16" },
          startTime: { type: "string", example: "07:00" },
          endTime: { type: "string", example: "07:45" },
          description: { type: "string", nullable: true },
        },
      },
      HealthLogInput: {
        type: "object",
        required: [
          "date",
          "sleepDurationMinutes",
          "exerciseDurationMinutes",
          "mood",
          "energyLevel",
        ],
        properties: {
          date: { type: "string", example: "2026-11-16" },
          sleepDurationMinutes: { type: "integer", example: 450 },
          sleepQuality: { type: "integer", nullable: true, example: 88 },
          exerciseDurationMinutes: { type: "integer", example: 40 },
          dailySteps: { type: "integer", example: 8200 },
          waterIntakeMl: { type: "integer", example: 2200 },
          mood: {
            type: "string",
            enum: [
              "Peaceful",
              "Motivated",
              "Calm",
              "Focused",
              "Vibrant",
              "Steady",
              "Fatigued",
              "Restless",
            ],
            example: "Motivated",
          },
          energyLevel: { type: "integer", minimum: 1, maximum: 100, example: 82 },
          restingHeartRate: { type: "integer", nullable: true, example: 64 },
          notes: { type: "string", nullable: true },
        },
      },
      DailyCheckinInput: {
        type: "object",
        required: ["date", "mood", "energyLevel"],
        properties: {
          date: { type: "string", example: "2026-11-16" },
          mood: {
            type: "string",
            enum: [
              "Peaceful",
              "Motivated",
              "Calm",
              "Focused",
              "Vibrant",
              "Steady",
              "Fatigued",
              "Restless",
            ],
          },
          energyLevel: { type: "integer", minimum: 1, maximum: 100, example: 80 },
          reflection: { type: "string", nullable: true },
          syncSleepPrediction: { type: "boolean", default: true },
        },
      },
      WaterLogInput: {
        type: "object",
        required: ["date", "amountMl"],
        properties: {
          date: { type: "string", example: "2026-11-16" },
          amountMl: { type: "integer", minimum: 1, maximum: 5000, example: 250 },
        },
      },
      MealLogInput: {
        type: "object",
        required: ["date", "mealType", "foodName", "calories"],
        properties: {
          date: { type: "string", example: "2026-11-16" },
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            example: "lunch",
          },
          foodId: { type: "string", nullable: true },
          foodName: { type: "string", example: "Nasi Putih + Dada Ayam Bakar" },
          brand: { type: "string", nullable: true },
          calories: { type: "number", example: 420 },
          proteins: { type: "number", example: 34 },
          carbohydrates: { type: "number", example: 48 },
          fat: { type: "number", example: 9 },
          servingSize: { type: "string", example: "1 porsi" },
          servings: { type: "number", example: 1 },
          source: { type: "string", example: "katalog_nusantara" },
          loggedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CustomFoodInput: {
        type: "object",
        required: ["name", "calories"],
        properties: {
          name: { type: "string", example: "Smoothie Pisang Oat" },
          brand: { type: "string", nullable: true },
          calories: { type: "number", example: 280 },
          proteins: { type: "number", example: 10 },
          carbohydrates: { type: "number", example: 46 },
          fat: { type: "number", example: 6 },
          servingSize: { type: "string", example: "1 gelas" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    "/api/health-check": {
      get: {
        tags: ["System"],
        summary: "Cek status API",
        security: [],
        responses: {
          "200": {
            description: "API dalam kondisi sehat dan online",
          },
        },
      },
    },
    "/api/auth/sign-up/email": {
      post: {
        tags: ["Auth & Verification"],
        summary: "Daftar akun baru dengan Email & Password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Fakhrul" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Akun dibuat, kode OTP dikirim" } },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Auth & Verification"],
        summary: "Masuk dengan Email & Password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Berhasil masuk, token dikembalikan" } },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["Auth & Verification"],
        summary: "Keluar (hapus sesi)",
        responses: { "200": { description: "Sesi berhasil dihapus" } },
      },
    },
    "/api/auth/get-session": {
      get: {
        tags: ["Auth & Verification"],
        summary: "Ambil sesi Better Auth saat ini",
        responses: { "200": { description: "Detail sesi aktif atau null" } },
      },
    },
    "/api/verification-status": {
      get: {
        tags: ["Auth & Verification"],
        summary: "Cek status pengiriman OTP verifikasi email",
        security: [],
        parameters: [
          { name: "email", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Status pengiriman OTP terakhir" } },
      },
    },
    "/api/verify-code": {
      post: {
        tags: ["Auth & Verification"],
        summary: "Verifikasi email dengan kode OTP 5 digit",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code"],
                properties: {
                  email: { type: "string", format: "email" },
                  code: { type: "string", example: "12345" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Email berhasil diverifikasi" } },
      },
    },
    "/api/resend-code": {
      post: {
        tags: ["Auth & Verification"],
        summary: "Kirim ulang kode OTP verifikasi 5 digit",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: { "200": { description: "Kode OTP baru terkirim" } },
      },
    },
    "/api/users/me": {
      get: {
        tags: ["Users & Biometrics"],
        summary: "Ambil profil user, target harian, dan kalkulasi biometrik",
        responses: { "200": { description: "Profil lengkap beserta objek biometrics" } },
      },
      patch: {
        tags: ["Users & Biometrics"],
        summary: "Perbarui sebagian profil atau target kebugaran",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileInput" },
            },
          },
        },
        responses: { "200": { description: "Profil berhasil diperbarui" } },
      },
      put: {
        tags: ["Users & Biometrics"],
        summary: "Perbarui profil atau target kebugaran (PUT)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileInput" },
            },
          },
        },
        responses: { "200": { description: "Profil berhasil diperbarui" } },
      },
      delete: {
        tags: ["Users & Biometrics"],
        summary: "Hapus akun pengguna beserta seluruh datanya",
        responses: { "200": { description: "Akun berhasil dihapus" } },
      },
    },
    "/api/users/me/onboarding": {
      post: {
        tags: ["Users & Biometrics"],
        summary: "Selesaikan onboarding biometrik wajib & hitung target dinamis",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OnboardingProfileInput" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Onboarding selesai, target kalori/air/langkah/push-up dihitung otomatis",
          },
        },
      },
    },
    "/api/users/me/recalculate-goals": {
      post: {
        tags: ["Users & Biometrics"],
        summary: "Hitung ulang seluruh target harian berdasarkan profil biometrik terkini",
        responses: {
          "200": { description: "Target harian berhasil dikalkulasi ulang" },
        },
      },
    },
    "/api/users/me/weight": {
      get: {
        tags: ["Users & Biometrics"],
        summary: "Ambil riwayat berat badan dan evaluasi progres mingguan (Cutting/Bulking/Maintenance)",
        responses: {
          "200": { description: "Riwayat log timbangan (maks 30) & evaluasi mingguan" },
        },
      },
      post: {
        tags: ["Users & Biometrics"],
        summary: "Catat berat badan harian (dengan validasi lonjakan >= 10 kg)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WeightLogInput" },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Berat badan berhasil dicatat, target adaptif disinkronkan jika auto-calculated",
          },
          "409": {
            description:
              "WEIGHT_ANOMALY_CONFIRMATION_REQUIRED — perubahan >= 10 kg butuh confirmAnomaly=true dan anomalyNote",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users & Biometrics"],
        summary: "Ambil detail user berdasarkan ID (hanya pemilik atau ADMIN)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Detail user" } },
      },
    },
    "/api/activities": {
      get: {
        tags: ["Activities"],
        summary: "Daftar semua kategori aktivitas sistem & milik user",
        responses: { "200": { description: "Daftar kategori aktivitas" } },
      },
      post: {
        tags: ["Activities"],
        summary: "Buat kategori aktivitas custom baru",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActivityCategoryInput" },
            },
          },
        },
        responses: { "201": { description: "Kategori berhasil dibuat" } },
      },
    },
    "/api/activities/{id}": {
      patch: {
        tags: ["Activities"],
        summary: "Perbarui kategori aktivitas custom",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ActivityCategoryInput" },
            },
          },
        },
        responses: { "200": { description: "Kategori berhasil diperbarui" } },
      },
      put: {
        tags: ["Activities"],
        summary: "Perbarui kategori aktivitas custom (PUT)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Kategori berhasil diperbarui" } },
      },
      delete: {
        tags: ["Activities"],
        summary: "Hapus kategori aktivitas custom",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Kategori berhasil dihapus" } },
      },
    },
    "/api/schedules": {
      get: {
        tags: ["Schedules"],
        summary: "Ambil blok jadwal pada tanggal tertentu",
        parameters: [
          {
            name: "date",
            in: "query",
            required: false,
            schema: { type: "string", example: "2026-11-16" },
          },
        ],
        responses: { "200": { description: "Daftar blok jadwal harian" } },
      },
      post: {
        tags: ["Schedules"],
        summary: "Tambah blok jadwal baru",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ScheduleBlockInput" },
            },
          },
        },
        responses: { "201": { description: "Jadwal berhasil dibuat" } },
      },
    },
    "/api/schedules/{id}": {
      patch: {
        tags: ["Schedules"],
        summary: "Perbarui blok jadwal",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Jadwal diperbarui" } },
      },
      put: {
        tags: ["Schedules"],
        summary: "Perbarui blok jadwal (PUT)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Jadwal diperbarui" } },
      },
      delete: {
        tags: ["Schedules"],
        summary: "Hapus blok jadwal",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Jadwal dihapus" } },
      },
    },
    "/api/health": {
      get: {
        tags: ["Wellness"],
        summary: "Ambil catatan biometrik/kesehatan harian",
        parameters: [
          { name: "date", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string" } },
          { name: "to", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 30 } },
        ],
        responses: { "200": { description: "Data health log" } },
      },
      post: {
        tags: ["Wellness"],
        summary: "Simpan atau perbarui catatan kesehatan harian (Upsert per tanggal)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/HealthLogInput" },
            },
          },
        },
        responses: { "200": { description: "Health log tersimpan" } },
      },
    },
    "/api/health/{id}": {
      patch: {
        tags: ["Wellness"],
        summary: "Perbarui health log by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Health log diperbarui" } },
      },
      put: {
        tags: ["Wellness"],
        summary: "Perbarui health log by ID (PUT)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Health log diperbarui" } },
      },
      delete: {
        tags: ["Wellness"],
        summary: "Hapus health log",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Health log dihapus" } },
      },
    },
    "/api/checkins": {
      get: {
        tags: ["Wellness"],
        summary: "Daftar daily mood & energy check-in",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Daftar check-in" } },
      },
      post: {
        tags: ["Wellness"],
        summary: "Simpan check-in mood & energi",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DailyCheckinInput" },
            },
          },
        },
        responses: { "201": { description: "Check-in tersimpan" } },
      },
    },
    "/api/water": {
      get: {
        tags: ["Wellness"],
        summary: "Ambil riwayat hidrasi harian",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Daftar catatan minum air" } },
      },
      post: {
        tags: ["Wellness"],
        summary: "Tambah catatan minum air (ml)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WaterLogInput" },
            },
          },
        },
        responses: { "201": { description: "Catatan hidrasi ditambahkan" } },
      },
    },
    "/api/tips": {
      get: {
        tags: ["Wellness"],
        summary: "Ambil tips kesehatan aktif",
        responses: { "200": { description: "Daftar tips kesehatan" } },
      },
    },
    "/api/nutrition/meals": {
      get: {
        tags: ["Nutrition"],
        summary: "Ambil catatan makan harian & target kalori",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Daftar makanan & target kalori" } },
      },
      post: {
        tags: ["Nutrition"],
        summary: "Catat makanan ke jurnal nutrisi",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MealLogInput" },
            },
          },
        },
        responses: { "201": { description: "Makanan tercatat" } },
      },
    },
    "/api/nutrition/meals/{id}": {
      delete: {
        tags: ["Nutrition"],
        summary: "Hapus catatan makan",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Catatan makan dihapus" } },
      },
    },
    "/api/nutrition/custom-foods": {
      get: {
        tags: ["Nutrition"],
        summary: "Daftar makanan custom milik pengguna",
        responses: { "200": { description: "Daftar custom foods" } },
      },
      post: {
        tags: ["Nutrition"],
        summary: "Simpan makanan custom baru",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CustomFoodInput" },
            },
          },
        },
        responses: { "201": { description: "Makanan custom dibuat" } },
      },
    },
    "/api/nutrition/custom-foods/{id}": {
      delete: {
        tags: ["Nutrition"],
        summary: "Hapus makanan custom",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Makanan custom dihapus" } },
      },
    },
    "/api/nutrition/goal": {
      put: {
        tags: ["Nutrition"],
        summary: "Perbarui target kalori harian",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["goal"],
                properties: { goal: { type: "integer", example: 2100 } },
              },
            },
          },
        },
        responses: { "200": { description: "Target kalori diperbarui" } },
      },
    },
    "/api/analytics/daily": {
      get: {
        tags: ["Analytics"],
        summary: "Bundle analitik harian (skor wellness, jadwal, nutrisi, progres target)",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Analitik harian" } },
      },
    },
    "/api/analytics/weekly": {
      get: {
        tags: ["Analytics"],
        summary: "Tren & agregasi mingguan (7 hari terakhir)",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Analitik mingguan" } },
      },
    },
    "/api/analytics/monthly": {
      get: {
        tags: ["Analytics"],
        summary: "Tren & ringkasan bulanan",
        parameters: [{ name: "date", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "Analitik bulanan" } },
      },
    },
    "/api/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Statistik global sistem (ADMIN only)",
        responses: { "200": { description: "Statistik sistem" } },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Daftar seluruh pengguna (ADMIN only)",
        responses: { "200": { description: "Daftar user" } },
      },
    },
    "/api/admin/users/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Ubah role atau status banned pengguna (ADMIN only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "User diperbarui" } },
      },
    },
    "/api/admin/categories": {
      get: {
        tags: ["Admin"],
        summary: "Daftar kategori sistem (ADMIN only)",
        responses: { "200": { description: "Daftar kategori" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Buat kategori sistem baru (ADMIN only)",
        responses: { "201": { description: "Kategori sistem dibuat" } },
      },
    },
    "/api/admin/categories/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit kategori sistem (ADMIN only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Kategori diperbarui" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Hapus kategori sistem (ADMIN only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Kategori dihapus" } },
      },
    },
    "/api/admin/tips": {
      get: {
        tags: ["Admin"],
        summary: "Daftar seluruh tips kesehatan (ADMIN only)",
        responses: { "200": { description: "Daftar tips" } },
      },
      post: {
        tags: ["Admin"],
        summary: "Tambah tips kesehatan baru (ADMIN only)",
        responses: { "201": { description: "Tip dibuat" } },
      },
    },
    "/api/admin/tips/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Edit tip kesehatan (ADMIN only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Tip diperbarui" } },
      },
      delete: {
        tags: ["Admin"],
        summary: "Hapus tip kesehatan (ADMIN only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Tip dihapus" } },
      },
    },
  },
};
