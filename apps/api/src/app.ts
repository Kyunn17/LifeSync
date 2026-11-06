import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env";
import { auth } from "./config/auth";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/validate";
import { sendError } from "./utils/response";

export function createApp() {
  const app = express();
  const authHandler = toNodeHandler(auth);

  app.use(
    cors({
      origin: [env.FRONTEND_URL, "http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
  );

  // Mount Better Auth handler before express.json() middleware
  app.all("/api/auth/*", (req, res) => {
    void authHandler(
      req as unknown as Parameters<typeof authHandler>[0],
      res as unknown as Parameters<typeof authHandler>[1]
    );
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "The requested endpoint does not exist");
  });

  app.use(errorHandler);

  return app;
}
