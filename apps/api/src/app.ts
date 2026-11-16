import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { apiReference } from "@scalar/express-api-reference";
import { env } from "./config/env";
import { auth } from "./config/auth";
import { apiRouter } from "./routes";
import { openApiDocument } from "./docs/openapi";
import { errorHandler } from "./middleware/validate";
import { sendError } from "./utils/response";

export function createApp() {
  const app = express();
  const authHandler = toNodeHandler(auth);

  app.use(
    cors({
      origin: [env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
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

  const rootHandler = (_req: express.Request, res: express.Response) => {
    res.json({
      service: "LifeSync Wellness API",
      status: "online",
      version: "0.2.0",
      documentation: "/api/docs",
      openApiSpec: "/api/openapi.json",
      healthCheck: "/api/health-check",
    });
  };

  app.get("/", rootHandler);
  app.get("/api", rootHandler);

  // OpenAPI JSON Spec & Scalar Interactive API Reference
  app.get(["/openapi.json", "/api/openapi.json"], (_req, res) => {
    res.json(openApiDocument);
  });

  const scalarHandler = apiReference({
    content: openApiDocument,
    theme: "kepler",
    pageTitle: "LifeSync Wellness API Reference",
    metaData: {
      title: "LifeSync Wellness API — Scalar Reference",
    },
  });

  app.use(["/docs", "/api/docs"], scalarHandler);

  app.use("/api", apiRouter);

  app.use((_req, res) => {
    sendError(res, 404, "NOT_FOUND", "The requested endpoint does not exist");
  });

  app.use(errorHandler);

  return app;
}
