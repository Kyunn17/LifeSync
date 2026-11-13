import {
  pgTable,
  text,
  varchar,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: varchar("date", { length: 10 }).notNull(),
    mealType: varchar("meal_type", { length: 24 }).notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
    foodId: text("food_id"),
    foodName: varchar("food_name", { length: 160 }).notNull(),
    brand: varchar("brand", { length: 120 }),
    calories: real("calories").notNull(),
    proteins: real("proteins").notNull().default(0),
    carbohydrates: real("carbohydrates").notNull().default(0),
    fat: real("fat").notNull().default(0),
    servingSize: varchar("serving_size", { length: 80 }).notNull().default("1 porsi"),
    servings: real("servings").notNull().default(1),
    imageUrl: text("image_url"),
    source: varchar("source", { length: 32 }).notNull().default("manual"),
    loggedAt: timestamp("logged_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("meal_logs_user_date_idx").on(table.userId, table.date),
    index("meal_logs_user_id_idx").on(table.userId),
  ]
);

export const customFoods = pgTable(
  "custom_foods",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    brand: varchar("brand", { length: 120 }),
    calories: real("calories").notNull(),
    proteins: real("proteins").notNull().default(0),
    carbohydrates: real("carbohydrates").notNull().default(0),
    fat: real("fat").notNull().default(0),
    servingSize: varchar("serving_size", { length: 80 }).notNull().default("1 porsi"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("custom_foods_user_id_idx").on(table.userId)]
);

