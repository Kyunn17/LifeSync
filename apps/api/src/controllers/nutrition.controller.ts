import type { Request, Response, NextFunction } from "express";
import {
  listMealLogs,
  createMealLog,
  deleteMealLogById,
  listCustomFoods,
  createCustomFood,
  deleteCustomFoodById,
  updateDailyCalorieGoal,
} from "../services/nutrition.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getMealLogsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const date =
      typeof req.query.date === "string" ? req.query.date : todayStr;

    const data = await listMealLogs(req.user.id, date);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createMealLogController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const record = await createMealLog(req.user.id, req.body);
    sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
}

export async function deleteMealLogController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const rawId = req.params.id;
    const mealId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!mealId) {
      sendError(res, 400, "BAD_REQUEST", "Meal ID is required");
      return;
    }

    const success = await deleteMealLogById(req.user.id, mealId);
    if (!success) {
      sendError(res, 404, "NOT_FOUND", "Catatan makanan tidak ditemukan");
      return;
    }

    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function getCustomFoodsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const foods = await listCustomFoods(req.user.id);
    sendSuccess(res, foods);
  } catch (err) {
    next(err);
  }
}

export async function createCustomFoodController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const record = await createCustomFood(req.user.id, req.body);
    sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomFoodController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const rawId = req.params.id;
    const foodId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!foodId) {
      sendError(res, 400, "BAD_REQUEST", "Food ID is required");
      return;
    }

    const success = await deleteCustomFoodById(req.user.id, foodId);
    if (!success) {
      sendError(res, 404, "NOT_FOUND", "Makanan kustom tidak ditemukan");
      return;
    }

    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function updateCalorieGoalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const goal = Number(req.body.goal);
    if (!goal || goal < 500 || goal > 10000) {
      sendError(res, 400, "BAD_REQUEST", "Target kalori harus antara 500 dan 10000 kkal");
      return;
    }

    const newGoal = await updateDailyCalorieGoal(req.user.id, goal);
    sendSuccess(res, { dailyCalorieGoal: newGoal });
  } catch (err) {
    next(err);
  }
}
