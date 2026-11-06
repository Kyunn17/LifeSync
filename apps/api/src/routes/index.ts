import { Router } from "express";
import { sendSuccess } from "../utils/response";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";
import { userRouter } from "./user.routes";

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
