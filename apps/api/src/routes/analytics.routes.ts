import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getDailyAnalyticsController,
  getWeeklyAnalyticsController,
  getMonthlyAnalyticsController,
} from "../controllers/analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/daily", getDailyAnalyticsController);
analyticsRouter.get("/weekly", getWeeklyAnalyticsController);
analyticsRouter.get("/monthly", getMonthlyAnalyticsController);

