import type { Request, Response, NextFunction } from "express";
import {
  getDailyScheduleSummary,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
} from "../services/schedule.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getSchedulesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const rawDate = req.query.date;
    const dateStr =
      typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : new Date().toISOString().slice(0, 10);

    const summary = await getDailyScheduleSummary(req.user.id, dateStr);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function createScheduleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const result = await createScheduleBlock(req.user.id, req.body);

    if (result.error) {
      if (result.error === "SCHEDULE_OVERLAP") {
        sendError(
          res,
          409,
          "SCHEDULE_OVERLAP",
          result.message,
          result.details
        );
        return;
      }
      sendError(res, 400, result.error, result.message);
      return;
    }

    sendSuccess(res, result.data, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateScheduleController(
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
    const scheduleId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!scheduleId) {
      sendError(res, 400, "BAD_REQUEST", "Schedule ID is required");
      return;
    }

    const result = await updateScheduleBlock(
      scheduleId,
      req.user.id,
      req.body
    );

    if (result.error) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", result.message);
        return;
      }
      if (result.error === "FORBIDDEN") {
        sendError(res, 403, "FORBIDDEN", result.message);
        return;
      }
      if (result.error === "SCHEDULE_OVERLAP") {
        sendError(
          res,
          409,
          "SCHEDULE_OVERLAP",
          result.message,
          result.details
        );
        return;
      }
      sendError(res, 400, result.error, result.message);
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteScheduleController(
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
    const scheduleId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!scheduleId) {
      sendError(res, 400, "BAD_REQUEST", "Schedule ID is required");
      return;
    }

    const result = await deleteScheduleBlock(scheduleId, req.user.id);

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Schedule block not found");
        return;
      }
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to delete this schedule block"
      );
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}
