import { describe, expect, test } from "bun:test";
import {
  mealLogSchema,
  customFoodSchema,
  updateProfileSchema,
  aiMealScanSchema,
} from "@lifesync/shared";
import { env } from "../config/env";
import { scanMealWithAi, AiScannerError } from "../services/nutrition.service";
import { scanMealWithAiController } from "../controllers/nutrition.controller";

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

  test("validates aiMealScanSchema with notes or imageBase64", () => {
    const withNotes = aiMealScanSchema.safeParse({
      notes: "Nasi goreng telur ceplok",
    });
    expect(withNotes.success).toBe(true);

    const withImage = aiMealScanSchema.safeParse({
      imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
      mimeType: "image/png",
    });
    expect(withImage.success).toBe(true);

    const empty = aiMealScanSchema.safeParse({});
    expect(empty.success).toBe(false);
  });

  test("scanMealWithAi throws 503 when N8N_WEBHOOK_URL is not configured", async () => {
    const originalUrl = env.N8N_WEBHOOK_URL;
    env.N8N_WEBHOOK_URL = "";
    try {
      await expect(
        scanMealWithAi({ notes: "Ayam bakar", mimeType: "image/jpeg" })
      ).rejects.toBeInstanceOf(AiScannerError);
    } finally {
      env.N8N_WEBHOOK_URL = originalUrl;
    }
  });

  test("scanMealWithAi parses n8n structured JSON response", async () => {
    const originalUrl = env.N8N_WEBHOOK_URL;
    const originalFetch = globalThis.fetch;
    env.N8N_WEBHOOK_URL = "https://example.n8n.local/webhook/lifesync-scan-meal";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            foodName: "Nasi Ayam Bakar",
            calories: 520.4,
            proteins: 35.12,
            carbohydrates: 58.3,
            fat: 14.2,
            servingSize: "1 porsi",
            servings: 1,
            confidence: "high",
            breakdown: [
              {
                item: "Nasi Putih",
                portion: "150g",
                calories: 195,
                proteins: 4,
                carbohydrates: 43,
                fat: 0.5,
              },
            ],
            notes: "Protein tinggi, seimbang",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as unknown as typeof fetch;

    try {
      const result = await scanMealWithAi({
        notes: "Nasi ayam bakar",
        mimeType: "image/jpeg",
      });
      expect(result.foodName).toBe("Nasi Ayam Bakar");
      expect(result.calories).toBe(520);
      expect(result.proteins).toBe(35.1);
      expect(result.confidence).toBe("high");
      expect(result.breakdown.length).toBe(1);
    } finally {
      env.N8N_WEBHOOK_URL = originalUrl;
      globalThis.fetch = originalFetch;
    }
  });

  test("scanMealWithAiController rejects non-ADMIN users with 403 FORBIDDEN", async () => {
    let capturedStatus = 0;
    let capturedBody: Record<string, unknown> = {};

    const req = {
      user: {
        id: "user_1",
        name: "Regular User",
        email: "user@example.com",
        emailVerified: true,
        role: "USER",
      },
      body: { notes: "Nasi uduk" },
    } as unknown as Parameters<typeof scanMealWithAiController>[0];

    const res = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        capturedBody = payload;
        return this;
      },
    } as unknown as Parameters<typeof scanMealWithAiController>[1];

    await scanMealWithAiController(req, res, () => {});
    expect(capturedStatus).toBe(403);
    expect(capturedBody.success).toBe(false);
  });
});

