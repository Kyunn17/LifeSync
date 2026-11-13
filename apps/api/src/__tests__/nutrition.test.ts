import { describe, expect, test } from "bun:test";
import {
  mealLogSchema,
  customFoodSchema,
  updateProfileSchema,
} from "@lifesync/shared";

describe("Nutrition & Calorie Schema Tests", () => {
  test("validates valid meal log input", () => {
    const validMeal = {
      date: "2026-11-13",
      mealType: "lunch",
      foodName: "Nasi Padang Ayam Bakar",
      brand: "RM Sederhana",
      calories: 650,
      proteins: 32,
      carbohydrates: 70,
      fat: 25,
      servingSize: "1 porsi",
      servings: 1.5,
      source: "manual",
    };

    const parsed = mealLogSchema.safeParse(validMeal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mealType).toBe("lunch");
      expect(parsed.data.servings).toBe(1.5);
      expect(parsed.data.calories).toBe(650);
    }
  });

  test("rejects invalid meal type and negative calories", () => {
    const invalidMeal = {
      date: "2026-11-13",
      mealType: "midnight_feast", // invalid enum
      foodName: "Snack",
      calories: -100, // invalid negative
    };

    const parsed = mealLogSchema.safeParse(invalidMeal);
    expect(parsed.success).toBe(false);
  });

  test("validates custom food schema", () => {
    const validCustom = {
      name: "Smoothie Pisang Protein",
      brand: "Homemade",
      calories: 280,
      proteins: 24,
      carbohydrates: 38,
      fat: 4,
      servingSize: "1 gelas (300ml)",
    };

    const parsed = customFoodSchema.safeParse(validCustom);
    expect(parsed.success).toBe(true);
  });

  test("validates dailyCalorieGoal in updateProfileSchema", () => {
    const profileWithGoal = {
      dailyCalorieGoal: 2200,
      dailyWaterGoalMl: 2500,
    };

    const parsed = updateProfileSchema.safeParse(profileWithGoal);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.dailyCalorieGoal).toBe(2200);
    }
  });

  test("rejects dailyCalorieGoal below 500 or above 10000", () => {
    const parsedLow = updateProfileSchema.safeParse({ dailyCalorieGoal: 200 });
    expect(parsedLow.success).toBe(false);

    const parsedHigh = updateProfileSchema.safeParse({ dailyCalorieGoal: 20000 });
    expect(parsedHigh.success).toBe(false);
  });
});

