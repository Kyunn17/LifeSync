import { Router } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";
import { getDb, user, account, session, eq, and } from "@lifesync/db";
import { auth } from "../config/auth";
import {
  getVerificationAttempt,
  verifyOtpCode,
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
  verifyPasswordResetOtp,
  consumePasswordResetToken,
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
      } as any)
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

// 1. Request OTP 5-digit lupa kata sandi via Brevo
apiRouter.post("/forgot-password/request", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendError(res, 400, "BAD_REQUEST", "Format email tidak valid.");
      return;
    }

    const db = getDb();
    const foundUsers = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    const foundUser = foundUsers[0];
    if (!foundUser) {
      sendError(res, 404, "USER_NOT_FOUND", "Email tidak terdaftar di LifeSync.");
      return;
    }

    const credentialAccounts = await db
      .select()
      .from(account)
      .where(
        and(eq(account.userId, foundUser.id), eq(account.providerId, "credential"))
      )
      .limit(1);

    if (!credentialAccounts.length) {
      sendError(
        res,
        400,
        "NO_PASSWORD_ACCOUNT",
        "Akun ini tidak menggunakan login kata sandi."
      );
      return;
    }

    const result = await sendPasswordResetOtpEmail({
      email,
      name: foundUser.name,
    });

    if (!result.ok) {
      sendError(
        res,
        500,
        "SEND_FAILED",
        result.error || "Gagal mengirim kode OTP ke email."
      );
      return;
    }

    sendSuccess(res, {
      sent: true,
      message: "Kode OTP 5 digit telah dikirim ke email Anda.",
    });
  } catch (err) {
    next(err);
  }
});

// 2. Verifikasi OTP 5-digit lupa kata sandi dan terbitkan resetToken sementara
apiRouter.post("/forgot-password/verify-otp", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const code =
      typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!email || !code) {
      sendError(
        res,
        400,
        "BAD_REQUEST",
        "Email dan kode OTP 5 digit wajib diisi."
      );
      return;
    }

    const result = await verifyPasswordResetOtp({ email, code });
    if (!result.success || !result.resetToken) {
      sendError(
        res,
        400,
        "INVALID_CODE",
        result.error || "Kode OTP tidak valid."
      );
      return;
    }

    sendSuccess(res, {
      verified: true,
      resetToken: result.resetToken,
      message: "Kode OTP valid. Silakan buat kata sandi baru.",
    });
  } catch (err) {
    next(err);
  }
});

// 3. Simpan kata sandi baru memakai hasher Better Auth & hapus sesi lama
apiRouter.post("/forgot-password/reset", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const resetToken =
      typeof req.body?.resetToken === "string" ? req.body.resetToken.trim() : "";
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (!email || !resetToken || !newPassword) {
      sendError(
        res,
        400,
        "BAD_REQUEST",
        "Email, token reset, dan kata sandi baru wajib diisi."
      );
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      sendError(
        res,
        400,
        "INVALID_PASSWORD",
        "Kata sandi baru harus antara 8 hingga 128 karakter."
      );
      return;
    }

    const db = getDb();
    const foundUsers = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    const foundUser = foundUsers[0];
    if (!foundUser) {
      sendError(res, 404, "USER_NOT_FOUND", "Akun tidak ditemukan.");
      return;
    }

    const tokenCheck = await consumePasswordResetToken({ email, resetToken });
    if (!tokenCheck.valid) {
      sendError(
        res,
        400,
        "INVALID_RESET_TOKEN",
        tokenCheck.error || "Token reset tidak valid."
      );
      return;
    }

    const authCtx = await auth.$context;
    const hashedPassword = await authCtx.password.hash(newPassword);

    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(account.userId, foundUser.id), eq(account.providerId, "credential"))
      );

    await db.delete(session).where(eq(session.userId, foundUser.id));

    sendSuccess(res, {
      reset: true,
      message:
        "Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.",
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
