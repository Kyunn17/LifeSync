import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";
import { sendError } from "../utils/response";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Request validation failed",
        result.error.flatten()
      );
      return;
    }
    req.body = result.data;
    next();
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    sendError(res, 400, "VALIDATION_ERROR", "Invalid request data", err.flatten());
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[API Error]:", err);
  sendError(res, 500, "INTERNAL_SERVER_ERROR", message);
}

