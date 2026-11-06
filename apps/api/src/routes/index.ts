import { Router } from "express";
import { sendSuccess } from "../utils/response";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";
import { userRouter } from "./user.routes";
import { activityRouter } from "./activity.routes";
import { scheduleRouter } from "./schedule.routes";
import {
  healthRouter,
  checkinRouter,
  waterRouter,
  tipsRouter,
} from "./wellness.routes";

export const apiRouter = Router();

apiRouter.get("/health-check", (_req, res) => {
  sendSuccess(res, {
    service: "LifeSync Wellness API",
    status: "healthy",
    timestamp: new Date().toISOString(),
    defaultCategoriesCount: DEFAULT_ACTIVITY_CATEGORIES.length,
  });
});

apiRouter.use("/users", userRouter);
apiRouter.use("/activities", activityRouter);
apiRouter.use("/schedules", scheduleRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/checkins", checkinRouter);
apiRouter.use("/water", waterRouter);
apiRouter.use("/tips", tipsRouter);
