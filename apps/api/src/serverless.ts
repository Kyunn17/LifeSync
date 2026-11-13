import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "./app";

let app: any;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!app) {
      app = createApp();
    }
    return app(req, res);
  } catch (error: any) {
    console.error("[Vercel Serverless Error]:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "SERVER_INITIALIZATION_FAILED",
        message: error?.message || String(error),
        envCheck: {
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          hasBetterAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
          betterAuthUrl: process.env.BETTER_AUTH_URL || "(not set)",
        },
      })
    );
  }
}

