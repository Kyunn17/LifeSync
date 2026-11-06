import type { Request, Response, NextFunction } from "express";
import {
  listCategoriesForUser,
  createCustomCategory,
  updateCategory,
  deleteCategory,
} from "../services/activity.service";
import { sendSuccess, sendError } from "../utils/response";

export async function listActivitiesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const categories = await listCategoriesForUser(req.user.id);
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function createActivityController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const created = await createCustomCategory(req.user.id, req.body, false);
    sendSuccess(res, created, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateActivityController(
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
    const categoryId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!categoryId) {
      sendError(res, 400, "BAD_REQUEST", "Category ID is required");
      return;
    }

    const result = await updateCategory(
      categoryId,
      req.user.id,
      req.user.role,
      req.body
    );

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Category not found");
        return;
      }
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to modify this category"
      );
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteActivityController(
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
    const categoryId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!categoryId) {
      sendError(res, 400, "BAD_REQUEST", "Category ID is required");
      return;
    }

    const result = await deleteCategory(
      categoryId,
      req.user.id,
      req.user.role
    );

    if ("error" in result) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Category not found");
        return;
      }
      sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission to delete this category"
      );
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}
