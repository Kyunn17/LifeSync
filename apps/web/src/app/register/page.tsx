"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

const FOCUS_OPTIONS = [
  {
    id: "Optimal Sleep & Recovery",
    titleEn: "Optimal Sleep & Recovery",
    titleId: "Tidur & Pemulihan Optimal",
    subtitleEn: "REM expansion & latency",
    subtitleId: "Ekspansi REM & latensi tidur",
    icon: "bedtime",
  },
  {
    id: "Sustained Daytime Focus",
    titleEn: "Sustained Daytime Focus",
    titleId: "Fokus Siang Hari Berkelanjutan",
    subtitleEn: "Cortisol curve pacing",
    subtitleId: "Pengaturan kurva kortisol",
    icon: "psychology",
  },
  {
    id: "Metabolic Meal Timing",
    titleEn: "Metabolic Meal Timing",
    titleId: "Jadwal Makan Metabolik",
    subtitleEn: "Insulin sensitivity sync",
    subtitleId: "Sinkronisasi sensitivitas insulin",
    icon: "restaurant",
  },
  {
    id: "Stress & Cortisol Balance",
    titleEn: "Stress & Cortisol Balance",
    titleId: "Keseimbangan Stres & Kortisol",
    subtitleEn: "Vagal tone preservation",
    subtitleId: "Pelestarian tonus vagal",
    icon: "self_improvement",
  },
] as const;

