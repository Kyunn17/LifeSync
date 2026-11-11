import nodemailer from "nodemailer";
import { env } from "../config/env";

export const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    : null;

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

  if (!transporter) {
    console.warn(
      `[EmailService] SMTP is not configured. Set MAIL_USERNAME and MAIL_PASSWORD. Verification URL for ${email}: ${url}`
    );
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      error: "SMTP belum dikonfigurasi (MAIL_USERNAME / MAIL_PASSWORD kosong).",
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return false;
  }

  try {
    const displayName = name || email.split("@")[0] || "User";
    const senderName = env.MAIL_FROM_NAME || "LifeSync Wellness";
    const senderEmail = env.MAIL_FROM_ADDRESS || env.SMTP_USER;
    const fromAddress = `"${senderName}" <${senderEmail}>`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Akun LifeSync</title>
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
      <div class="greeting">Halo ${displayName},</div>
      <div class="text">
        Terima kasih telah bergabung di <strong>LifeSync Wellness</strong>. Untuk menyelesaikan pendaftaran akun Anda dan mulai mengelola jadwal harian serta kebiasaan sehat, silakan klik tombol verifikasi di bawah ini:
      </div>
      <div class="btn-container">
        <a href="${url}" class="btn" target="_blank">Verifikasi Akun &amp; Aktifkan</a>
      </div>
      <div class="fallback">
        Jika tombol di atas tidak berfungsi, salin dan buka tautan berikut di browser Anda:<br>
        <a href="${url}" style="color: #0d7a53;">${url}</a>
      </div>
    </div>
    <div class="footer">
      Tautan verifikasi ini berlaku selama 24 jam.<br>
      Jika Anda tidak pernah mendaftar di LifeSync Wellness, Anda bisa mengabaikan email ini.
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Verifikasi Akun Anda — LifeSync Wellness",
      html: htmlContent,
    });

    console.log(
      `[EmailService] Verification email successfully sent to ${email} via Gmail SMTP (Message ID: ${info.messageId})`
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
    const errorMsg =
      err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim email.";
    console.error(
      "[EmailService] Gmail SMTP error while sending verification email:",
      err
    );

    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      error: errorMsg,
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
  if (!transporter) {
    console.warn(
      `[EmailService] SMTP is not configured. Reset password URL for ${email}: ${url}`
    );
    return false;
  }

  try {
    const displayName = name || email.split("@")[0] || "User";
    const senderName = env.MAIL_FROM_NAME || "LifeSync Wellness";
    const senderEmail = env.MAIL_FROM_ADDRESS || env.SMTP_USER;
    const fromAddress = `"${senderName}" <${senderEmail}>`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password LifeSync</title>
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
      <p>Permintaan Reset Kata Sandi</p>
    </div>
    <div class="content">
      <div class="greeting">Halo ${displayName},</div>
      <div class="text">
        Kami menerima permintaan untuk mengatur ulang kata sandi akun LifeSync Anda. Klik tombol di bawah ini:
      </div>
      <div class="btn-container">
        <a href="${url}" class="btn" target="_blank">Reset Kata Sandi</a>
      </div>
      <div class="fallback">
        Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta reset kata sandi, abaikan email ini.
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject: "Reset Kata Sandi — LifeSync Wellness",
      html: htmlContent,
    });

    console.log(
      `[EmailService] Password reset email sent to ${email} via Gmail SMTP (${info.messageId})`
    );

    return true;
  } catch (err) {
    console.error("[EmailService] Gmail SMTP error while sending password reset:", err);
    return false;
  }
}
