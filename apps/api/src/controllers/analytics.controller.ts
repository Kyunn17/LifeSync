import type { Request, Response, NextFunction } from "express";
import {
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
} from "../services/analytics.service";
import { sendSuccess, sendError } from "../utils/response";

function resolveDateQuery(rawDate: unknown): string {
  if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return rawDate;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const dateStr = resolveDateQuery(req.query.date);
    const data = await getDailyAnalytics(req.user.id, dateStr);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const dateStr = resolveDateQuery(req.query.date);
    const data = await getWeeklyAnalytics(req.user.id, dateStr);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const dateStr = resolveDateQuery(req.query.date);
    const data = await getMonthlyAnalytics(req.user.id, dateStr);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
