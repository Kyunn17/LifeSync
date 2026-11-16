import type { Request, Response, NextFunction } from "express";
import {
  getUserWithProfile,
  updateUserProfile,
  deleteUserAccount,
  completeOnboarding,
  recalculateUserGoals,
} from "../services/user.service";
import {
  getWeightEvaluation,
  logUserWeight,
} from "../services/biometrics.service";
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

export async function completeOnboardingController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const updated = await completeOnboarding(req.user.id, req.body);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function recalculateGoalsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const updated = await recalculateUserGoals(req.user.id);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function getWeightHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const data = await getWeightEvaluation(req.user.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function logWeightController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    const result = await logUserWeight(req.user.id, req.body);
    if (result.requiresConfirmation) {
      sendError(
        res,
        409,
        "WEIGHT_ANOMALY_CONFIRMATION_REQUIRED",
        result.message ??
          "Perubahan berat badan >= 10 kg terdeteksi. Mohon konfirmasi dan berikan catatan.",
        result
      );
      return;
    }

    const evaluation = await getWeightEvaluation(req.user.id);
    const userProfile = await getUserWithProfile(req.user.id);
    sendSuccess(res, {
      ...result,
      evaluation: evaluation.evaluation,
      logs: evaluation.logs,
      user: userProfile,
    }, 201);
  } catch (err) {
    next(err);
  }
}

export async function deleteMeController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 401, "UNAUTHORIZED", "Authentication required");
      return;
    }

    await deleteUserAccount(req.user.id);
    sendSuccess(res, { message: "Account deleted successfully." });
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
