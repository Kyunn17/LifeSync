import { Router } from "express";
import {
  onboardingProfileSchema,
  updateProfileSchema,
  weightLogSchema,
} from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getMeController,
  updateMeController,
  getUserByIdController,
  deleteMeController,
  completeOnboardingController,
  recalculateGoalsController,
  getWeightHistoryController,
  logWeightController,
} from "../controllers/user.controller";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", getMeController);
userRouter.patch("/me", validateBody(updateProfileSchema), updateMeController);
userRouter.put("/me", validateBody(updateProfileSchema), updateMeController);
userRouter.delete("/me", deleteMeController);
userRouter.post(
  "/me/onboarding",
  validateBody(onboardingProfileSchema),
  completeOnboardingController
);
userRouter.post("/me/recalculate-goals", recalculateGoalsController);
userRouter.get("/me/weight", getWeightHistoryController);
userRouter.post(
  "/me/weight",
  validateBody(weightLogSchema),
  logWeightController
);
userRouter.get("/:id", getUserByIdController);

