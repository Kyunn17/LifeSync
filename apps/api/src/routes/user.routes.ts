import { Router } from "express";
import { updateProfileSchema } from "@lifesync/shared";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  getMeController,
  updateMeController,
  getUserByIdController,
  deleteMeController,
} from "../controllers/user.controller";

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", getMeController);
userRouter.patch("/me", validateBody(updateProfileSchema), updateMeController);
userRouter.put("/me", validateBody(updateProfileSchema), updateMeController);
userRouter.delete("/me", deleteMeController);
userRouter.get("/:id", getUserByIdController);

