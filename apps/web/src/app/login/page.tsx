"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [lastPassword, setLastPassword] = useState<string>("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const isVerifiedBanner = searchParams.get("verified") === "true";
  const isDeletedBanner = searchParams.get("deleted") === "true";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const handleResendLoginVerification = async () => {
    if (!unverifiedEmail || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    setCodeError(null);
    try {
      const res = await apiFetch<{ sent: boolean; message?: string }>("/api/resend-code", {
        method: "POST",
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      if (res.success) {
        setResendStatus(
          t(
            "New 5-digit code sent to your Gmail inbox! Please check your spam folder if needed.",
            "Kode 5 digit baru telah dikirim ke kotak masuk Gmail Anda! Periksa folder spam jika perlu."
          )
        );
      } else {
        setResendStatus(
          t(
            "Failed to resend code. Please try again in a few moments.",
            "Gagal mengirim ulang kode. Silakan coba beberapa saat lagi."
          )
        );
      }
    } catch {
      setResendStatus(
        t(
          "Failed to send email. Please try again in a few moments.",
          "Gagal mengirim email. Silakan coba beberapa saat lagi."
        )
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unverifiedEmail || otpCode.trim().length !== 5 || isVerifyingCode) return;
    setIsVerifyingCode(true);
    setCodeError(null);
    try {
      const res = await apiFetch<{ verified: boolean; message?: string }>("/api/verify-code", {
        method: "POST",
        body: JSON.stringify({
          email: unverifiedEmail,
          code: otpCode.trim(),
        }),
      });

      if (!res.success) {
        setCodeError(
          res.error?.message ||
            t("Invalid or expired 5-digit code.", "Kode 5 digit salah atau sudah kadaluarsa.")
        );
        setIsVerifyingCode(false);
        return;
      }

      // Verification successful! Automatically sign in if password was entered
      if (lastPassword) {
        const loginRes = await signIn.email({
          email: unverifiedEmail,
          password: lastPassword,
          rememberMe: true,
        });
        if (!loginRes.error) {
          router.push("/dashboard?verified=true");
          return;
        }
      }

      setUnverifiedEmail(null);
      router.push("/login?verified=true");
    } catch {
      setCodeError(
        t("Failed to verify code. Please try again.", "Gagal memverifikasi kode. Silakan coba lagi.")
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setResendStatus(null);
    setLastPassword(values.password);
    setIsSubmitting(true);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe,
      });

      if (result.error) {
        const errorMsg = result.error.message || "";
        const isVerifError =
          errorMsg.toLowerCase().includes("verif") ||
          (result.error as { code?: string }).code === "EMAIL_NOT_VERIFIED";

        if (isVerifError) {
          setUnverifiedEmail(values.email);
          setIsSubmitting(false);
          // Automatically trigger sending a fresh 5-digit code via Brevo!
          void apiFetch<{ sent: boolean }>("/api/resend-code", {
            method: "POST",
            body: JSON.stringify({ email: values.email }),
          });
          return;
        }

        setServerError(
          errorMsg ||
            t(
              "Invalid email or password. Please try again.",
              "Email atau kata sandi salah. Silakan coba lagi."
            )
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : t(
              "Unable to connect to authentication service",
              "Tidak dapat terhubung ke layanan autentikasi"
            )
      );
      setIsSubmitting(false);
    }
  };

  if (unverifiedEmail) {
    return (
      <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container">
        <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group transition-transform active:scale-[0.98]"
            >
              <img
                src="/favicon.png"
                alt="LifeSync Logo"
                className="w-12 h-12 object-contain group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none font-bold">
                  LifeSync
                </span>
                <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase mt-0.5 text-[10px]">
                  Wellness
                </span>
              </div>
            </Link>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 pt-28 pb-12">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-8 sm:p-10 shadow-xl border border-surface-container-high flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-secondary-container text-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[44px]">
                pin
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-widest text-primary">
                {t("Email Verification", "Verifikasi Email")}
              </span>
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">
                {t("Enter 5-Digit Code", "Masukkan Kode 5 Digit")}
              </h2>
              <p className="font-body-md text-body-md text-secondary mt-1">
                {t(
                  "We have sent a 5-digit verification code to your Gmail:",
                  "Kami telah mengirimkan 5 digit kode verifikasi ke Gmail Anda:"
                )}
              </p>
              <span className="font-headline-sm text-headline-sm font-bold text-primary break-all">
                {unverifiedEmail}
              </span>
            </div>

            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2">
                <label className="font-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {t("Verification Code", "Kode Verifikasi")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setOtpCode(val);
                    setCodeError(null);
                  }}
                  placeholder="•••••"
                  className="w-64 h-16 text-center font-mono text-3xl font-bold tracking-[14px] rounded-2xl bg-surface-container-low border-2 border-surface-container-high focus:border-primary focus:bg-surface focus:outline-none transition-all shadow-inner text-primary"
                  autoFocus
                />
              </div>

              {codeError && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm text-center">
                  {codeError}
                </div>
              )}

              {resendStatus && (
                <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-sm text-label-sm text-center">
                  {resendStatus}
                </div>
              )}

              <button
                type="submit"
                disabled={otpCode.length !== 5 || isVerifyingCode}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary-container disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  check_circle
                </span>
                <span>
                  {isVerifyingCode
                    ? t("Verifying...", "Memeriksa...")
                    : t("Confirm & Activate Account", "Konfirmasi & Aktifkan")}
                </span>
              </button>
            </form>

            <div className="flex flex-col gap-3 w-full pt-1">
              <button
                type="button"
                disabled={isResending}
                onClick={handleResendLoginVerification}
                className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                <span>
                  {isResending
                    ? t("Sending...", "Mengirim...")
                    : t("Resend 5-Digit Code", "Kirim Ulang Kode 5 Digit")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setUnverifiedEmail(null)}
                className="w-full py-2.5 text-secondary hover:text-on-surface font-label-md text-label-md font-medium transition-all text-center"
              >
                {t("Back to Sign In", "Kembali ke Form Masuk")}
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-surface-container-low py-6 bg-surface text-center font-body-sm text-body-sm text-secondary">
          LifeSync Wellness &copy; {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container">
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group transition-transform active:scale-[0.98]"
          >
            <img
              src="/favicon.png"
              alt="LifeSync Logo"
              className="w-12 h-12 object-contain group-hover:scale-105 transition-transform shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none font-bold">
                LifeSync
              </span>
              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase mt-0.5 text-[10px]">
                {t("Daily Lifestyle", "Gaya Hidup Sehat")}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-space-md">
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low text-secondary">
              <span className="material-symbols-outlined text-[16px] text-primary">
                lock
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {t("Private & Secure", "Aman & Terjaga Privasi")}
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              <span>{t("Back to Home", "Kembali ke Beranda")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 flex flex-col justify-center">
        <div className="relative w-full overflow-hidden py-space-xl px-gutter-mobile lg:px-margin flex items-center justify-center">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary-container/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-20 w-[450px] h-[450px] rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-xl flex flex-col items-center">
            <div className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-secondary-container/60 text-secondary mb-space-md shadow-sm">
              <span
                className="material-symbols-outlined text-[16px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                eco
              </span>
              <span className="font-label-md text-label-md text-on-secondary-fixed-variant">
                {t("Welcome back to your daily routine", "Selamat datang kembali di rutinitas Anda")}
              </span>
            </div>

            <div className="w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-lg sm:p-space-xl flex flex-col">
              <div className="flex flex-col text-center items-center mb-space-lg">
                <img
                  src="/favicon.png"
                  alt="LifeSync Logo"
                  className="w-20 h-20 object-contain mb-space-sm"
                />
                <h1 className="font-headline-lg text-headline-lg text-on-surface">
                  {t("Sign in to LifeSync", "Masuk ke LifeSync")}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-sm">
                  {t(
                    "Track your 24 hours, sleep well, and build healthy daily habits.",
                    "Atur 24 jam Anda, tidur cukup, dan bangun kebiasaan harian yang baik."
                  )}
                </p>
              </div>

              {isVerifiedBanner && (
                <div className="mb-space-md p-4 rounded-2xl bg-secondary-container text-on-secondary-container font-label-md text-label-md flex items-center gap-2.5 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    check_circle
                  </span>
                  <span>
                    {t(
                      "Your email has been verified successfully! You can now sign in.",
                      "Email Anda berhasil diverifikasi! Anda sekarang dapat masuk."
                    )}
                  </span>
                </div>
              )}

              {isDeletedBanner && (
                <div className="mb-space-md p-4 rounded-2xl bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-2.5 shadow-2xs">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    delete
                  </span>
                  <span>
                    {t(
                      "Your account has been deleted successfully.",
                      "Akun Anda telah berhasil dihapus."
                    )}
                  </span>
                </div>
              )}

              {serverError && (
                <div className="mb-space-md p-4 rounded-2xl bg-error-container text-on-error-container font-label-md text-label-md flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] shrink-0">
                      error
                    </span>
                    <span>{serverError}</span>
                  </div>
                </div>
              )}

              {resendStatus && (
                <div className="mb-space-md p-3.5 rounded-2xl bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    mark_email_read
                  </span>
                  <span>{resendStatus}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-space-md"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email-input"
                    className="font-label-md text-label-md text-on-surface font-medium flex items-center justify-between"
                  >
                    <span>
                      {t("Email Address", "Alamat Email")}
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      mail
                    </span>
                    <input
                      id="email-input"
                      type="email"
                      placeholder="name@example.com"
                      {...register("email")}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-body-md text-body-md transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-sm"
                    />
                  </div>
                  {errors.email && (
                    <span className="font-body-sm text-body-sm text-error">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password-input"
                      className="font-label-md text-label-md text-on-surface font-medium"
                    >
                      {t("Password", "Kata Sandi")}
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-outline pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      {...register("password")}
                      className="w-full pl-11 pr-12 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline-variant font-body-md text-body-md transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 text-outline hover:text-on-surface p-1 rounded-lg transition-colors"
                      title={t(
                        "Toggle password visibility",
                        "Tampilkan/sembunyikan kata sandi"
                      )}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {errors.password && (
                    <span className="font-body-sm text-body-sm text-error">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      {...register("rememberMe")}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 rounded-lg bg-surface-container-low peer-checked:bg-primary flex items-center justify-center text-on-primary transition-all shadow-sm">
                      <span className="material-symbols-outlined text-[15px] opacity-0 peer-checked:opacity-100 transition-opacity">
                        check
                      </span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface-variant font-normal">
                      {t(
                        "Remember me on this device",
                        "Ingat saya di perangkat ini"
                      )}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-space-lg rounded-xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-xs shadow-md hover:bg-primary-container active:scale-[0.99] transition-all duration-150 disabled:opacity-60"
                >
                  <span>
                    {isSubmitting
                      ? t("Signing in...", "Sedang masuk...")
                      : t("Sign In", "Masuk")}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </form>

              <div className="mt-space-lg pt-space-md flex flex-col items-center gap-space-sm text-center">
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {t(
                    "Don't have an account yet?",
                    "Belum punya akun?"
                  )}{" "}
                  <Link
                    href="/register"
                    className="text-primary font-semibold hover:underline ml-1"
                  >
                    {t("Create your account", "Daftar sekarang")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-space-lg max-w-md text-center flex flex-col items-center gap-space-xs">
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  favorite
                </span>
                <span className="font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                  {t("Daily Balance Principle", "Prinsip Hidup Sehat")}
                </span>
              </div>
              <blockquote className="font-body-md text-body-md italic text-on-surface-variant">
                &ldquo;
                {t(
                  "A healthy, energized day begins with a mindful, well-paced routine.",
                  "Hari yang sehat dan bertenaga dimulai dari rutinitas yang teratur dan penuh kesadaran."
                )}
                &rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-surface-container-low/60 py-space-md">
        <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex flex-col sm:flex-row items-center justify-between gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[14px] text-primary">
              check_circle
            </span>
            <span>
              {t(
                "Your Personal Data is Kept Safe & Private",
                "Data Pribadi Anda Aman & Terlindungi"
              )}
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <span>{t("Privacy Policy", "Kebijakan Privasi")}</span>
            <span className="text-outline-variant">•</span>
            <span>{t("Terms of Use", "Syarat Penggunaan")}</span>
            <span className="text-outline-variant">•</span>
            <span>© 2026 LifeSync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
