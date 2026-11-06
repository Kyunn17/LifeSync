import { Router } from "express";
import {
  healthLogSchema,
  dailyCheckinSchema,
  waterLogSchema,
} from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getHealthLogsController,
  createHealthLogController,
  updateHealthLogController,
  deleteHealthLogController,
  getCheckinsController,
  createCheckinController,
  getWaterController,
  addWaterController,
  getTipsController,
} from "../controllers/wellness.controller";

export const healthRouter = Router();
healthRouter.use(requireAuth);
healthRouter.get("/", getHealthLogsController);
healthRouter.post("/", validateBody(healthLogSchema), createHealthLogController);
healthRouter.patch(
  "/:id",
  validateBody(healthLogSchema.partial()),
  updateHealthLogController
);
healthRouter.put(
  "/:id",
  validateBody(healthLogSchema.partial()),
  updateHealthLogController
);
healthRouter.delete("/:id", deleteHealthLogController);

export const checkinRouter = Router();
checkinRouter.use(requireAuth);
checkinRouter.get("/", getCheckinsController);
checkinRouter.post(
  "/",
  validateBody(dailyCheckinSchema),
  createCheckinController
);

export const waterRouter = Router();
waterRouter.use(requireAuth);
waterRouter.get("/", getWaterController);
waterRouter.post("/", validateBody(waterLogSchema), addWaterController);

export const tipsRouter = Router();
tipsRouter.use(requireAuth);
tipsRouter.get("/", getTipsController);

