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
import type {
  MealLogInput,
  CustomFoodInput,
  AiMealScanInput,
} from "@lifesync/shared";
import { env } from "../config/env";

export class AiScannerError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AiScannerError";
  }
}

export interface AiMealBreakdownItem {
  item: string;
  portion: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fat: number;
}

export interface AiMealScanResult {
  foodName: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fat: number;
  servingSize: string;
  servings: number;
  confidence: "high" | "medium" | "low";
  breakdown: AiMealBreakdownItem[];
  notes?: string;
}

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

/**
 * Forward meal photo and/or text notes to the n8n AI Calorie Scanner webhook
 * and normalize the structured nutrition response for LifeSync clients.
 */
export async function scanMealWithAi(
  input: AiMealScanInput
): Promise<AiMealScanResult> {
  const webhookUrl = env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new AiScannerError(
      503,
      "AI_SCANNER_NOT_CONFIGURED",
      "Layanan AI Calorie Scanner belum dikonfigurasi (N8N_WEBHOOK_URL kosong)"
    );
  }

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "1",
      },
      body: JSON.stringify({
        imageBase64: input.imageBase64 ?? "",
        mimeType: input.mimeType ?? "image/jpeg",
        notes: input.notes ?? "",
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new AiScannerError(
      503,
      "AI_SCANNER_UNAVAILABLE",
      isTimeout
        ? "Server AI n8n timeout saat menganalisis makanan. Silakan coba lagi."
        : "Tidak dapat terhubung ke server AI n8n. Pastikan n8n & tunnel sedang aktif."
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AiScannerError(
      502,
      "AI_SCANNER_UPSTREAM_ERROR",
      `Server AI n8n mengembalikan status ${response.status}${errorText ? `: ${errorText.slice(0, 200)}` : ""}`
    );
  }

  const rawBody = (await response.json()) as Record<string, unknown>;
  if (rawBody.success === false) {
    throw new AiScannerError(
      502,
      "AI_ANALYSIS_FAILED",
      typeof rawBody.error === "string"
        ? rawBody.error
        : "AI gagal menganalisis gambar/deskripsi makanan"
    );
  }

  const payload =
    rawBody.data && typeof rawBody.data === "object"
      ? (rawBody.data as Record<string, unknown>)
      : rawBody;

  const toNum = (val: unknown, fallback = 0) => {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const rawBreakdown = Array.isArray(payload.breakdown) ? payload.breakdown : [];
  const breakdown: AiMealBreakdownItem[] = rawBreakdown.map((item) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    return {
      item: typeof obj.item === "string" ? obj.item : "Item makanan",
      portion: typeof obj.portion === "string" ? obj.portion : "1 porsi",
      calories: Math.round(toNum(obj.calories)),
      proteins: Math.round(toNum(obj.proteins) * 10) / 10,
      carbohydrates: Math.round(toNum(obj.carbohydrates) * 10) / 10,
      fat: Math.round(toNum(obj.fat) * 10) / 10,
    };
  });

  const confidenceVal = payload.confidence;
  const confidence: "high" | "medium" | "low" =
    confidenceVal === "high" ||
    confidenceVal === "medium" ||
    confidenceVal === "low"
      ? confidenceVal
      : "medium";

  return {
    foodName:
      typeof payload.foodName === "string" && payload.foodName.trim().length > 0
        ? payload.foodName.trim()
        : "Makanan Terdeteksi AI",
    calories: Math.round(toNum(payload.calories)),
    proteins: Math.round(toNum(payload.proteins) * 10) / 10,
    carbohydrates: Math.round(toNum(payload.carbohydrates) * 10) / 10,
    fat: Math.round(toNum(payload.fat) * 10) / 10,
    servingSize:
      typeof payload.servingSize === "string" && payload.servingSize.trim()
        ? payload.servingSize.trim()
        : "1 porsi",
    servings: Math.max(0.1, toNum(payload.servings, 1)),
    confidence,
    breakdown,
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
  };
}

