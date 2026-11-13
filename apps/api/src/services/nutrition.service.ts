import {
  getDb,
  mealLogs,
  customFoods,
  profile,
  eq,
  and,
  desc,
  asc,
} from "@lifesync/db";
import type { MealLogInput, CustomFoodInput } from "@lifesync/shared";

export async function listMealLogs(userId: string, date: string) {
  const db = getDb();

  const [meals, userProfile] = await Promise.all([
    db
      .select()
      .from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)))
      .orderBy(asc(mealLogs.loggedAt)),
    db
      .select({ dailyCalorieGoal: profile.dailyCalorieGoal })
      .from(profile)
      .where(eq(profile.userId, userId))
      .limit(1),
  ]);

  const targetCalories = userProfile[0]?.dailyCalorieGoal ?? 2000;

  const totalCalories = meals.reduce(
    (sum, m) => sum + m.calories * m.servings,
    0
  );
  const totalProteins = meals.reduce(
    (sum, m) => sum + m.proteins * m.servings,
    0
  );
  const totalCarbs = meals.reduce(
    (sum, m) => sum + m.carbohydrates * m.servings,
    0
  );
  const totalFat = meals.reduce((sum, m) => sum + m.fat * m.servings, 0);

  return {
    date,
    targetCalories,
    summary: {
      totalCalories: Math.round(totalCalories),
      totalProteins: Math.round(totalProteins * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      remainingCalories: Math.max(0, Math.round(targetCalories - totalCalories)),
    },
    meals,
  };
}

export async function createMealLog(userId: string, input: MealLogInput) {
  const db = getDb();
  const id = input.id || `meal_${crypto.randomUUID()}`;

  const row = {
    id,
    userId,
    date: input.date,
    mealType: input.mealType,
    foodId: input.foodId ?? null,
    foodName: input.foodName,
    brand: input.brand ?? null,
    calories: input.calories,
    proteins: input.proteins ?? 0,
    carbohydrates: input.carbohydrates ?? 0,
    fat: input.fat ?? 0,
    servingSize: input.servingSize ?? "1 porsi",
    servings: input.servings ?? 1,
    imageUrl: input.imageUrl ?? null,
    source: input.source ?? "manual",
    loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
    updatedAt: new Date(),
  };

  const [inserted] = await db.insert(mealLogs).values(row).returning();
  return inserted;
}

export async function deleteMealLogById(userId: string, mealId: string) {
  const db = getDb();
  const deleted = await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.id, mealId)))
    .returning();
  return deleted.length > 0;
}

export async function listCustomFoods(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(customFoods)
    .where(eq(customFoods.userId, userId))
    .orderBy(desc(customFoods.createdAt));
}

export async function createCustomFood(userId: string, input: CustomFoodInput) {
  const db = getDb();
  const id = input.id || `food_${crypto.randomUUID()}`;

  const row = {
    id,
    userId,
    name: input.name,
    brand: input.brand ?? null,
    calories: input.calories,
    proteins: input.proteins ?? 0,
    carbohydrates: input.carbohydrates ?? 0,
    fat: input.fat ?? 0,
    servingSize: input.servingSize ?? "1 porsi",
    imageUrl: input.imageUrl ?? null,
    updatedAt: new Date(),
  };

  const [inserted] = await db.insert(customFoods).values(row).returning();
  return inserted;
}

export async function deleteCustomFoodById(userId: string, foodId: string) {
  const db = getDb();
  const deleted = await db
    .delete(customFoods)
    .where(and(eq(customFoods.userId, userId), eq(customFoods.id, foodId)))
    .returning();
  return deleted.length > 0;
}

export async function updateDailyCalorieGoal(userId: string, goalKcal: number) {
  const db = getDb();
  const [updated] = await db
    .update(profile)
    .set({ dailyCalorieGoal: goalKcal, updatedAt: new Date() })
    .where(eq(profile.userId, userId))
    .returning({ dailyCalorieGoal: profile.dailyCalorieGoal });
  return updated?.dailyCalorieGoal ?? goalKcal;
}

