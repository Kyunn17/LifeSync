"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp, signIn, authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

const FOCUS_OPTIONS = [
  {
    id: "Optimal Sleep & Recovery",
    titleEn: "Better Sleep & Rest",
    titleId: "Tidur Nyenyak & Istirahat",
    subtitleEn: "Fall asleep easier and wake up refreshed",
    subtitleId: "Tidur lebih pulas dan bangun lebih segar",
    icon: "bedtime",
  },
  {
    id: "Sustained Daytime Focus",
    titleEn: "Daily Focus & Energy",
    titleId: "Fokus & Produktivitas Harian",
    subtitleEn: "Stay productive without feeling burnt out",
    subtitleId: "Tetap produktif tanpa cepat merasa lelah",
    icon: "psychology",
  },
  {
    id: "Metabolic Meal Timing",
    titleEn: "Regular Meal Times",
    titleId: "Waktu Makan Teratur",
    subtitleEn: "Eat at consistent hours for healthy energy",
    subtitleId: "Jadwal makan teratur untuk energi stabil",
    icon: "restaurant",
  },
  {
    id: "Stress & Cortisol Balance",
    titleEn: "Stress Relief & Relaxation",
    titleId: "Kelola Stres & Relaksasi",
    subtitleEn: "Calm your mind with balanced breaks",
    subtitleId: "Tenangkan pikiran dengan jeda yang seimbang",
    icon: "self_improvement",
  },
] as const;

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  primaryFocus: z.string().min(1),
  targetWakeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  targetSleepTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please accept the terms to continue" }),
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function calculateSleepHoursLabel(
  wakeTime: string,
  sleepTime: string,
  hrsUnit: string,
  minsUnit: string
): string {
  const [wakeH = 6, wakeM = 45] = wakeTime.split(":").map(Number);
  const [sleepH = 22, sleepM = 30] = sleepTime.split(":").map(Number);
  const wakeTotal = wakeH * 60 + wakeM;
  const sleepTotal = sleepH * 60 + sleepM;
  let diff = wakeTotal - sleepTotal;
  if (diff <= 0) diff += 1440;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs} ${hrsUnit} ${mins} ${minsUnit}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [registeredPassword, setRegisteredPassword] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendRegisterVerification = async () => {
    if (!registeredEmail || resendCooldown > 0) return;
    try {
      const res = await apiFetch<{ sent: boolean; message?: string }>("/api/resend-code", {
        method: "POST",
        body: JSON.stringify({ email: registeredEmail }),
      });

      if (res.success) {
        setResendStatus(
          t(
            "New 5-digit code sent to your Gmail inbox! Please check your spam folder if needed.",
            "Kode 5 digit baru telah dikirim ke kotak masuk Gmail Anda! Periksa folder spam jika perlu."
          )
        );
        setResendCooldown(60);
      } else {
        setResendStatus(
          t(
            "Failed to resend. Please try again in a few moments.",
            "Gagal mengirim ulang. Silakan coba beberapa saat lagi."
          )
        );
      }
    } catch {
      setResendStatus(
        t(
          "Failed to resend. Please try again in a few moments.",
          "Gagal mengirim ulang. Silakan coba beberapa saat lagi."
        )
      );
    }
  };

  const handleVerifyOtpRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeredEmail || otpCode.trim().length !== 5 || isVerifyingCode) return;
    setIsVerifyingCode(true);
    setCodeError(null);
    try {
      const res = await apiFetch<{ verified: boolean; message?: string }>("/api/verify-code", {
        method: "POST",
        body: JSON.stringify({
          email: registeredEmail,
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

      // Verification successful! Automatically sign in & redirect to dashboard
      if (registeredPassword) {
        const loginRes = await signIn.email({
          email: registeredEmail,
          password: registeredPassword,
          rememberMe: true,
        });
        if (!loginRes.error) {
          router.push("/dashboard?verified=true");
          return;
        }
      }

      router.push("/login?verified=true");
    } catch {
      setCodeError(
        t("Failed to verify code. Please try again.", "Gagal memverifikasi kode. Silakan coba lagi.")
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      primaryFocus: "Optimal Sleep & Recovery",
      targetWakeTime: "06:45",
      targetSleepTime: "22:30",
      consent: true,
    },
  });

  const selectedFocus = watch("primaryFocus");
  const wakeTime = watch("targetWakeTime");
  const sleepTime = watch("targetSleepTime");
  const passwordVal = watch("password") || "";

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (passwordVal.length >= 8) score++;
    if (passwordVal.length >= 12) score++;
    if (/[A-Z]/.test(passwordVal) && /[0-9]/.test(passwordVal)) score++;
    if (/[^A-Za-z0-9]/.test(passwordVal)) score++;
    return Math.max(1, score);
  }, [passwordVal]);

  const sleepAllocationLabel = useMemo(
    () =>
      calculateSleepHoursLabel(
        wakeTime,
        sleepTime,
        t("hrs", "jam"),
        t("mins", "mnt")
      ),
    [wakeTime, sleepTime, t]
  );

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (res.error) {
        setServerError(
          res.error.message ||
            t(
              "Could not create account. Please try again.",
              "Tidak dapat membuat akun. Silakan coba lagi."
            )
        );
        setIsSubmitting(false);
        return;
      }

      // Show the dedicated Gmail verification screen
      setRegisteredEmail(values.email);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : t(
              "Failed to complete registration",
              "Gagal menyelesaikan pendaftaran"
            )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container">
        <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 max-w-7xl mx-auto px-gutter-mobile lg:px-margin flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 group cursor-pointer focus:outline-none"
            >
              <img
                src="/favicon.png"
                alt="LifeSync Logo"
                className="w-12 h-12 object-contain group-hover:scale-102 transition-transform shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight leading-none">
                  LifeSync
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold text-[10px] mt-0.5">
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
                {t("Almost Done!", "Hampir Selesai!")}
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
                {registeredEmail}
              </span>
            </div>

            <form onSubmit={handleVerifyOtpRegister} className="w-full flex flex-col gap-4">
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
                <div className="w-full p-3.5 rounded-2xl bg-secondary-container text-on-secondary-container font-label-md text-label-md font-semibold text-center">
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
                disabled={resendCooldown > 0}
                onClick={handleResendRegisterVerification}
                className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                <span>
                  {resendCooldown > 0
                    ? `${t("Resend in", "Kirim ulang dalam")} ${resendCooldown}s`
                    : t(
                        "Resend 5-Digit Code",
                        "Kirim Ulang Kode 5 Digit"
                      )}
                </span>
              </button>

              <Link
                href="/login"
                className="w-full py-2.5 text-secondary hover:text-on-surface font-label-md text-label-md font-medium transition-all text-center"
              >
                {t("Go to Sign In", "Beralih ke Halaman Masuk")}
              </Link>
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
            <Link
              href="/login"
              className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                arrow_back
              </span>
              <span>{t("Sign In", "Masuk")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 flex-1 flex flex-col justify-center">
        <div className="w-full max-w-7xl mx-auto px-gutter-mobile lg:px-margin py-space-lg lg:py-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* LEFT HELPFUL CONTEXT PANEL (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg">
              <div className="bg-surface-container-low rounded-xl p-space-lg lg:p-space-xl shadow-sm relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary-container/40 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-widest mb-space-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>
                    {t("Healthy Daily Routine", "Rutinitas Sehat Harian")}
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-space-xs font-bold">
                  {t(
                    "Balance your daily 24 hours.",
                    "Atur 24 jam harian Anda dengan mudah."
                  )}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                  {t(
                    "Plan sleep, work, workouts, meals, and relaxation in one place. No complicated science, just clear daily balance.",
                    "Rencanakan tidur, kerja, olahraga, makan, dan waktu istirahat di satu tempat. Tanpa istilah rumit, murni keseimbangan hidup Anda."
                  )}
                </p>

                <div className="flex flex-col gap-space-md relative">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-variant" />
                  <div className="flex items-start gap-space-md relative z-10">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md shadow-sm font-bold">
                      1
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-primary font-semibold flex items-center gap-space-xs">
                        {t("Account Information", "Informasi Akun")}
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                          {t("Active", "Aktif")}
                        </span>
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Your secure login and profile",
                          "Akun dan profil pribadi Anda"
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-md relative z-10 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md font-bold">
                      2
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-medium">
                        {t(
                          "Bedtime & Wake-Up Times",
                          "Target Jam Tidur & Bangun"
                        )}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Set your natural daily sleep schedule",
                          "Tentukan jadwal tidur harian Anda"
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-md relative z-10 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md font-bold">
                      3
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-medium">
                        {t(
                          "Healthy Daily Targets",
                          "Target Kebiasaan Sehat"
                        )}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Water, daily steps, and workout goals",
                          "Target minum air, langkah harian, dan olahraga"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 24-Hour Circular Ring Visualizer */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[18px]">
                      timelapse
                    </span>
                    <span>{t("24-Hour Day Clock", "Jam Harian 24 Jam")}</span>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium">
                    {t("Preview", "Pratinjau")}
                  </span>
                </div>

                <div className="relative w-full py-space-sm flex flex-col items-center justify-center">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg
                      className="w-full h-full -rotate-90 transform"
                      viewBox="0 0 160 160"
                    >
                      <circle
                        className="text-surface-container fill-none stroke-current"
                        cx="80"
                        cy="80"
                        r="64"
                        strokeWidth="12"
                      />
                      <circle
                        className="text-secondary fill-none stroke-current"
                        cx="80"
                        cy="80"
                        r="64"
                        strokeDasharray="402"
                        strokeDashoffset="268"
                        strokeLinecap="round"
                        strokeWidth="12"
                      />
                      <circle
                        className="text-primary fill-none stroke-current"
                        cx="80"
                        cy="80"
                        r="64"
                        strokeDasharray="402"
                        strokeDashoffset="180"
                        strokeLinecap="round"
                        strokeWidth="14"
                      />
                      <circle
                        className="text-tertiary-fixed-dim fill-none stroke-current"
                        cx="80"
                        cy="80"
                        r="64"
                        strokeDasharray="402"
                        strokeDashoffset="340"
                        strokeLinecap="round"
                        strokeWidth="12"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-bold leading-none">
                        {sleepAllocationLabel.split(" ")[0]}
                        <span className="font-label-sm text-label-sm text-secondary font-normal">
                          h
                        </span>
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
                        {t("Sleep Time", "Waktu Tidur")}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT REGISTRATION FORM CARD (7 cols) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg lg:p-space-xl shadow-md flex flex-col">
              <div className="flex flex-col gap-space-xs mb-space-lg">
                <div className="flex items-center justify-between">
                  <span className="px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-semibold tracking-wide">
                    {t(
                      "Step 1 of 3 • Quick Setup (1 min)",
                      "Langkah 1 dari 3 • Pengaturan Cepat (1 mnt)"
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-1.5 rounded-full bg-primary" />
                    <div className="w-6 h-1.5 rounded-full bg-surface-variant" />
                    <div className="w-6 h-1.5 rounded-full bg-surface-variant" />
                  </div>
                </div>
                <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-space-xs font-bold">
                  {t(
                    "Create your LifeSync Account",
                    "Buat Akun LifeSync Anda"
                  )}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t(
                    "Start organizing your daily routine with a personalized plan.",
                    "Mulai atur rutinitas harian Anda dengan rencana yang jelas."
                  )}
                </p>
              </div>

              {serverError && (
                <div className="mb-space-md p-3.5 rounded-xl bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  <span>{serverError}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-space-md"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <label
                      htmlFor="full-name"
                      className="font-label-md text-label-md text-on-surface font-semibold"
                    >
                      {t("Your Name", "Nama Lengkap")}
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                        person
                      </span>
                      <input
                        id="full-name"
                        type="text"
                        placeholder={t("e.g. Alex Johnson", "mis. Budi Santoso")}
                        {...register("name")}
                        className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md pl-10 pr-3 py-2.5 rounded-xl transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      />
                    </div>
                    {errors.name && (
                      <span className="font-body-sm text-body-sm text-error">
                        {errors.name.message}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label
                      htmlFor="email"
                      className="font-label-md text-label-md text-on-surface font-semibold"
                    >
                      {t("Email Address", "Alamat Email")}
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                        mail
                      </span>
                      <input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        {...register("email")}
                        className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md pl-10 pr-3 py-2.5 rounded-xl transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                      />
                    </div>
                    {errors.email && (
                      <span className="font-body-sm text-body-sm text-error">
                        {errors.email.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password with Strength Visualizer */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="font-label-md text-label-md text-on-surface font-semibold"
                    >
                      {t("Password", "Kata Sandi")}
                    </label>
                    <span className="font-label-sm text-label-sm text-secondary">
                      {t("Min 8 characters", "Min 8 karakter")}
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                      lock
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t(
                        "Create a secure password",
                        "Buat kata sandi yang aman"
                      )}
                      {...register("password")}
                      className="w-full bg-surface-container-low text-on-surface font-body-md text-body-md pl-10 pr-10 py-2.5 rounded-xl transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 text-on-surface-variant hover:text-primary transition-colors flex items-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {errors.password && (
                    <span className="font-body-sm text-body-sm text-error">
                      {errors.password.message}
                    </span>
                  )}

                  <div className="flex flex-col gap-1 mt-1 bg-surface-container-low/50 p-space-xs rounded-lg">
                    <div className="flex items-center gap-1.5 w-full">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            bar <= passwordStrength
                              ? "bg-primary"
                              : "bg-surface-container-high"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Wellness Focus Selector */}
                <div className="flex flex-col gap-space-xs mt-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      {t("What is your main goal?", "Apa tujuan utama Anda?")}
                    </label>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t("Choose one", "Pilih salah satu")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
                    {FOCUS_OPTIONS.map((opt) => {
                      const active = selectedFocus === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setValue("primaryFocus", opt.id)}
                          className={`flex items-center justify-between p-space-sm rounded-xl text-left transition-all ${
                            active
                              ? "bg-secondary-container text-on-secondary-container shadow-sm"
                              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <div className="flex items-center gap-space-xs">
                            <span
                              className={`material-symbols-outlined text-[20px] ${
                                active ? "text-primary" : "text-secondary"
                              }`}
                            >
                              {opt.icon}
                            </span>
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md font-semibold">
                                {t(opt.titleEn, opt.titleId)}
                              </span>
                              <span className="font-label-sm text-label-sm opacity-80">
                                {t(opt.subtitleEn, opt.subtitleId)}
                              </span>
                            </div>
                          </div>
                          {active && (
                            <span className="material-symbols-outlined text-[18px] text-primary">
                              check_circle
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Baseline Sleep & Wake Quick-Pickers */}
                <div className="flex flex-col gap-space-xs mt-space-xs bg-surface-container-low p-space-md rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        schedule
                      </span>
                      {t(
                        "Your Daily Sleep Schedule",
                        "Jadwal Tidur Harian Anda"
                      )}
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary">
                      {t("Estimated sleep:", "Estimasi tidur:")} {sleepAllocationLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mt-1">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="wake-time"
                        className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px] text-secondary">
                          light_mode
                        </span>
                        {t("Wake-Up Time", "Jam Bangun Pagi")}
                      </label>
                      <input
                        id="wake-time"
                        type="time"
                        {...register("targetWakeTime")}
                        className="w-full bg-surface-container-lowest text-on-surface font-headline-sm text-headline-sm px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="sleep-time"
                        className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px] text-secondary">
                          dark_mode
                        </span>
                        {t("Bedtime", "Jam Tidur Malam")}
                      </label>
                      <input
                        id="sleep-time"
                        type="time"
                        {...register("targetSleepTime")}
                        className="w-full bg-surface-container-lowest text-on-surface font-headline-sm text-headline-sm px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-space-sm pt-space-xs">
                  <input
                    id="consent"
                    type="checkbox"
                    {...register("consent")}
                    className="w-4 h-4 mt-1 rounded text-primary focus:ring-primary bg-surface-container cursor-pointer accent-primary"
                  />
                  <label
                    htmlFor="consent"
                    className="font-body-sm text-body-sm text-on-surface-variant leading-snug cursor-pointer select-none"
                  >
                    {t(
                      "I agree to LifeSync's Terms of Service and Privacy Policy.",
                      "Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi LifeSync."
                    )}
                  </label>
                </div>

                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-label-lg text-label-lg py-3.5 px-space-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-space-xs group disabled:opacity-60 font-bold"
                  >
                    <span>
                      {isSubmitting
                        ? t("Creating Account...", "Membuat Akun...")
                        : t(
                            "Create Account & Start My Day",
                            "Buat Akun & Mulai Sekarang"
                          )}
                    </span>
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-space-xs font-label-md text-label-md text-on-surface-variant mt-space-xs">
                    <span>
                      {t("Already have an account?", "Sudah punya akun?")}
                    </span>
                    <Link
                      href="/login"
                      className="text-primary font-semibold hover:underline flex items-center"
                    >
                      {t("Sign in instead", "Masuk di sini")}
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