const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  primaryFocus: z.string().min(1),
  targetWakeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  targetSleepTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" }),
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

      // Save initial circadian onboarding preferences to user profile
      await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          primaryFocus: values.primaryFocus,
          targetWakeTime: values.targetWakeTime,
          targetSleepTime: values.targetSleepTime,
        }),
      });

      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : t("Failed to complete registration", "Gagal menyelesaikan pendaftaran")
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
            className="flex items-center gap-space-sm group transition-transform active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
              <span className="material-symbols-outlined text-[22px]">spa</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">
                LifeSync
              </span>
              <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase mt-0.5">
                {t("Digital Vitality", "Vitalitas Digital")}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-space-md">
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-low text-secondary">
              <span className="material-symbols-outlined text-[16px] text-primary">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {t(
                  "HIPAA & ISO 27001 Verified",
                  "Terverifikasi HIPAA & ISO 27001"
                )}
              </span>
            </div>
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
            {/* LEFT ASYMMETRIC STORY & STEP CONTEXT PANEL (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-space-lg">
              <div className="bg-surface-container-low rounded-xl p-space-lg lg:p-space-xl shadow-sm relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-secondary-container/40 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md uppercase tracking-widest mb-space-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>
                    {t("Biological Stewardship", "Manajemen Biologis")}
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-space-xs">
                  {t(
                    "Begin your 24-hour balance.",
                    "Mulai keseimbangan 24 jam Anda."
                  )}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                  {t(
                    "Harmonize daily schedules with your inner physiological clock. Grounded in chronobiology and real-time biometric stewardship.",
                    "Selaraskan jadwal harian dengan jam fisiologis alami Anda. Berbasis kronobiologi dan pemantauan biometrik waktu nyata."
                  )}
                </p>

                <div className="flex flex-col gap-space-md relative">
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-variant" />
                  <div className="flex items-start gap-space-md relative z-10">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md shadow-sm">
                      1
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-primary font-semibold flex items-center gap-space-xs">
                        {t("Account Essentials", "Informasi Akun")}
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                          {t("Active", "Aktif")}
                        </span>
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Foundational identity and biological privacy safeguards",
                          "Identitas dasar dan perlindungan privasi biologis"
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-md relative z-10 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
                      2
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-medium">
                        {t(
                          "Circadian Baseline & Daily Rhythm",
                          "Garis Dasar Sirkadian & Ritme Harian"
                        )}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Sleep-wake windows and cognitive peak mapping",
                          "Jendela tidur-bangun dan pemetaan puncak kognitif"
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-md relative z-10 opacity-80">
                    <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
                      3
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg text-on-surface font-medium">
                        {t(
                          "Biometric Sync & Vital Goals",
                          "Sinkronisasi Biometrik & Target Vital"
                        )}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t(
                          "Continuous telemetry link & predictive guardrails",
                          "Tautan telemetri berkelanjutan & panduan prediktif"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Serene Preview: The 24-Hour Circular Ring Visualizer */}
              <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[18px]">
                      timelapse
                    </span>
                    <span>{t("24h Dial Archetype", "Arketipe Dial 24 Jam")}</span>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-secondary font-medium">
                    {t("Interactive Preview", "Pratinjau Interaktif")}
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
                        {t("Rest Window", "Waktu Tidur")}
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
                      "Step 1 of 3 • Quick Setup (2 mins)",
                      "Langkah 1 dari 3 • Persiapan Cepat (2 mnt)"
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-1.5 rounded-full bg-primary" />
                    <div className="w-6 h-1.5 rounded-full bg-surface-variant" />
                    <div className="w-6 h-1.5 rounded-full bg-surface-variant" />
                  </div>
                </div>
                <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mt-space-xs">
                  {t(
                    "Create your LifeSync Account",
                    "Buat Akun LifeSync Anda"
                  )}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t(
                    "Personalized circadian intelligence begins with your foundational profile.",
                    "Kecerdasan sirkadian personal dimulai dari profil dasar Anda."
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
                      className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between"
                    >
                      <span>{t("Full Legal Name", "Nama Lengkap")}</span>
                      <span className="text-secondary font-normal font-label-sm text-label-sm">
                        {t("Protected", "Terlindungi")}
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                        person
                      </span>
                      <input
                        id="full-name"
                        type="text"
                        placeholder={t("e.g. Elena Rostova", "mis. Budi Santoso")}
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
                      className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between"
                    >
                      <span>{t("Primary Email", "Email Utama")}</span>
                      <span className="text-secondary font-normal font-label-sm text-label-sm">
                        {t("Alert node", "Node notifikasi")}
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute left-3 pointer-events-none">
                        mail
                      </span>
                      <input
                        id="email"
                        type="email"
                        placeholder="elena@example.com"
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
                      {t("Master Security Key", "Kata Sandi Keamanan")}
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
                        "Enter resilient passphrase",
                        "Masukkan kata sandi yang kuat"
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
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-0.5">
                      <div className="flex items-center gap-1 text-primary font-medium">
                        <span className="material-symbols-outlined text-[14px]">
                          shield_lock
                        </span>
                        <span>
                          {t(
                            "Circadian-grade security",
                            "Keamanan tingkat sirkadian"
                          )}
                        </span>
                      </div>
                      <span>
                        {t("Better Auth hashed", "Dienkripsi Better Auth")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Wellness Focus Selector */}
                <div className="flex flex-col gap-space-xs mt-space-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      {t("Primary Wellness Focus", "Fokus Kesehatan Utama")}
                    </label>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t(
                        "Select top circadian aim",
                        "Pilih tujuan sirkadian utama"
                      )}
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
                        "Typical 24h Baseline Ribbon",
                        "Garis Dasar Waktu 24 Jam"
                      )}
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary">
                      {t("Configures 24h dial", "Mengatur dial 24 jam")}
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
                        {t("Target Awakening Window", "Target Waktu Bangun")}
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
                        {t("Target Sleep Window", "Target Waktu Tidur")}
                      </label>
                      <input
                        id="sleep-time"
                        type="time"
                        {...register("targetSleepTime")}
                        className="w-full bg-surface-container-lowest text-on-surface font-headline-sm text-headline-sm px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-secondary font-label-sm text-label-sm pt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        info
                      </span>
                      {t(
                        "Calculated sleep allocation:",
                        "Estimasi alokasi tidur:"
                      )}{" "}
                      {sleepAllocationLabel}
                    </span>
                    <span className="font-medium text-primary">
                      {t(
                        "Natural chronotype: Neutral-Morning",
                        "Kronotipe alami: Netral-Pagi"
                      )}
                    </span>
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
                      "I agree to LifeSync's Terms of Service and Privacy Policy, protecting personal biological telemetry with strict sovereign data ownership.",
                      "Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi LifeSync yang melindungi telemetri biologis pribadi dengan kepemilikan data penuh."
                    )}
                  </label>
                </div>

                <div className="flex flex-col gap-space-xs pt-space-xs">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-primary-container active:scale-[0.99] text-on-primary font-label-lg text-label-lg py-3.5 px-space-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-space-xs group disabled:opacity-60"
                  >
                    <span>
                      {isSubmitting
                        ? t("Creating Account...", "Membuat Akun...")
                        : t(
                            "Create Account & Configure 24h Rhythm",
                            "Buat Akun & Atur Ritme 24 Jam"
                          )}
                    </span>
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </button>

                  <div className="flex items-center justify-center gap-space-xs font-label-md text-label-md text-on-surface-variant mt-space-xs">
                    <span>
                      {t("Already registered?", "Sudah punya akun?")}
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
