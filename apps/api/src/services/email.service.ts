import { Resend } from "resend";
import { env } from "../config/env";

export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface VerificationAttempt {
  email: string;
  sent: boolean;
  error: string | null;
  verificationUrl: string;
  updatedAt: string;
}

const verificationAttempts = new Map<string, VerificationAttempt>();

export function getVerificationAttempt(
  email: string
): VerificationAttempt | null {
  return verificationAttempts.get(email.trim().toLowerCase()) ?? null;
}

export async function sendVerificationEmail({
  email,
  name,
  url,
}: {
  email: string;
  name?: string;
  url: string;
}): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!resend) {
    console.warn(
      `[EmailService] RESEND_API_KEY is not configured. Verification URL for ${email}: ${url}`
    );
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      error: "RESEND_API_KEY belum dikonfigurasi pada server.",
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return false;
  }

  try {
    const displayName = name || email.split("@")[0] || "User";
    const fromAddress =
      env.EMAIL_FROM || "LifeSync Wellness <onboarding@resend.dev>";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your LifeSync account</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf8; margin: 0; padding: 24px; color: #1e2924; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(13, 122, 83, 0.06); border: 1px solid #e2ebe6; }
    .header { background: linear-gradient(135deg, #0d7a53 0%, #159367 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0f382a; }
    .text { font-size: 15px; line-height: 1.6; color: #3b4d45; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0d7a53; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(13, 122, 83, 0.25); }
    .fallback { font-size: 13px; color: #6f8078; line-height: 1.5; word-break: break-all; margin-top: 24px; padding-top: 20px; border-top: 1px solid #eef3f0; }
    .footer { background: #f7faf8; padding: 20px 32px; text-align: center; font-size: 12px; color: #8a9c94; border-top: 1px solid #eef3f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LifeSync Wellness</h1>
      <p>Daily Balance &amp; Lifestyle Management</p>
    </div>
    <div class="content">
      <div class="greeting">Hi ${displayName},</div>
      <div class="text">
        Thank you for joining <strong>LifeSync Wellness</strong>. To complete your account registration and ensure you have secure access to your daily schedules and wellness insights, please verify your email address.
      </div>
      <div class="btn-container">
        <a href="${url}" class="btn" target="_blank">Verify Email &amp; Activate Account</a>
      </div>
      <div class="fallback">
        If the button above does not work, copy and paste this link into your web browser:<br>
        <a href="${url}" style="color: #0d7a53;">${url}</a>
      </div>
    </div>
    <div class="footer">
      This verification link will expire in 24 hours.<br>
      If you did not sign up for LifeSync Wellness, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: "Verify your email — LifeSync Wellness",
      html: htmlContent,
    });

    if (error) {
      console.error(
        "[EmailService] Resend failed to send verification email:",
        error
      );
      verificationAttempts.set(normalizedEmail, {
        email: normalizedEmail,
        sent: false,
        error: error.message || "Gagal mengirim email melalui Resend.",
        verificationUrl: url,
        updatedAt: new Date().toISOString(),
      });
      return false;
    }

    console.log(
      `[EmailService] Verification email successfully sent to ${email} (ID: ${data?.id})`
    );
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: true,
      error: null,
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error(
      "[EmailService] Exception while sending verification email:",
      err
    );
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim email.",
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return false;
  }
}

export async function sendPasswordResetEmail({
  email,
  name,
  url,
}: {
  email: string;
  name?: string;
  url: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn(
      `[EmailService] RESEND_API_KEY is not configured. Reset password URL for ${email}: ${url}`
    );
    return false;
  }

  try {
    const displayName = name || email.split("@")[0] || "User";
    const fromAddress =
      env.EMAIL_FROM || "LifeSync Wellness <onboarding@resend.dev>";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your LifeSync password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf8; margin: 0; padding: 24px; color: #1e2924; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(13, 122, 83, 0.06); border: 1px solid #e2ebe6; }
    .header { background: linear-gradient(135deg, #0d7a53 0%, #159367 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0f382a; }
    .text { font-size: 15px; line-height: 1.6; color: #3b4d45; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0d7a53; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(13, 122, 83, 0.25); }
    .fallback { font-size: 13px; color: #6f8078; line-height: 1.5; word-break: break-all; margin-top: 24px; padding-top: 20px; border-top: 1px solid #eef3f0; }
    .footer { background: #f7faf8; padding: 20px 32px; text-align: center; font-size: 12px; color: #8a9c94; border-top: 1px solid #eef3f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LifeSync Wellness</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="content">
      <div class="greeting">Hi ${displayName},</div>
      <div class="text">
        We received a request to reset the password for your LifeSync account. Click the button below to set a new password:
      </div>
      <div class="btn-container">
        <a href="${url}" class="btn" target="_blank">Reset Password</a>
      </div>
      <div class="fallback">
        If you did not request a password reset, you can safely ignore this email. Your account remains secure.
      </div>
    </div>
    <div class="footer">
      This password reset link will expire in 1 hour.
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: "Reset your password — LifeSync Wellness",
      html: htmlContent,
    });

    if (error) {
      console.error(
        "[EmailService] Resend failed to send reset password email:",
        error
      );
      return false;
    }

    console.log(
      `[EmailService] Password reset email sent to ${email} (ID: ${data?.id})`
    );
    return true;
  } catch (err) {
    console.error(
      "[EmailService] Exception while sending reset password email:",
      err
    );
    return false;
  }
}
