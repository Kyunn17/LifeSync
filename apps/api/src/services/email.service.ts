import { env } from "../config/env";
import { getDb, user, verification, eq, and, gte } from "@lifesync/db";

export interface VerificationAttempt {
  email: string;
  sent: boolean;
  error: string | null;
  code?: string;
  verificationUrl: string;
  updatedAt: string;
}

const verificationAttempts = new Map<string, VerificationAttempt>();

export function getVerificationAttempt(
  email: string
): VerificationAttempt | null {
  return verificationAttempts.get(email.trim().toLowerCase()) ?? null;
}

export async function generateAndSaveVerificationCode(
  email: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit code (10000 - 99999)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

  try {
    const db = getDb();
    // Hapus kode lama untuk email ini agar tidak bentrok
    await db
      .delete(verification)
      .where(eq(verification.identifier, normalizedEmail));

    // Simpan kode 5-digit baru
    await db.insert(verification).values({
      id: `code_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      identifier: normalizedEmail,
      value: code,
      expiresAt,
    });
  } catch (err) {
    console.error("[EmailService] Failed to save 5-digit code to DB:", err);
  }

  return code;
}

export async function verifyOtpCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  if (!cleanCode || cleanCode.length !== 5) {
    return {
      success: false,
      error: "Kode verifikasi harus terdiri dari 5 digit angka.",
    };
  }

  try {
    const db = getDb();
    const now = new Date();

    const records = await db
      .select()
      .from(verification)
      .where(
        and(
          eq(verification.identifier, normalizedEmail),
          eq(verification.value, cleanCode),
          gte(verification.expiresAt, now)
        )
      );

    if (!records.length) {
      return {
        success: false,
        error: "Kode verifikasi salah atau sudah kadaluarsa (berlaku 15 menit).",
      };
    }

    // Kode valid! Aktifkan email user di database
    await db
      .update(user)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      } as any)
      .where(eq(user.email, normalizedEmail));

    // Bersihkan kode verifikasi yang sudah dipakai
    await db
      .delete(verification)
      .where(eq(verification.identifier, normalizedEmail));

    return { success: true };
  } catch (err) {
    console.error("[EmailService] Error verifying OTP code:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat verifikasi.",
    };
  }
}

async function sendViaBrevo({
  to,
  name,
  subject,
  html,
}: {
  to: string;
  name?: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const senderEmail = env.EMAIL_FROM.includes("<")
    ? env.EMAIL_FROM.split("<")[1]?.replace(">", "").trim() || "arulxxds@gmail.com"
    : (env.EMAIL_FROM || "arulxxds@gmail.com");
  const senderName = env.EMAIL_FROM.includes("<")
    ? env.EMAIL_FROM.split("<")[0]?.replace(/"/g, "").trim() || "LifeSync Wellness"
    : "LifeSync Wellness";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to, name: name || to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { ok: false, error: `Brevo error (${res.status}): ${errorText}` };
  }

  const data = (await res.json()) as { messageId?: string };
  return { ok: true, messageId: data.messageId };
}

export async function sendVerificationEmail({
  email,
  name,
  url,
  code: providedCode,
}: {
  email: string;
  name?: string;
  url: string;
  code?: string;
}): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name || email.split("@")[0] || "User";

  // Siapkan kode 5 digit
  const code =
    providedCode || (await generateAndSaveVerificationCode(normalizedEmail));

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode Verifikasi LifeSync</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7faf8; margin: 0; padding: 24px; color: #1e2924; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(13, 122, 83, 0.06); border: 1px solid #e2ebe6; }
    .header { background: linear-gradient(135deg, #0d7a53 0%, #159367 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 36px 32px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0f382a; text-align: left; }
    .text { font-size: 15px; line-height: 1.6; color: #3b4d45; margin-bottom: 24px; text-align: left; }
    .otp-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #0d7a53; margin-bottom: 8px; }
    .otp-box { display: inline-block; font-size: 44px; font-weight: 800; letter-spacing: 14px; color: #0d7a53; background: #eaf5f0; padding: 18px 36px; border-radius: 16px; border: 2px dashed #0d7a53; font-family: monospace; }
    .otp-hint { font-size: 13px; color: #6f8078; margin-top: 14px; }
    .divider { height: 1px; background: #eef3f0; margin: 28px 0; }
    .fallback-text { font-size: 13px; color: #6f8078; margin-bottom: 12px; }
    .btn { display: inline-block; background-color: #0d7a53; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .footer { background: #f7faf8; padding: 20px 32px; text-align: center; font-size: 12px; color: #8a9c94; border-top: 1px solid #eef3f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LifeSync Wellness</h1>
      <p>Aktivasi Akun &amp; Verifikasi Email</p>
    </div>
    <div class="content">
      <div class="greeting">Halo ${displayName},</div>
      <div class="text">
        Terima kasih telah bergabung di <strong>LifeSync Wellness</strong>. Silakan masukkan kode verifikasi 5-digit di bawah ini pada halaman web LifeSync untuk mengaktifkan akun Anda:
      </div>

      <div class="otp-label">KODE VERIFIKASI ANDA</div>
      <div class="otp-box">${code}</div>
      <div class="otp-hint">Kode ini berlaku selama 15 menit.</div>

      <div class="divider"></div>

      <div class="fallback-text">Atau klik tautan langsung di bawah jika tidak ingin mengetik kode:</div>
      <a href="${url}" class="btn" target="_blank">Aktivasi Akun Langsung</a>
    </div>
    <div class="footer">
      Jika Anda tidak pernah mendaftar di LifeSync Wellness, Anda bisa mengabaikan email ini.
    </div>
  </div>
</body>
</html>
  `;

  if (!env.BREVO_API_KEY) {
    console.warn(
      `[EmailService] BREVO_API_KEY is not configured. Verification code for ${email}: ${code}`
    );
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      code,
      error: "BREVO_API_KEY belum dikonfigurasi.",
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return false;
  }

  try {
    const result = await sendViaBrevo({
      to: email,
      name: displayName,
      subject: `Kode Verifikasi LifeSync: ${code}`,
      html: htmlContent,
    });

    if (result.ok) {
      console.log(
        `[EmailService] 5-digit verification email (${code}) successfully sent to ${email} via Brevo (ID: ${result.messageId})`
      );
      verificationAttempts.set(normalizedEmail, {
        email: normalizedEmail,
        sent: true,
        code,
        error: null,
        verificationUrl: url,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }

    console.error("[EmailService] Brevo API send failed:", result.error);
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      code,
      error: result.error || "Gagal mengirim email via Brevo.",
      verificationUrl: url,
      updatedAt: new Date().toISOString(),
    });
    return false;
  } catch (err) {
    console.error("[EmailService] Exception while sending via Brevo:", err);
    verificationAttempts.set(normalizedEmail, {
      email: normalizedEmail,
      sent: false,
      code,
      error: err instanceof Error ? err.message : "Gagal mengirim email.",
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
  const displayName = name || email.split("@")[0] || "User";

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
    .content { padding: 36px 32px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #0f382a; text-align: left; }
    .text { font-size: 15px; line-height: 1.6; color: #3b4d45; margin-bottom: 24px; text-align: left; }
    .btn { display: inline-block; background-color: #0d7a53; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; }
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
      <a href="${url}" class="btn" target="_blank">Reset Kata Sandi</a>
      <div class="fallback">
        Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta reset kata sandi, abaikan email ini.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  if (!env.BREVO_API_KEY) return false;

  try {
    const res = await sendViaBrevo({
      to: email,
      name: displayName,
      subject: "Reset Kata Sandi — LifeSync Wellness",
      html: htmlContent,
    });
    return res.ok;
  } catch (e) {
    console.error("[EmailService] Brevo reset error:", e);
    return false;
  }
}
