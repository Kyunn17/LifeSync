import { Router } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";
import { getDb, user, eq } from "@lifesync/db";
import {
  getVerificationAttempt,
  verifyOtpCode,
  sendVerificationEmail,
} from "../services/email.service";
import { env } from "../config/env";
import { userRouter } from "./user.routes";
import { activityRouter } from "./activity.routes";
import { scheduleRouter } from "./schedule.routes";
import {
  healthRouter,
  checkinRouter,
  waterRouter,
  tipsRouter,
} from "./wellness.routes";
import { analyticsRouter } from "./analytics.routes";
import { adminRouter } from "./admin.routes";
import { nutritionRouter } from "./nutrition.routes";

export const apiRouter = Router();

apiRouter.get("/health-check", (_req, res) => {
  sendSuccess(res, {
    service: "LifeSync Wellness API",
    status: "healthy",
    timestamp: new Date().toISOString(),
    defaultCategoriesCount: DEFAULT_ACTIVITY_CATEGORIES.length,
    emailConfigured: Boolean(env.BREVO_API_KEY),
    requireEmailVerification: env.REQUIRE_EMAIL_VERIFICATION,
  });
});

apiRouter.get("/verification-status", (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!email) {
    sendError(res, 400, "BAD_REQUEST", "Email query parameter is required");
    return;
  }
  const attempt = getVerificationAttempt(email);
  sendSuccess(res, {
    attempt,
  });
});

// Verifikasi kode 5 digit dari form web
apiRouter.post("/verify-code", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!email || !code) {
      sendError(res, 400, "BAD_REQUEST", "Email dan kode 5 digit wajib diisi.");
      return;
    }

    const result = await verifyOtpCode({ email, code });

    if (!result.success) {
      sendError(res, 400, "INVALID_CODE", result.error || "Kode tidak valid.");
      return;
    }

    sendSuccess(res, {
      verified: true,
      message: "Email berhasil diverifikasi! Akun Anda aktif sepenuhnya.",
    });
  } catch (err) {
    next(err);
  }
});

// Kirim ulang kode 5 digit baru ke email
apiRouter.post("/resend-code", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email) {
      sendError(res, 400, "BAD_REQUEST", "Email wajib diisi.");
      return;
    }

    const callbackURL = `${env.FRONTEND_URL}/dashboard?verified=true`;
    const verifyUrl = `${env.BETTER_AUTH_URL}/api/auth/verify-email?callbackURL=${encodeURIComponent(callbackURL)}`;

    const sent = await sendVerificationEmail({
      email,
      url: verifyUrl,
    });

    if (!sent) {
      sendError(res, 500, "SEND_FAILED", "Gagal mengirimkan kode ke email.");
      return;
    }

    sendSuccess(res, {
      sent: true,
      message: "Kode verifikasi 5 digit baru telah dikirim ke Gmail Anda!",
    });
  } catch (err) {
    next(err);
  }
});

// Bypass langsung (opsional)
apiRouter.post("/verify-direct", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    if (!email) {
      sendError(res, 400, "BAD_REQUEST", "Email is required");
      return;
    }

    const db = getDb();
    const updated = await db
      .update(user)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(user.email, email))
      .returning({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      });

    if (!updated.length) {
      sendError(res, 404, "NOT_FOUND", "User with that email was not found");
      return;
    }

    sendSuccess(res, {
      verified: true,
      user: updated[0],
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.use("/users", userRouter);
apiRouter.use("/activities", activityRouter);
apiRouter.use("/schedules", scheduleRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/checkins", checkinRouter);
apiRouter.use("/water", waterRouter);
apiRouter.use("/tips", tipsRouter);
apiRouter.use("/nutrition", nutritionRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/admin", adminRouter);
