import type { Request, Response, NextFunction } from "express";
import {
  listHealthLogs,
  upsertHealthLog,
  updateHealthLogById,
  deleteHealthLogById,
  listCheckins,
  createDailyCheckin,
  getWaterSummaryForDate,
  addWaterIntake,
  listActiveWellnessTips,
} from "../services/wellness.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getHealthLogsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;
    const from =
      typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 30;

    const logs = await listHealthLogs(req.user.id, { date, from, to, limit });
    sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
}

export async function createHealthLogController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const record = await upsertHealthLog(req.user.id, req.body);
    sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateHealthLogController(
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
    const logId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!logId) {
      sendError(res, 400, "BAD_REQUEST", "Health log ID is required");
      return;
    }

    const result = await updateHealthLogById(logId, req.user.id, req.body);
    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Health log not found");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "Unauthorized access to health log");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteHealthLogController(
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
    const logId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!logId) {
      sendError(res, 400, "BAD_REQUEST", "Health log ID is required");
      return;
    }

    const result = await deleteHealthLogById(logId, req.user.id);
    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Health log not found");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "Unauthorized access to health log");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function getCheckinsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;
    const checkins = await listCheckins(req.user.id, date);
    sendSuccess(res, checkins);
  } catch (err) {
    next(err);
  }
}

export async function createCheckinController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const checkin = await createDailyCheckin(req.user.id, req.body);
    sendSuccess(res, checkin, 201);
  } catch (err) {
    next(err);
  }
}

export async function getWaterController(
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

    const summary = await getWaterSummaryForDate(req.user.id, dateStr);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
}

export async function addWaterController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const summary = await addWaterIntake(req.user.id, req.body);
    sendSuccess(res, summary, 201);
  } catch (err) {
    next(err);
  }
}

export async function getTipsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tips = await listActiveWellnessTips();
    sendSuccess(res, tips);
  } catch (err) {
    next(err);
  }
}
