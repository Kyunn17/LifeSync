"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";

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
  "Optimal Sleep & Recovery",
  "Deep Cognitive Work & Focus",
  "Metabolic Fitness & Movement",
  "Stress Reduction & Mindfulness",
];

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserWithProfileResponse | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(res.error?.message || "Failed to update settings.");
      return;
    }

    if (res.data) {
      setUserData(res.data);
    }
    setSavedMessage(
      "Your circadian profile, daily goals, and preferences have been updated."
    );
    setTimeout(() => setSavedMessage(null), 4000);
  };

  const selectedFocus = watch("primaryFocus");
  const sleepMins = watch("dailySleepGoalMinutes") ?? 480;

  return (
    <AppShell>
      <div className="flex flex-col gap-8 w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 border-b border-surface-container-high/60 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Personal Calibration
              </span>
              <span className="font-label-sm text-label-sm text-secondary">
                • Role: {userData?.role ?? "USER"}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mt-1">
              Profile &amp; Account Settings
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-0.5">
              Customize your personal information, circadian wake/sleep anchors,
              daily biometric targets, and system preferences.
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
                      {userData?.role} Account
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-container-low space-y-3 font-body-sm text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Primary Focus</span>
                    <span className="font-semibold text-primary">
                      {selectedFocus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">
                      Target Sleep Goal
                    </span>
                    <span className="font-semibold text-on-surface">
                      {(sleepMins / 60).toFixed(1)} hrs / night
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Member Since</span>
                    <span className="font-medium text-on-surface">
                      {userData?.createdAt
                        ? new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(userData.createdAt))
                        : "Active"}
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
                    Data Ownership &amp; Isolation
                  </h3>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Your 24-hour schedules, daily reflections, and wellness logs
                  are strictly isolated to your personal account and protected
                  by server-side ownership checks.
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
                    Personal Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      Full Name
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
                      Email Address (Verified)
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
                    Personal Bio &amp; Lifestyle Intention
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Building sustainable deep-work habits while prioritizing 8h restorative sleep..."
                    {...register("bio")}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm text-on-surface outline-none border border-transparent focus:border-primary transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md font-semibold text-on-surface mb-2">
                    Primary Wellness Focus Pillar
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FOCUS_PILLARS.map((pillar) => {
                      const active = selectedFocus === pillar;
                      return (
                        <button
                          key={pillar}
                          type="button"
                          onClick={() => setValue("primaryFocus", pillar)}
                          className={`p-3 rounded-xl text-left font-label-md text-label-md transition-all flex items-center justify-between ${
                            active
                              ? "bg-secondary-container text-primary font-bold shadow-xs"
                              : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <span>{pillar}</span>
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
                    Circadian Anchors &amp; Daily Targets
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      Target Wake-Up Time
                    </label>
                    <input
                      type="time"
                      {...register("targetWakeTime")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none border border-transparent focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      Target Sleep Onset Time
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
                      Sleep Goal (mins)
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
                      Exercise Goal (mins)
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
                      Hydration Goal (ml)
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
                      Daily Steps Goal
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

              {/* Section 3: System Preferences */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container-low">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    tune
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Preferences &amp; Notifications
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                      Timezone
                    </label>
                    <input
                      type="text"
                      {...register("timezone")}
                      className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body-md text-body-md text-on-surface outline-none"
                    />
                  </div>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low cursor-pointer mt-2 sm:mt-6">
                    <div>
                      <div className="font-label-md text-label-md font-semibold text-on-surface">
                        Circadian Pacing Alerts
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        Remind before wind-down &amp; hydration windows
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      {...register("notificationsEnabled")}
                      className="w-5 h-5 accent-primary rounded cursor-pointer"
                    />
                  </label>
                </div>

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
                      {isSubmitting ? "Saving Changes..." : "Save Preferences"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
