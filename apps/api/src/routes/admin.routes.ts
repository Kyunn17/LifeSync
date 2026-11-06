import { Router } from "express";
import {
  adminUpdateUserSchema,
  activityCategorySchema,
  wellnessTipSchema,
  updateWellnessTipSchema,
} from "@lifesync/shared";
import { requireAuth, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getAdminStatsController,
  getAdminUsersController,
  patchAdminUserController,
  getAdminCategoriesController,
  createAdminCategoryController,
  patchAdminCategoryController,
  deleteAdminCategoryController,
  getAdminTipsController,
  createAdminTipController,
  patchAdminTipController,
  deleteAdminTipController,
} from "../controllers/admin.controller";

export const adminRouter = Router();

// Strict backend RBAC: every /api/admin/* endpoint requires ADMIN role
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/stats", getAdminStatsController);

adminRouter.get("/users", getAdminUsersController);
adminRouter.patch(
  "/users/:id",
  validateBody(adminUpdateUserSchema),
  patchAdminUserController
);

adminRouter.get("/categories", getAdminCategoriesController);
adminRouter.post(
  "/categories",
  validateBody(activityCategorySchema),
  createAdminCategoryController
);
adminRouter.patch(
  "/categories/:id",
  validateBody(activityCategorySchema.partial()),
  patchAdminCategoryController
);
adminRouter.delete("/categories/:id", deleteAdminCategoryController);

adminRouter.get("/tips", getAdminTipsController);
adminRouter.post(
  "/tips",
  validateBody(wellnessTipSchema),
  createAdminTipController
);
adminRouter.patch(
  "/tips/:id",
  validateBody(updateWellnessTipSchema),
  patchAdminTipController
);
adminRouter.delete("/tips/:id", deleteAdminTipController);

