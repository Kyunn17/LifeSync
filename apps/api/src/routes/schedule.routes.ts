import { Router } from "express";
import {
  scheduleBlockSchema,
  updateScheduleBlockSchema,
} from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getSchedulesController,
  createScheduleController,
  updateScheduleController,
  deleteScheduleController,
} from "../controllers/schedule.controller";

export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

scheduleRouter.get("/", getSchedulesController);
scheduleRouter.post(
  "/",
  validateBody(scheduleBlockSchema),
  createScheduleController
);
scheduleRouter.patch(
  "/:id",
  validateBody(updateScheduleBlockSchema),
  updateScheduleController
);
scheduleRouter.put(
  "/:id",
  validateBody(updateScheduleBlockSchema),
  updateScheduleController
);
scheduleRouter.delete("/:id", deleteScheduleController);

