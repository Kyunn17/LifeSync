import { z } from "zod";

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_ACTIVITY_CATEGORIES = [
  {
    name: "Sleep",
    slug: "sleep",
    color: "#005f3f",
    bgColor: "#eef2ff",
    icon: "bedtime",
    description: "Deep restorative sleep and nocturnal recovery",
    targetMinutesPerDay: 480,
  },
  {
    name: "Work",
    slug: "work",
    color: "#0d7a53",
    bgColor: "#f0fdfa",
    icon: "psychology",
    description: "Deep focus sprints and collaborative work",
    targetMinutesPerDay: 420,
  },
  {
    name: "Study",
    slug: "study",
    color: "#006c48",
    bgColor: "#ebf5ee",
    icon: "menu_book",
    description: "Learning, skill building, and research",
    targetMinutesPerDay: 120,
  },
  {
    name: "Exercise",
    slug: "exercise",
    color: "#4edea3",
    bgColor: "#fff7ed",
    icon: "directions_run",
    description: "Aerobic movement, strength, and mobility",
    targetMinutesPerDay: 60,
  },
  {
    name: "Meals",
    slug: "meals",
    color: "#a5d0bc",
    bgColor: "#fffbeb",
    icon: "restaurant",
    description: "Mindful nutrition and metabolic windows",
    targetMinutesPerDay: 105,
  },
  {
    name: "Commute",
    slug: "commute",
    color: "#3f6656",
    bgColor: "#f8fafc",
    icon: "directions_subway",
    description: "Transit and active commuting",
    targetMinutesPerDay: 60,
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    color: "#7cd9aa",
    bgColor: "#f5f3ff",
    icon: "movie",
    description: "Recreation, media, and leisure",
    targetMinutesPerDay: 60,
  },
  {
    name: "Personal Time",
    slug: "personal-time",
    color: "#98f6c5",
    bgColor: "#f5f3ff",
    icon: "auto_stories",
    description: "Family, hobbies, creative reading, and self-care",
    targetMinutesPerDay: 120,
  },
  {
    name: "Rest",
    slug: "rest",
    color: "#bee9d4",
    bgColor: "#f0f9ff",
    icon: "self_improvement",
    description: "Wind-down, meditation, and tech-free decompression",
    targetMinutesPerDay: 90,
  },
  {
    name: "Other",
    slug: "other",
    color: "#6e7a72",
    bgColor: "#eef4ff",
    icon: "more_horiz",
    description: "Miscellaneous daily activities and buffers",
    targetMinutesPerDay: 60,
  },
] as const;

export const MOOD_TYPES = [
  "Peaceful",
  "Motivated",
  "Calm",
  "Focused",
  "Vibrant",
  "Steady",
  "Fatigued",
  "Restless",
] as const;
export type MoodType = (typeof MOOD_TYPES)[number];

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM (24-hour) format");

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const activityCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(80),
  slug: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required").default("#0d7a53"),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex background color required").default("#eef4ff"),
  icon: z.string().min(1).max(64).default("schedule"),
  description: z.string().max(300).optional().nullable(),
  targetMinutesPerDay: z.number().int().min(0).max(1440).default(60),
});

export type ActivityCategoryInput = z.infer<typeof activityCategorySchema>;

export const scheduleBlockSchema = z.object({
  title: z.string().min(1, "Activity title is required").max(120),
  activityId: z.string().min(1, "Category is required"),
  date: dateStringSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  description: z.string().max(500).optional().nullable(),
});

export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>;

export const updateScheduleBlockSchema = scheduleBlockSchema.partial();
export type UpdateScheduleBlockInput = z.infer<typeof updateScheduleBlockSchema>;

export const healthLogSchema = z.object({
  date: dateStringSchema,
  sleepDurationMinutes: z.number().int().min(0).max(1440),
  sleepQuality: z.number().int().min(0).max(100).optional().nullable(),
  exerciseDurationMinutes: z.number().int().min(0).max(1440),
  dailySteps: z.number().int().min(0).max(200000).default(0),
  waterIntakeMl: z.number().int().min(0).max(20000).default(0),
  mood: z.enum(MOOD_TYPES),
  energyLevel: z.number().int().min(1).max(100),
  restingHeartRate: z.number().int().min(30).max(220).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type HealthLogInput = z.infer<typeof healthLogSchema>;

export const dailyCheckinSchema = z.object({
  date: dateStringSchema,
  mood: z.enum(MOOD_TYPES),
  energyLevel: z.number().int().min(1).max(100),
  reflection: z.string().max(1000).optional().nullable(),
  syncSleepPrediction: z.boolean().optional().default(true),
});

export type DailyCheckinInput = z.infer<typeof dailyCheckinSchema>;

export const waterLogSchema = z.object({
  date: dateStringSchema,
  amountMl: z.number().int().min(1).max(5000),
});

export type WaterLogInput = z.infer<typeof waterLogSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  primaryFocus: z.string().max(120).optional(),
  targetWakeTime: timeStringSchema.optional(),
  targetSleepTime: timeStringSchema.optional(),
  dailyWaterGoalMl: z.number().int().min(500).max(10000).optional(),
  dailyStepsGoal: z.number().int().min(1000).max(100000).optional(),
  dailySleepGoalMinutes: z.number().int().min(120).max(960).optional(),
  dailyExerciseGoalMinutes: z.number().int().min(0).max(600).optional(),
  dailyCalorieGoal: z.number().int().min(500).max(10000).optional(),
  bio: z.string().max(500).optional().nullable(),
  timezone: z.string().max(64).optional(),
  notificationsEnabled: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const adminUpdateUserSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  banned: z.boolean().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const wellnessTipSchema = z.object({
  title: z.string().min(3, "Tip title is required").max(160),
  category: z.string().min(2, "Category is required").max(80),
  content: z.string().min(10, "Tip content is required").max(1000),
  actionLabel: z.string().max(120).optional().nullable(),
  icon: z.string().min(1).max(64).default("lightbulb"),
  isActive: z.boolean().default(true),
});

export type WellnessTipInput = z.infer<typeof wellnessTipSchema>;

export const updateWellnessTipSchema = wellnessTipSchema.partial();
export type UpdateWellnessTipInput = z.infer<typeof updateWellnessTipSchema>;

// Nutrition & Calorie Tracking
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const mealLogSchema = z.object({
  id: z.string().optional(),
  date: dateStringSchema,
  mealType: z.enum(MEAL_TYPES),
  foodId: z.string().optional().nullable(),
  foodName: z.string().min(1, "Nama makanan wajib diisi").max(160),
  brand: z.string().max(120).optional().nullable(),
  calories: z.number().min(0, "Kalori tidak boleh negatif"),
  proteins: z.number().min(0).default(0),
  carbohydrates: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  servingSize: z.string().max(80).default("1 porsi"),
  servings: z.number().min(0.1).max(50).default(1.0),
  imageUrl: z.string().optional().nullable(),
  source: z.string().max(32).default("manual"),
  loggedAt: z.string().datetime().optional().nullable(),
});

export type MealLogInput = z.infer<typeof mealLogSchema>;

export const updateMealLogSchema = mealLogSchema.partial();
export type UpdateMealLogInput = z.infer<typeof updateMealLogSchema>;

export const customFoodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama makanan wajib diisi").max(160),
  brand: z.string().max(120).optional().nullable(),
  calories: z.number().min(0),
  proteins: z.number().min(0).default(0),
  carbohydrates: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  servingSize: z.string().max(80).default("1 porsi"),
  imageUrl: z.string().optional().nullable(),
});

export type CustomFoodInput = z.infer<typeof customFoodSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
