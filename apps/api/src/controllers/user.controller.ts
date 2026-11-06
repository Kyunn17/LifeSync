import type { Request, Response, NextFunction } from "express";
import { getUserWithProfile, updateUserProfile } from "../services/user.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getMeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const data = await getUserWithProfile(req.user.id);
    if (!data) {
      sendError(res, 404, "USER_NOT_FOUND", "User account not found");
      return;
    }

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateMeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const updated = await updateUserProfile(req.user.id, req.body);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function getUserByIdController(
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
    const targetId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!targetId) {
      sendError(res, 400, "BAD_REQUEST", "User ID is required");
      return;
    }

    // Strict ownership & RBAC enforcement: users can only inspect their own record unless ADMIN
    if (req.user.id !== targetId && req.user.role !== "ADMIN") {
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You are not authorized to access another user's profile"
      );
      return;
    }

    const data = await getUserWithProfile(targetId);
    if (!data) {
      sendError(res, 404, "USER_NOT_FOUND", "User not found");
      return;
    }

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
