import type { Request, Response, NextFunction } from "express";
import {
  getPlatformStats,
  listAllUsersForAdmin,
  updateUserByAdmin,
  listSystemAndAllCategoriesForAdmin,
  createSystemCategoryByAdmin,
  updateCategoryByAdmin,
  deleteCategoryByAdmin,
  listAllTipsForAdmin,
  createWellnessTipByAdmin,
  updateWellnessTipByAdmin,
  deleteWellnessTipByAdmin,
} from "../services/admin.service";
import { sendSuccess, sendError } from "../utils/response";

export async function getAdminStatsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getPlatformStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function getAdminUsersController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [stats, users] = await Promise.all([
      getPlatformStats(),
      listAllUsersForAdmin(),
    ]);
    sendSuccess(res, { stats, users });
  } catch (err) {
    next(err);
  }
}

export async function patchAdminUserController(
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
    const targetUserId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!targetUserId) {
      sendError(res, 400, "BAD_REQUEST", "User ID is required");
      return;
    }

    const result = await updateUserByAdmin(
      targetUserId,
      req.user.id,
      req.body
    );

    if (result.error) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", result.message);
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

export async function getAdminCategoriesController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await listSystemAndAllCategoriesForAdmin();
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function createAdminCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const created = await createSystemCategoryByAdmin(req.user.id, req.body);
    sendSuccess(res, created, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchAdminCategoryController(
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

    const result = await updateCategoryByAdmin(
      categoryId,
      req.user.id,
      req.body
    );

    if (result.error) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Category not found");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "Cannot modify this category");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminCategoryController(
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

    const result = await deleteCategoryByAdmin(categoryId, req.user.id);

    if (result.error) {
      if (result.error === "NOT_FOUND") {
        sendError(res, 404, "NOT_FOUND", "Category not found");
        return;
      }
      sendError(res, 403, "FORBIDDEN", "Cannot delete this category");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function getAdminTipsController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tips = await listAllTipsForAdmin();
    sendSuccess(res, tips);
  } catch (err) {
    next(err);
  }
}

export async function createAdminTipController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const created = await createWellnessTipByAdmin(req.user.id, req.body);
    sendSuccess(res, created, 201);
  } catch (err) {
    next(err);
  }
}

export async function patchAdminTipController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawId = req.params.id;
    const tipId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!tipId) {
      sendError(res, 400, "BAD_REQUEST", "Tip ID is required");
      return;
    }

    const result = await updateWellnessTipByAdmin(tipId, req.body);
    if (result.error) {
      sendError(res, 404, "NOT_FOUND", "Wellness tip not found");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminTipController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawId = req.params.id;
    const tipId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!tipId) {
      sendError(res, 400, "BAD_REQUEST", "Tip ID is required");
      return;
    }

    const result = await deleteWellnessTipByAdmin(tipId);
    if (result.error) {
      sendError(res, 404, "NOT_FOUND", "Wellness tip not found");
      return;
    }

    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

