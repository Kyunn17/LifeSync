import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const profile = pgTable(
  "profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    primaryFocus: text("primary_focus")
      .notNull()
      .default("Optimal Sleep & Recovery"),
    targetWakeTime: varchar("target_wake_time", { length: 5 })
      .notNull()
      .default("06:45"),
    targetSleepTime: varchar("target_sleep_time", { length: 5 })
      .notNull()
      .default("22:30"),
    dailyWaterGoalMl: integer("daily_water_goal_ml").notNull().default(2500),
    dailyStepsGoal: integer("daily_steps_goal").notNull().default(10000),
    dailySleepGoalMinutes: integer("daily_sleep_goal_minutes")
      .notNull()
      .default(480),
    dailyExerciseGoalMinutes: integer("daily_exercise_goal_minutes")
      .notNull()
      .default(45),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    notificationsEnabled: boolean("notifications_enabled")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profile_user_id_idx").on(table.userId)]
);

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    color: varchar("color", { length: 24 }).notNull().default("#0d7a53"),
    bgColor: varchar("bg_color", { length: 24 }).notNull().default("#eef4ff"),
    icon: varchar("icon", { length: 64 }).notNull().default("schedule"),
    description: text("description"),
    targetMinutesPerDay: integer("target_minutes_per_day")
      .notNull()
      .default(60),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("activities_user_id_idx").on(table.userId),
    index("activities_slug_idx").on(table.slug),
    index("activities_is_system_idx").on(table.isSystem),
  ]
);

export const dailySchedules = pgTable(
  "daily_schedules",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    date: varchar("date", { length: 10 }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    crossesMidnight: boolean("crosses_midnight").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("daily_schedules_user_date_idx").on(table.userId, table.date),
    index("daily_schedules_activity_id_idx").on(table.activityId),
  ]
);

export const healthLogs = pgTable(
  "health_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    sleepDurationMinutes: integer("sleep_duration_minutes")
      .notNull()
      .default(0),
    sleepQuality: integer("sleep_quality").default(85),
    exerciseDurationMinutes: integer("exercise_duration_minutes")
      .notNull()
      .default(0),
    dailySteps: integer("daily_steps").notNull().default(0),
    waterIntakeMl: integer("water_intake_ml").notNull().default(0),
    mood: varchar("mood", { length: 40 }).notNull().default("Calm"),
    energyLevel: integer("energy_level").notNull().default(75),
    restingHeartRate: integer("resting_heart_rate"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("health_logs_user_date_uidx").on(table.userId, table.date),
    index("health_logs_user_id_idx").on(table.userId),
  ]
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    mood: varchar("mood", { length: 40 }).notNull(),
    energyLevel: integer("energy_level").notNull(),
    reflection: text("reflection"),
    syncSleepPrediction: boolean("sync_sleep_prediction")
      .notNull()
      .default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("daily_checkins_user_date_idx").on(table.userId, table.date),
  ]
);

export const waterLogs = pgTable(
  "water_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    amountMl: integer("amount_ml").notNull(),
    loggedAt: timestamp("logged_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("water_logs_user_date_idx").on(table.userId, table.date)]
);

export const healthTips = pgTable(
  "health_tips",
  {
    id: text("id").primaryKey(),
    title: varchar("title", { length: 160 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    badgeText: varchar("badge_text", { length: 64 }).default("High Impact"),
    content: text("content").notNull(),
    icon: varchar("icon", { length: 64 }).notNull().default("lightbulb"),
    isActive: boolean("is_active").notNull().default(true),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("health_tips_category_idx").on(table.category),
    index("health_tips_is_active_idx").on(table.isActive),
  ]
);

