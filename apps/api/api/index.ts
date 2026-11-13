import type { IncomingMessage, ServerResponse } from "http";

let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { createApp } = await import("../src/app");
      return createApp();
    })();
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
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
          nodeEnv: process.env.NODE_ENV || "(not set)",
        },
      })
    );
  }
}
