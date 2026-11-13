import { Router } from "express";
import { mealLogSchema, customFoodSchema } from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getMealLogsController,
  createMealLogController,
  deleteMealLogController,
  getCustomFoodsController,
  createCustomFoodController,
  deleteCustomFoodController,
  updateCalorieGoalController,
} from "../controllers/nutrition.controller";

export const nutritionRouter = Router();

nutritionRouter.use(requireAuth);

// Meals
nutritionRouter.get("/meals", getMealLogsController);
nutritionRouter.post("/meals", validateBody(mealLogSchema), createMealLogController);
nutritionRouter.delete("/meals/:id", deleteMealLogController);

// Custom Foods
nutritionRouter.get("/custom-foods", getCustomFoodsController);
nutritionRouter.post("/custom-foods", validateBody(customFoodSchema), createCustomFoodController);
nutritionRouter.delete("/custom-foods/:id", deleteCustomFoodController);

// Goal
nutritionRouter.put("/goal", updateCalorieGoalController);

