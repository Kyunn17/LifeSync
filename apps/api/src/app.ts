import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/validate";
import { sendError } from "./utils/response";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: [env.FRONTEND_URL],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "The requested endpoint does not exist");
  });

  app.use(errorHandler);

  return app;
}

