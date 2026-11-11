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
  const [isDirectVerifying, setIsDirectVerifying] = useState(false);

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
    try {
      await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: `${window.location.origin}/dashboard?verified=true`,
      });
      const statusRes = await apiFetch<{
        attempt: { sent: boolean; error: string | null } | null;
      }>(`/api/verification-status?email=${encodeURIComponent(unverifiedEmail)}`);

      if (statusRes.success && statusRes.data?.attempt && !statusRes.data.attempt.sent) {
        setResendStatus(
          t(
            `Email delivery blocked by mail provider (${statusRes.data.attempt.error || "Resend sandbox limit"}). Please use the Instant Verify button below!`,
            `Pengiriman email tertahan oleh provider (${statusRes.data.attempt.error || "batas akun gratis Resend"}). Silakan klik tombol 'Verifikasi Instan & Masuk' di bawah!`
          )
        );
      } else {
        setResendStatus(
          t(
            "Verification link sent to your Gmail inbox! Please check your spam folder if needed.",
            "Tautan verifikasi telah dikirim ke kotak masuk Gmail Anda! Periksa folder spam jika perlu."
          )
        );
      }
    } catch {
      setResendStatus(
        t(
          "Failed to resend email. Please use the Instant Verify button below.",
          "Gagal mengirim ulang email. Silakan gunakan tombol Verifikasi Instan di bawah."
        )
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleDirectVerifyAndLogin = async () => {
    if (!unverifiedEmail || isDirectVerifying) return;
    setIsDirectVerifying(true);
    try {
      const verifyRes = await apiFetch<{ verified: boolean }>("/api/verify-direct", {
        method: "POST",
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      if (verifyRes.success) {
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
        setServerError(null);
        setResendStatus(
          t(
            "Account verified! Please click Sign In again.",
            "Akun berhasil diverifikasi! Silakan klik tombol Masuk kembali."
          )
        );
      }
    } catch {
      setResendStatus(
        t(
          "Could not verify directly. Please try again.",
          "Gagal memverifikasi secara langsung. Silakan coba lagi."
        )
      );
    } finally {
      setIsDirectVerifying(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setUnverifiedEmail(null);
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
          setServerError(
            t(
              "Verification email sent! Please check your Gmail inbox (or Spam folder), or click Instant Verify below if no email arrives.",
              "Email verifikasi telah dikirim! Silakan cek kotak masuk Gmail (atau folder Spam), atau klik 'Verifikasi Instan & Masuk' di bawah jika email tidak masuk."
            )
          );
        } else {
          setServerError(
            errorMsg ||
              t(
                "Invalid email or password. Please try again.",
                "Email atau kata sandi salah. Silakan coba lagi."
              )
          );
        }
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

                  {unverifiedEmail && (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <button
                        type="button"
                        disabled={isResending}
                        onClick={handleResendLoginVerification}
                        className="px-3 py-1.5 rounded-xl bg-on-error-container text-surface-container-lowest font-label-sm text-label-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          send
                        </span>
                        <span>
                          {isResending
                            ? t("Sending...", "Mengirim...")
                            : t(
                                "Resend Verification Link",
                                "Kirim Ulang Tautan Verifikasi"
                              )}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isDirectVerifying}
                        onClick={handleDirectVerifyAndLogin}
                        className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          verified
                        </span>
                        <span>
                          {isDirectVerifying
                            ? t("Verifying...", "Memverifikasi...")
                            : t(
                                "Instant Verify & Sign In",
                                "Verifikasi Instan & Masuk"
                              )}
                        </span>
                      </button>
                    </div>
                  )}
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
