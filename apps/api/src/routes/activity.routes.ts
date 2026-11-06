import { Router } from "express";
import { activityCategorySchema } from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  listActivitiesController,
  createActivityController,
  updateActivityController,
  deleteActivityController,
} from "../controllers/activity.controller";

export const activityRouter = Router();

activityRouter.use(requireAuth);

activityRouter.get("/", listActivitiesController);
activityRouter.post(
  "/",
  validateBody(activityCategorySchema),
  createActivityController
);
activityRouter.patch(
  "/:id",
  validateBody(activityCategorySchema.partial()),
  updateActivityController
);
activityRouter.put(
  "/:id",
  validateBody(activityCategorySchema.partial()),
  updateActivityController
);
activityRouter.delete("/:id", deleteActivityController);
