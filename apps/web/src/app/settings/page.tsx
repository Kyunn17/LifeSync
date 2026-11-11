"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n";

interface UserWithProfileResponse {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  banned: boolean;
  createdAt: string;
  profile: {
    id: string;
    userId: string;
    bio: string | null;
    primaryFocus: string;
    targetWakeTime: string;
    targetSleepTime: string;
    dailyWaterGoalMl: number;
    dailyStepsGoal: number;
    dailySleepGoalMinutes: number;
    dailyExerciseGoalMinutes: number;
    timezone: string;
    notificationsEnabled: boolean;
  };
}

const FOCUS_PILLARS = [
  {
    id: "Optimal Sleep & Recovery",
    en: "Optimal Sleep & Recovery",
    idLabel: "Tidur & Pemulihan Optimal",
  },
  {
    id: "Deep Cognitive Work & Focus",
    en: "Deep Cognitive Work & Focus",
    idLabel: "Kerja Fokus & Kognitif Mendalam",
  },
  {
    id: "Metabolic Fitness & Movement",
    en: "Metabolic Fitness & Movement",
    idLabel: "Kebugaran Metabolik & Olahraga",
  },
  {
    id: "Stress Reduction & Mindfulness",
    en: "Stress Reduction & Mindfulness",
    idLabel: "Reduksi Stres & Kesadaran Penuh",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { lang, setLang, locale, t } = useLanguage();
  const [userData, setUserData] = useState<UserWithProfileResponse | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete Account States
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const trimmed = deleteConfirmText.trim().toUpperCase();
    if (trimmed !== "DELETE" && trimmed !== "HAPUS") {
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "DELETE",
      });
      if (!res.success) {
        setDeleteError(
          res.error?.message ||
            t("Failed to delete account.", "Gagal menghapus akun.")
        );
        setIsDeleting(false);
        return;
      }
      await signOut();
      router.replace("/login?deleted=true");
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t(
              "An error occurred while deleting your account.",
              "Terjadi kesalahan saat menghapus akun Anda."
            )
      );
      setIsDeleting(false);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      bio: "",
      primaryFocus: "Optimal Sleep & Recovery",
      targetWakeTime: "06:45",
      targetSleepTime: "22:30",
      dailyWaterGoalMl: 2500,
      dailyStepsGoal: 10000,
      dailySleepGoalMinutes: 480,
      dailyExerciseGoalMinutes: 45,
      timezone: "UTC",
      notificationsEnabled: true,
    },
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<UserWithProfileResponse>("/api/users/me");
      if (res.success && res.data) {
        setUserData(res.data);
        reset({
          name: res.data.name,
          bio: res.data.profile.bio ?? "",
          primaryFocus: res.data.profile.primaryFocus,
          targetWakeTime: res.data.profile.targetWakeTime,
          targetSleepTime: res.data.profile.targetSleepTime,
          dailyWaterGoalMl: res.data.profile.dailyWaterGoalMl,
          dailyStepsGoal: res.data.profile.dailyStepsGoal,
          dailySleepGoalMinutes: res.data.profile.dailySleepGoalMinutes,
          dailyExerciseGoalMinutes: res.data.profile.dailyExerciseGoalMinutes,
          timezone: res.data.profile.timezone,
          notificationsEnabled: res.data.profile.notificationsEnabled,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onSubmit = async (values: UpdateProfileInput) => {
    setSavedMessage(null);
    setErrorMessage(null);

    const res = await apiFetch<UserWithProfileResponse>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(values),
    });

    if (!res.success) {
      setErrorMessage(
        res.error?.message ||
          t("Failed to update settings.", "Gagal memperbarui pengaturan.")
      );
      return;
    }

    if (res.data) {
      setUserData(res.data);
    }
    setSavedMessage(
      t(
        "Your circadian profile, daily goals, and preferences have been updated.",
        "Profil sirkadian, target harian, dan preferensi Anda berhasil diperbarui."
      )
    );
    setTimeout(() => setSavedMessage(null), 4000);
  };

  const selectedFocus = watch("primaryFocus");
  const sleepMins = watch("dailySleepGoalMinutes") ?? 480;

  const translateFocusLabel = (focusId: string) => {
    const found = FOCUS_PILLARS.find((p) => p.id === focusId);
    if (!found) return focusId;
    return t(found.en, found.idLabel);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-8 w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 border-b border-surface-container-high/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                {t("Personal Calibration", "Kalibrasi Personal")}
              </span>
              <span className="font-label-sm text-label-sm text-secondary">
                • {t("Role", "Peran")}: {userData?.role ?? "USER"}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mt-1">
              {t(
                "Profile & Account Settings",
                "Profil & Pengaturan Akun"
              )}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5">
              {t(
                "Customize your personal information, circadian wake/sleep anchors, daily biometric targets, and language preferences.",
                "Sesuaikan informasi pribadi, jadwal bangun/tidur sirkadian, target biometrik harian, dan preferensi bahasa Anda."
              )}
            </p>
          </div>
        </div>

        {savedMessage && (
          <div className="rounded-2xl bg-secondary-container px-5 py-3.5 text-on-secondary-container font-label-md text-label-md flex items-center gap-2.5 shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-primary">
              check_circle
            </span>
            <span>{savedMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl bg-error-container px-5 py-3.5 text-on-error-container font-label-md text-label-md flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-error">
              error
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 h-72 rounded-3xl bg-surface-container-lowest animate-pulse" />
            <div className="lg:col-span-8 h-96 rounded-3xl bg-surface-container-lowest animate-pulse" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Account Summary Card */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary-container flex items-center justify-center font-headline-md text-headline-md font-bold text-primary">
                    {(userData?.name || "LS")
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {userData?.name}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {userData?.email}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {userData?.role} {t("Account", "Akun")}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-container-low space-y-3 font-body-sm text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      {t("Primary Focus", "Fokus Utama")}
                    </span>
                    <span className="font-semibold text-primary">
                      {translateFocusLabel(selectedFocus ?? "")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      {t("Target Sleep Goal", "Target Durasi Tidur")}
                    </span>
                    <span className="font-semibold text-on-surface">
                      {(sleepMins / 60).toFixed(1)}{" "}
                      {t("hrs / night", "jam / malam")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      {t("Member Since", "Terdaftar Sejak")}
                    </span>
                    <span className="font-medium text-on-surface">
                      {userData?.createdAt
                        ? new Intl.DateTimeFormat(locale, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(userData.createdAt))
                        : t("Active", "Aktif")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy & Security Assurance Card */}
              <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    verified_user
                  </span>
                  <h3 className="font-label-lg text-label-lg font-bold">
                    {t(
                      "Data Ownership & Isolation",
                      "Kepemilikan & Isolasi Data"
                    )}
                  </h3>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {t(
                    "Your 24-hour schedules, daily reflections, and wellness logs are strictly isolated to your personal account and protected by server-side ownership checks.",
                    "Jadwal 24 jam, refleksi harian, dan catatan kesehatan Anda terisolasi sepenuhnya pada akun pribadi Anda serta dilindungi pemeriksaan kepemilikan di sisi server."
                  )}
                </p>
              </div>
            </div>

            {/* Right Column: Editable Profile & Goals Form */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Section 1: Personal Information */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    badge
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t("Personal Information", "Informasi Pribadi")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t("Full Name", "Nama Lengkap")}
                    </label>
                    <input
                      type="text"
                      {...register("name")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary transition-all"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-error">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t(
                        "Email Address (Verified)",
                        "Alamat Email (Terverifikasi)"
                      )}
                    </label>
                    <input
                      type="email"
                      value={userData?.email ?? ""}
                      disabled
                      className="w-full rounded-xl bg-surface-container-high/50 px-4 py-2.5 font-body-md text-body-md text-on-surface-variant cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                    {t(
                      "Personal Bio & Lifestyle Intention",
                      "Bio Pribadi & Intensi Gaya Hidup"
                    )}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={t(
                      "e.g., Building sustainable deep-work habits while prioritizing 8h restorative sleep...",
                      "mis., Membangun kebiasaan kerja fokus sembari memprioritaskan tidur restoratif 8 jam..."
                    )}
                    {...register("bio")}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm text-on-surface outline-none border border-transparent focus:border-primary transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-2">
                    {t(
                      "Primary Wellness Focus Pillar",
                      "Pilar Fokus Kesehatan Utama"
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FOCUS_PILLARS.map((pillar) => {
                      const active = selectedFocus === pillar.id;
                      return (
                        <button
                          key={pillar.id}
                          type="button"
                          onClick={() => setValue("primaryFocus", pillar.id)}
                          className={`p-3 rounded-xl text-left font-label-md text-label-md transition-all flex items-center justify-between ${
                            active
                              ? "bg-secondary-container text-primary font-bold shadow-xs"
                              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <span>{t(pillar.en, pillar.idLabel)}</span>
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
              </div>

              {/* Section 2: Circadian Rhythm & Biometric Targets */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    schedule
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t(
                      "Circadian Anchors & Daily Targets",
                      "Jangkar Sirkadian & Target Harian"
                    )}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t("Target Wake-Up Time", "Target Waktu Bangun")}
                    </label>
                    <input
                      type="time"
                      {...register("targetWakeTime")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t("Target Sleep Onset Time", "Target Waktu Mulai Tidur")}
                    </label>
                    <input
                      type="time"
                      {...register("targetSleepTime")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface-variant uppercase mb-1.5">
                      {t("Sleep Goal (mins)", "Target Tidur (mnt)")}
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={960}
                      {...register("dailySleepGoalMinutes", {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface-variant uppercase mb-1.5">
                      {t("Exercise Goal (mins)", "Target Olahraga (mnt)")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      {...register("dailyExerciseGoalMinutes", {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface-variant uppercase mb-1.5">
                      {t("Hydration Goal (ml)", "Target Hidrasi (ml)")}
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={10000}
                      step={250}
                      {...register("dailyWaterGoalMl", {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-label-sm text-label-sm font-semibold text-on-surface-variant uppercase mb-1.5">
                      {t("Daily Steps Goal", "Target Langkah Harian")}
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={100000}
                      step={500}
                      {...register("dailyStepsGoal", {
                        valueAsNumber: true,
                      })}
                      className="w-full rounded-xl bg-surface-container-low px-3.5 py-2.5 font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: System Preferences & Language */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    tune
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t(
                      "Language, Preferences & Notifications",
                      "Bahasa, Preferensi & Notifikasi"
                    )}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t("Interface Language", "Bahasa Antarmuka")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLang("en")}
                        className={`py-2.5 px-3 rounded-xl font-label-md text-label-md font-semibold transition-all ${
                          lang === "en"
                            ? "bg-primary-container text-on-primary shadow-xs"
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        🇬🇧 English (EN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang("id")}
                        className={`py-2.5 px-3 rounded-xl font-label-md text-label-md font-semibold transition-all ${
                          lang === "id"
                            ? "bg-primary-container text-on-primary shadow-xs"
                            : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        🇮🇩 Indonesia (ID)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      {t("Timezone", "Zona Waktu")}
                    </label>
                    <input
                      type="text"
                      {...register("timezone")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low cursor-pointer">
                  <div>
                    <div className="font-label-md text-label-md font-semibold text-on-surface">
                      {t(
                        "Circadian Pacing Alerts",
                        "Pengingat Ritme Sirkadian"
                      )}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {t(
                        "Remind before wind-down & hydration windows",
                        "Ingatkan sebelum waktu tidur & jendela hidrasi"
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register("notificationsEnabled")}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                </label>

                <div className="flex justify-end pt-3 border-t border-surface-container-low">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary-container disabled:opacity-50 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      save
                    </span>
                    <span>
                      {isSubmitting
                        ? t("Saving Changes...", "Menyimpan Perubahan...")
                        : t("Save Preferences", "Simpan Preferensi")}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Danger Zone: Account Deletion */}
        <div className="rounded-3xl border border-error/30 bg-surface-container-lowest p-6 sm:p-8 shadow-sm flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-error font-headline-sm text-headline-sm font-bold">
              <span className="material-symbols-outlined text-[24px]">
                warning
              </span>
              <span>{t("Danger Zone", "Zona Berbahaya")}</span>
            </div>
            <p className="font-body-md text-body-md text-secondary">
              {t(
                "Permanently delete your LifeSync account, daily schedules, wellness metrics, and habits history.",
                "Hapus akun LifeSync, seluruh jadwal harian, data kesehatan, dan riwayat kebiasaan Anda secara permanen."
              )}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-error-container/20 border border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-on-surface">
                {t("Delete LifeSync Account", "Hapus Akun LifeSync")}
              </span>
              <span className="font-body-sm text-body-sm text-secondary">
                {t(
                  "Once deleted, all your data will be permanently wiped. This action cannot be reversed.",
                  "Setelah dihapus, seluruh data Anda akan musnah secara permanen. Tindakan ini tidak dapat dibatalkan."
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError(null);
                setDeleteModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md font-bold hover:opacity-90 active:scale-98 transition-all shrink-0 shadow-sm"
            >
              {t("Delete Account", "Hapus Akun")}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-surface-container-high flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[28px]">
                    delete_forever
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t("Delete Account?", "Hapus Akun?")}
                  </h3>
                  <span className="font-label-sm text-label-sm text-error font-semibold uppercase tracking-wider">
                    {t("Irreversible Action", "Tindakan Permanen")}
                  </span>
                </div>
              </div>

              <p className="font-body-md text-body-md text-secondary leading-relaxed">
                {t(
                  "Are you sure you want to delete your LifeSync account? All your 24-hour schedules, wellness logs, and insights will be erased forever.",
                  "Apakah Anda yakin ingin menghapus akun LifeSync Anda? Seluruh jadwal 24 jam, catatan kesehatan, dan wawasan Anda akan dihapus selamanya."
                )}
              </p>

              {deleteError && (
                <div className="p-3.5 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-label-sm font-semibold text-secondary">
                  {t(
                    "Type DELETE to confirm account deletion:",
                    "Ketik DELETE untuk mengonfirmasi penghapusan akun:"
                  )}
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface font-label-md text-label-md font-bold focus:outline-none focus:border-error transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-secondary font-label-md text-label-md font-semibold transition-all"
                >
                  {t("Cancel", "Batal")}
                </button>
                <button
                  type="button"
                  disabled={
                    isDeleting ||
                    (deleteConfirmText.trim().toUpperCase() !== "DELETE" &&
                      deleteConfirmText.trim().toUpperCase() !== "HAPUS")
                  }
                  onClick={handleDeleteAccount}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-error text-on-error font-label-md text-label-md font-bold hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    delete_forever
                  </span>
                  <span>
                    {isDeleting
                      ? t("Deleting...", "Menghapus...")
                      : t("Confirm Delete", "Konfirmasi Hapus")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
