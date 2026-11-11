"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MoodType } from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface CategoryDistItem {
  categoryId: string;
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  allocatedMinutes: number;
  targetMinutesPerDay: number;
  percentageOfDay: number;
}

interface ScheduleBlockItem {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  crossesMidnight: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string;
    bgColor: string;
    icon: string;
  };
}

interface DailyAnalyticsResponse {
  date: string;
  hasAnyRecord: boolean;
  balanceScore: number;
  goals: {
    dailyWaterGoalMl: number;
    dailyStepsGoal: number;
    dailySleepGoalMinutes: number;
    dailyExerciseGoalMinutes: number;
    targetWakeTime: string;
    targetSleepTime: string;
  };
  schedule: {
    date: string;
    totalMinutesInDay: number;
    allocatedMinutes: number;
    remainingMinutes: number;
    allocatedPercentage: number;
    blocks: ScheduleBlockItem[];
    categoryDistribution: CategoryDistItem[];
  };
  wellness: {
    sleepMinutes: number;
    sleepQuality: number | null;
    exerciseMinutes: number;
    waterIntakeMl: number;
    dailySteps: number;
    mood: MoodType | null;
    energyLevel: number | null;
    restingHeartRate: number | null;
    notes: string | null;
  };
  recentCheckins: Array<{
    id: string;
    date: string;
    mood: MoodType;
    energyLevel: number;
    reflection: string | null;
    createdAt: string;
  }>;
  tips: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
    actionLabel: string | null;
    icon: string;
  }>;
}

type EnergyPreset = "Recharging" | "Steady" | "Vibrant" | "Peak";

const ENERGY_PRESET_MAP: Record<
  EnergyPreset,
  { energyLevel: number; mood: MoodType }
> = {
  Recharging: { energyLevel: 45, mood: "Calm" },
  Steady: { energyLevel: 72, mood: "Steady" },
  Vibrant: { energyLevel: 88, mood: "Vibrant" },
  Peak: { energyLevel: 96, mood: "Motivated" },
};

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDurationMinutes(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t, locale, translateCategory, translateMood } = useLanguage();
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  const [analytics, setAnalytics] = useState<DailyAnalyticsResponse | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [allocationViewMode, setAllocationViewMode] = useState<
    "donut" | "chronological"
  >("donut");
  const [journalFilterSlug, setJournalFilterSlug] = useState<string>("ALL");

  // Evening Reflection / Check-in State
  const [selectedPreset, setSelectedPreset] =
    useState<EnergyPreset>("Vibrant");
  const [reflectionText, setReflectionText] = useState<string>("");
  const [submittingCheckin, setSubmittingCheckin] = useState<boolean>(false);
  const [checkinSavedBanner, setCheckinSavedBanner] = useState<boolean>(false);

  // Relaxing / Focus Breathing Timer
  const [breathingActive, setBreathingActive] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<
    "Inhale" | "Hold" | "Exhale" | "Rest"
  >("Inhale");
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState<number>(60);

  useEffect(() => {
    if (!breathingActive) return;
    const interval = setInterval(() => {
      setBreathingSecondsLeft((sec) => {
        if (sec <= 1) {
          setBreathingActive(false);
          return 60;
        }
        const elapsed = 60 - sec + 1;
        const cyclePos = elapsed % 16;
        if (cyclePos < 4) setBreathingPhase("Inhale");
        else if (cyclePos < 8) setBreathingPhase("Hold");
        else if (cyclePos < 12) setBreathingPhase("Exhale");
        else setBreathingPhase("Rest");
        return sec - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breathingActive]);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("Good morning", "Selamat pagi");
    if (hour < 18) return t("Good afternoon", "Selamat siang");
    return t("Good evening", "Selamat malam");
  }, [t]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<DailyAnalyticsResponse>(
        `/api/analytics/daily?date=${todayIso}`
      );
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [todayIso]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleQuickWater = async () => {
    const res = await apiFetch("/api/water", {
      method: "POST",
      body: JSON.stringify({
        date: todayIso,
        amountMl: 250,
      }),
    });
    if (res.success) {
      await fetchDashboard();
    }
  };

  const handleSaveCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCheckin(true);
    try {
      const mapped = ENERGY_PRESET_MAP[selectedPreset];
      const res = await apiFetch("/api/checkins", {
        method: "POST",
        body: JSON.stringify({
          date: todayIso,
          mood: mapped.mood,
          energyLevel: mapped.energyLevel,
          reflection: reflectionText.trim() || null,
        }),
      });
      if (res.success) {
        setCheckinSavedBanner(true);
        setReflectionText("");
        await fetchDashboard();
        setTimeout(() => setCheckinSavedBanner(false), 4500);
      }
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const firstName = useMemo(() => {
    const full = session?.user?.name || "Explorer";
    return full.split(" ")[0] || "Explorer";
  }, [session?.user?.name]);

  // Compute SVG radial chart circles (circumference = 2 * PI * 90 ≈ 565.48)
  const radialSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 90;
    const dist = (analytics?.schedule.categoryDistribution ?? []).filter(
      (c) => c.allocatedMinutes > 0
    );

    let accumulatedOffset = 0;
    const circles = dist.map((cat) => {
      const fraction = Math.min(1, cat.allocatedMinutes / 1440);
      const arcLength = Number((fraction * circumference).toFixed(2));
      const dashOffset = Number((-accumulatedOffset).toFixed(2));
      accumulatedOffset += arcLength;
      return {
        ...cat,
        arcLength,
        dashOffset,
        circumference: Number(circumference.toFixed(2)),
      };
    });

    const remainingMins = analytics?.schedule.remainingMinutes ?? 1440;
    const remainingArc = Number(
      ((remainingMins / 1440) * circumference).toFixed(2)
    );
    const remainingOffset = Number((-accumulatedOffset).toFixed(2));

    return {
      circles,
      remainingArc,
      remainingOffset,
      circumference: Number(circumference.toFixed(2)),
    };
  }, [analytics]);

  const topSixCategories = useMemo(() => {
    const dist = analytics?.schedule.categoryDistribution ?? [];
    return dist.slice(0, 6);
  }, [analytics]);

  const filteredJournalBlocks = useMemo(() => {
    const blocks = analytics?.schedule.blocks ?? [];
    if (journalFilterSlug === "ALL") return blocks;
    return blocks.filter((b) => b.category.slug === journalFilterSlug);
  }, [analytics, journalFilterSlug]);

  const sleepGoalMins = analytics?.goals.dailySleepGoalMinutes ?? 480;
  const sleepMins = analytics?.wellness.sleepMinutes ?? 0;
  const sleepPct = Math.min(100, Math.round((sleepMins / sleepGoalMins) * 100));

  const exerciseGoalMins = analytics?.goals.dailyExerciseGoalMinutes ?? 45;
  const exerciseMins = analytics?.wellness.exerciseMinutes ?? 0;
  const exercisePct = Math.min(
    100,
    Math.round((exerciseMins / Math.max(15, exerciseGoalMins)) * 100)
  );

  const waterGoalMl = analytics?.goals.dailyWaterGoalMl ?? 2500;
  const waterMl = analytics?.wellness.waterIntakeMl ?? 0;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoalMl) * 100));

  const stepsGoal = analytics?.goals.dailyStepsGoal ?? 10000;
  const stepsCount = analytics?.wellness.dailySteps ?? 0;
  const stepsPct = Math.min(100, Math.round((stepsCount / stepsGoal) * 100));

  const vitalityPulse = analytics?.wellness.energyLevel ?? 82;
  const mindStateLabel = translateMood(
    analytics?.wellness.mood ?? "Calm & Focused"
  );
  const effectiveBalanceScore =
    analytics && analytics.hasAnyRecord ? analytics.balanceScore : 88;

  const currentClockLabel = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  const dailyHabits = useMemo(() => {
    const sleepTarget = analytics?.goals.dailySleepGoalMinutes ?? 420;
    const sleepMinutes = analytics?.wellness.sleepMinutes ?? 0;
    const waterTarget = analytics?.goals.dailyWaterGoalMl ?? 2000;
    const waterIntake = analytics?.wellness.waterIntakeMl ?? 0;
    const stepsTarget = analytics?.goals.dailyStepsGoal ?? 8000;
    const steps = analytics?.wellness.dailySteps ?? 0;
    const exerciseMinutes = analytics?.wellness.exerciseMinutes ?? 0;
    const scheduleCount = analytics?.schedule.blocks.length ?? 0;
    const hasReflected = Boolean(
      analytics?.wellness.mood ||
        (analytics?.recentCheckins && analytics.recentCheckins.length > 0)
    );

    return [
      {
        id: "sleep",
        label: t("Restful Sleep (7+ hrs)", "Tidur Cukup (7+ jam)"),
        done: sleepMinutes >= sleepTarget * 0.9,
        detail: `${Math.round(sleepMinutes / 60)}h / ${Math.round(sleepTarget / 60)}h`,
        icon: "bedtime",
        href: "/wellness",
      },
      {
        id: "water",
        label: t("Daily Hydration Target", "Target Minum Air"),
        done: waterIntake >= waterTarget,
        detail: `${waterIntake} / ${waterTarget} ml`,
        icon: "water_drop",
        href: "/wellness",
      },
      {
        id: "movement",
        label: t("Movement / Exercise", "Aktivitas / Olahraga"),
        done: exerciseMinutes >= 20 || steps >= 5000,
        detail:
          exerciseMinutes > 0
            ? `${exerciseMinutes}m ${t("workout", "olahraga")}`
            : `${steps} ${t("steps", "langkah")}`,
        icon: "directions_run",
        href: "/wellness",
      },
      {
        id: "schedule",
        label: t("Plan 24h Activities", "Susun Jadwal 24 Jam"),
        done: scheduleCount >= 2,
        detail: `${scheduleCount} ${t("blocks planned", "kegiatan dibuat")}`,
        icon: "calendar_today",
        href: "/schedule",
      },
      {
        id: "reflection",
        label: t("Daily Mood & Reflection", "Refleksi Suasana Hati"),
        done: hasReflected,
        detail: hasReflected ? t("Logged", "Tercatat") : t("Pending", "Belum"),
        icon: "mood",
        href: "#mind-reflection",
      },
    ];
  }, [analytics, t]);

  const completedHabitsCount = dailyHabits.filter((h) => h.done).length;

  return (
    <AppShell
      onQuickLogClick={() => router.push("/schedule")}
      balanceScore={effectiveBalanceScore}
    >
      <div className="flex flex-col gap-8 w-full">
        {/* Top Greeting Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                {t("Daily Routine Active", "Rutinitas Harian Aktif")}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {greetingText}, {firstName}
            </h1>
            <p className="font-body-lg text-body-lg text-secondary">
              {t("You have", "Anda memiliki")}{" "}
              <span className="font-semibold text-primary">
                {formatDurationMinutes(
                  analytics?.schedule.remainingMinutes ?? 1440
                )}{" "}
                {t("unallocated", "waktu luang")}
              </span>{" "}
              {t(
                "today. Plan your hours comfortably to keep your day balanced and relaxed.",
                "hari ini. Atur waktu Anda dengan nyaman agar hari tetap seimbang dan teratur."
              )}
            </p>
          </div>

          {/* Pulse Metrics Pill Group */}
          <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest p-2 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low">
              <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  bolt
                </span>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                  {t("Energy Level", "Tingkat Energi")}
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {vitalityPulse}%{" "}
                  <span className="font-label-md text-label-md text-primary font-medium">
                    {vitalityPulse >= 75
                      ? t("Optimal", "Optimal")
                      : t("Steady", "Stabil")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low">
              <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  spa
                </span>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                  {t("Mind State", "Kondisi Pikiran")}
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {mindStateLabel}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("checkin-panel")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              title={t(
                "Record Quick Mood Reflection",
                "Catat Refleksi Suasana Hati Cepat"
              )}
              className="p-3 rounded-xl bg-primary-container text-on-primary hover:opacity-95 transition-all shadow-sm flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">
                edit_note
              </span>
            </button>
          </div>
        </div>

        {/* Insight of the Day Banner */}
        <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
          <div className="flex items-center gap-4 pl-2">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                lightbulb
              </span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold text-primary tracking-wider">
                {t("Insight of the Day", "Wawasan Hari Ini")}
              </span>
              <p className="font-body-md text-body-md text-on-surface mt-0.5 font-medium">
                {analytics?.tips[0]?.content ?? (
                  <>
                    {t(
                      "Having dinner 2-3 hours before bed helps you fall asleep faster and wake up refreshed.",
                      "Makan malam 2-3 jam sebelum tidur membantu Anda tidur lebih cepat dan bangun lebih segar."
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <span className="font-label-md text-label-md text-secondary">
              {analytics?.schedule.blocks.length ?? 0}{" "}
              {t("blocks today", "blok hari ini")}
            </span>
            <Link
              href="/insights"
              className="w-8 h-8 rounded-lg hover:bg-surface-container-highest flex items-center justify-center text-secondary transition-colors"
              title={t(
                "Explore Insights & Patterns",
                "Jelajahi Wawasan & Pola"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Main 2-Column Bento: Allocation Ring + Day Details */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Primary Feature Card: 24-Hour Circular Ring & Detailed Segments */}
          <div className="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-7 flex flex-col gap-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-secondary">
                  {t("Daily Time Allocation", "Alokasi Waktu Harian")}
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  {t(
                    "Today's 24-Hour Allocation",
                    "Alokasi 24 Jam Hari Ini"
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAllocationViewMode("donut")}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                    allocationViewMode === "donut"
                      ? "bg-surface-container-lowest text-on-surface shadow-xs"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  {t("24h Donut", "Donat 24j")}
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationViewMode("chronological")}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                    allocationViewMode === "chronological"
                      ? "bg-surface-container-lowest text-on-surface shadow-xs"
                      : "text-secondary hover:text-on-surface"
                  }`}
                >
                  {t("Chronological", "Kronologis")}
                </button>
              </div>
            </div>

            {allocationViewMode === "donut" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-surface-container-low/40 rounded-2xl p-6">
                {/* Left: SVG Radial Chart */}
                <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg
                      className="w-full h-full -rotate-90 transform"
                      viewBox="0 0 240 240"
                    >
                      <circle
                        cx="120"
                        cy="120"
                        fill="transparent"
                        r="90"
                        stroke="#e5eeff"
                        strokeWidth="22"
                      />
                      {radialSegments.circles.map((seg) => (
                        <circle
                          key={seg.categoryId}
                          cx="120"
                          cy="120"
                          fill="transparent"
                          r="90"
                          stroke={seg.color}
                          strokeDasharray={`${seg.arcLength} ${seg.circumference}`}
                          strokeDashoffset={seg.dashOffset}
                          strokeWidth="22"
                          className="hover:opacity-90 cursor-pointer transition-all"
                        >
                          <title>
                            {translateCategory(seg.name)}:{" "}
                            {formatDurationMinutes(seg.allocatedMinutes)} (
                            {seg.percentageOfDay}%)
                          </title>
                        </circle>
                      ))}
                      {radialSegments.remainingArc > 0 && (
                        <circle
                          cx="120"
                          cy="120"
                          fill="transparent"
                          r="90"
                          stroke="#d9e3f4"
                          strokeDasharray="2 3"
                          strokeDashoffset={radialSegments.remainingOffset}
                          strokeWidth="22"
                        />
                      )}
                    </svg>

                    {/* Center Hub */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                        {t("Assigned", "Terjadwal")}
                      </span>
                      <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                        {formatDurationMinutes(
                          analytics?.schedule.allocatedMinutes ?? 0
                        )}
                      </span>
                      <span className="font-label-md text-label-md text-primary font-semibold">
                        {formatDurationMinutes(
                          analytics?.schedule.remainingMinutes ?? 1440
                        )}{" "}
                        {t("Free", "Kosong")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Key Breakdown List */}
                <div className="md:col-span-7 flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-on-surface">
                    {topSixCategories.map((cat) => (
                      <div
                        key={cat.categoryId}
                        className="p-3 bg-surface-container-lowest rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div>
                            <div className="font-label-md text-label-md font-semibold">
                              {translateCategory(cat.name)}
                            </div>
                            <div className="font-body-sm text-body-sm text-secondary">
                              {formatDurationMinutes(cat.allocatedMinutes)}
                            </div>
                          </div>
                        </div>
                        <span className="font-label-sm text-label-sm font-bold text-primary">
                          {cat.percentageOfDay}%
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Unallocated Notice */}
                  <div className="p-3 bg-surface-container-high rounded-xl flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        hourglass_empty
                      </span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        {t("Open Buffer Capacity", "Kapasitas Waktu Luang")}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm font-bold text-primary">
                      {formatDurationMinutes(
                        analytics?.schedule.remainingMinutes ?? 1440
                      )}{" "}
                      {t("Unallocated", "Belum Terjadwal")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low/40 rounded-2xl p-6 space-y-2.5 max-h-80 overflow-y-auto">
                {(analytics?.schedule.blocks ?? []).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                      {t(
                        "No blocks scheduled for today yet",
                        "Belum ada blok terjadwal untuk hari ini"
                      )}
                    </p>
                    <p className="font-body-sm text-body-sm text-secondary mt-1">
                      {t(
                        "Open the 24-Hour Schedule planner to allocate your time.",
                        "Buka perencana Jadwal 24 Jam untuk mengalokasikan waktu Anda."
                      )}
                    </p>
                  </div>
                ) : (
                  analytics?.schedule.blocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-surface-container-lowest flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: b.category.color }}
                        />
                        <div>
                          <div className="font-label-md text-label-md font-semibold text-on-surface">
                            {b.title}
                          </div>
                          <div className="font-body-sm text-body-sm text-secondary">
                            {b.startTime} – {b.endTime} •{" "}
                            {translateCategory(b.category.name)}
                          </div>
                        </div>
                      </div>
                      <span className="font-label-md text-label-md font-bold text-primary">
                        {formatDurationMinutes(b.durationMinutes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Linear Timeline Scrubber */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-between items-center text-secondary font-label-sm text-label-sm">
                <span>{t("00:00 (Midnight)", "00:00 (Tengah Malam)")}</span>
                <span>{t("06:00 (Wake)", "06:00 (Bangun)")}</span>
                <span>{t("12:00 (Noon)", "12:00 (Siang)")}</span>
                <span>{t("18:00 (Evening)", "18:00 (Petang)")}</span>
                <span>23:59</span>
              </div>

              <div
                onClick={() => router.push("/schedule")}
                className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container-highest cursor-pointer shadow-inner"
                title={t(
                  "Click to adjust 24-hour schedule blocks",
                  "Klik untuk mengatur blok jadwal 24 jam"
                )}
              >
                {(analytics?.schedule.blocks ?? []).length === 0 ? (
                  <div className="w-full h-full bg-surface-container-high" />
                ) : (
                  analytics?.schedule.blocks.map((b) => (
                    <div
                      key={`bar_${b.id}`}
                      style={{
                        width: `${Math.max(2, (b.durationMinutes / 1440) * 100)}%`,
                        backgroundColor: b.category.color,
                      }}
                      title={`${b.title}: ${b.startTime} - ${b.endTime}`}
                      className="h-full hover:brightness-110 transition-all border-r border-white/20"
                    />
                  ))
                )}
              </div>

              <div className="flex items-center justify-between text-secondary pt-1 font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {t(
                    `Current time marker at ${currentClockLabel}`,
                    `Penanda waktu saat ini pukul ${currentClockLabel}`
                  )}
                </span>
                <Link
                  href="/schedule"
                  className="font-label-md text-label-md text-primary hover:underline font-semibold"
                >
                  {t("Adjust Schedule Blocks →", "Atur Blok Jadwal →")}
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Daily Habits Checklist & Interactive Breathing Timer */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Daily Habit Goals & Streak Card */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-secondary">
                    {t("Daily Habits", "Kebiasaan Harian")}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {t("Today's Progress", "Kemajuan Hari Ini")}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-container rounded-full text-primary font-label-sm text-label-sm font-bold shadow-2xs">
                  <span>🔥</span>
                  <span>
                    5 {t("Day Streak", "Hari Beruntun")}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between font-label-sm text-label-sm mb-1.5">
                  <span className="text-secondary font-medium">
                    {completedHabitsCount} {t("of", "dari")} {dailyHabits.length}{" "}
                    {t("habits completed", "kebiasaan selesai")}
                  </span>
                  <span className="text-primary font-bold">
                    {Math.round((completedHabitsCount / dailyHabits.length) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-low overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${(completedHabitsCount / dailyHabits.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Habit Items */}
              <div className="flex flex-col gap-2.5">
                {dailyHabits.map((habit) => (
                  <Link
                    key={habit.id}
                    href={habit.href}
                    className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          habit.done ? "text-primary" : "text-outline"
                        }`}
                      >
                        {habit.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                      <div className="flex flex-col">
                        <span
                          className={`font-label-md text-label-md font-semibold ${
                            habit.done
                              ? "text-on-surface line-through decoration-secondary/50"
                              : "text-on-surface"
                          }`}
                        >
                          {habit.label}
                        </span>
                        <span className="font-body-sm text-body-sm text-secondary">
                          {habit.detail}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Interactive Relaxation & Focus Breathing Timer Card */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col gap-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-secondary">
                    {t("Mindfulness & Calm", "Ketenangan & Fokus")}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {t("Box Breathing Timer", "Timer Pernapasan Kotak")}
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">
                    self_improvement
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4 bg-surface-container-low rounded-2xl gap-3">
                {/* Animated Breathing Circle */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full bg-primary/15 transition-all duration-1000 ${
                      breathingActive && breathingPhase === "Inhale"
                        ? "scale-110 bg-primary/25"
                        : breathingActive && breathingPhase === "Exhale"
                        ? "scale-75 bg-primary/10"
                        : "scale-95"
                    }`}
                  />
                  <div
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center bg-surface-container-lowest shadow-sm z-10 transition-all duration-700 ${
                      breathingActive ? "border-2 border-primary" : ""
                    }`}
                  >
                    <span className="font-headline-md text-headline-md font-bold text-on-surface">
                      00:{String(breathingSecondsLeft).padStart(2, "0")}
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <span className="font-label-lg text-label-lg font-bold text-primary block">
                    {breathingActive
                      ? breathingPhase === "Inhale"
                        ? t("Breathe In (4s)", "Tarik Napas (4d)")
                        : breathingPhase === "Hold"
                        ? t("Hold Breath (4s)", "Tahan Tenang (4d)")
                        : breathingPhase === "Exhale"
                        ? t("Breathe Out (4s)", "Hembuskan Perlahan (4d)")
                        : t("Relax & Rest (4s)", "Istirahat Santai (4d)")
                      : t("1-Minute Reset", "Relaksasi 1 Menit")}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    {t(
                      "4s Inhale · 4s Hold · 4s Exhale · 4s Rest",
                      "4d Tarik · 4d Tahan · 4d Hembus · 4d Santai"
                    )}
                  </span>
                </div>
              </div>

              {/* Breathing Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBreathingActive((a) => !a)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {breathingActive ? "pause" : "play_arrow"}
                  </span>
                  <span>
                    {breathingActive
                      ? t("Pause", "Jeda")
                      : t("Start Breathing", "Mulai Bernapas")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBreathingActive(false);
                    setBreathingSecondsLeft(60);
                    setBreathingPhase("Inhale");
                  }}
                  className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-secondary transition-all"
                  title={t("Reset Timer", "Reset Timer")}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    replay
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Health & Wellness Quick Cards Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-secondary">
                {t("Daily Overview", "Ringkasan Harian")}
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                {t("Today's Health & Habits", "Kesehatan & Kebiasaan Hari Ini")}
              </h2>
            </div>
            <Link
              href="/wellness"
              className="font-label-md text-label-md text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <span>{t("View Details", "Lihat Detail")}</span>
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sleep Card */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    dark_mode
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                  {analytics?.wellness.sleepQuality ?? 90}%{" "}
                  {t("Quality", "Kualitas")}
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {t("Sleep Duration", "Durasi Tidur")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {formatDurationMinutes(sleepMins)}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {formatDurationMinutes(sleepGoalMins)}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  {t("Wake target", "Target bangun")}{" "}
                  {analytics?.goals.targetWakeTime || "06:30"}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${sleepPct}%` }}
                  />
                </div>
                <span className="font-label-sm text-label-sm text-primary font-semibold text-right">
                  {t(
                    `Target ${sleepPct}% completed`,
                    `Target ${sleepPct}% tercapai`
                  )}
                </span>
              </div>
            </div>

            {/* Exercise Card */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    directions_run
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm font-bold">
                  {exercisePct >= 100
                    ? t("Met Target", "Target Tercapai")
                    : `${exercisePct}% ${t("Goal", "Target")}`}
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {t("Physical Exertion", "Aktivitas Fisik")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {exerciseMins} {t("min", "mnt")}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {exerciseGoalMins}m {t("goal", "target")}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  {t(
                    "Zone 2 aerobic & mobility tracking",
                    "Pelacakan aerobik Zona 2 & mobilitas"
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-300"
                    style={{ width: `${exercisePct}%` }}
                  />
                </div>
                <span className="font-label-sm text-label-sm text-primary font-semibold text-right">
                  ~{Math.round(exerciseMins * 7.5)}{" "}
                  {t("active kcal burned", "kkal aktif terbakar")}
                </span>
              </div>
            </div>

            {/* Hydration Card with +250ml Button */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    water_drop
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-bold">
                  {waterPct}% {t("Goal", "Target")}
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {t("Daily Hydration", "Hidrasi Harian")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {waterMl.toLocaleString()}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {waterGoalMl.toLocaleString()} ml
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  {Math.max(0, waterGoalMl - waterMl).toLocaleString()} ml{" "}
                  {t("remaining today", "tersisa hari ini")}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden flex-1">
                  <div
                    className="bg-primary-container h-full rounded-full transition-all duration-300"
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickWater}
                  title={t("Log one cup (+250ml)", "Catat satu gelas (+250ml)")}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-secondary-container text-primary font-label-sm text-label-sm font-bold transition-all flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    add
                  </span>
                  250ml
                </button>
              </div>
            </div>

            {/* Daily Steps & Mobility */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    footprint
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-bold">
                  {stepsPct}% {t("of Goal", "dari Target")}
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  {t("Active Footfall", "Langkah Harian")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {stepsCount.toLocaleString()}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {stepsGoal.toLocaleString()} {t("steps", "langkah")}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  ~{(stepsCount * 0.0007).toFixed(1)}{" "}
                  {t("km covered today", "km ditempuh hari ini")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-full bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${stepsPct}%` }}
                  />
                </div>
                <span className="font-label-sm text-label-sm text-secondary font-semibold text-right">
                  {Math.max(0, stepsGoal - stepsCount).toLocaleString()}{" "}
                  {t("steps to milestone", "langkah menuju target")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Asymmetric Split: Activity Feed & Evening Reflection Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Recent Logged Activities list (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-7 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                  {t("Activity Journal", "Jurnal Aktivitas")}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {t("Recent Logs Today", "Catatan Terbaru Hari Ini")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={journalFilterSlug}
                  onChange={(e) => setJournalFilterSlug(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-semibold transition-all outline-none"
                >
                  <option value="ALL">
                    {t("All Categories", "Semua Kategori")}
                  </option>
                  {(analytics?.schedule.categoryDistribution ?? []).map((c) => (
                    <option key={c.categoryId} value={c.slug}>
                      {translateCategory(c.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl bg-surface-container-low animate-pulse"
                  />
                ))}
              </div>
            ) : filteredJournalBlocks.length === 0 ? (
              <div className="p-8 rounded-2xl bg-surface-container-low/50 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[28px] text-primary">
                  event_note
                </span>
                <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                  {t(
                    "No Scheduled Activities Logged Today",
                    "Belum Ada Aktivitas Terjadwal Hari Ini"
                  )}
                </p>
                <p className="font-body-sm text-body-sm text-secondary max-w-md">
                  {t(
                    "Plan your 24-hour day into sleep, deep work, exercise, meals, and personal time to see your activity feed here.",
                    "Rencanakan 24 jam Anda ke dalam tidur, kerja fokus, olahraga, makan, dan waktu pribadi untuk melihat riwayat aktivitas di sini."
                  )}
                </p>
                <Link
                  href="/schedule"
                  className="mt-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold"
                >
                  {t("Open Daily Schedule", "Buka Jadwal Harian")}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredJournalBlocks.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface-container-low/50 hover:bg-surface-container-low transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs">
                        <span className="material-symbols-outlined text-[20px]">
                          {item.category.icon || "schedule"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-label-lg text-label-lg text-on-surface font-semibold">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-secondary font-body-sm text-body-sm">
                          <span>
                            {item.startTime} – {item.endTime}
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                            {translateCategory(item.category.name)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="font-label-md text-label-md text-primary font-bold">
                      {formatDurationMinutes(item.durationMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Reflection / Evening Check-in Inline Panel (5 cols) */}
          <div
            id="checkin-panel"
            className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-7 shadow-sm flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                  {t("Mindful Rhythm", "Ritme Berkesadaran")}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {t("Evening Reflection", "Refleksi Harian")}
                </h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  nature_people
                </span>
              </div>
            </div>

            <p className="font-body-md text-body-md text-secondary">
              {t(
                "Take 60 seconds to lock in your daily qualitative data. Regular check-ins cultivate acute awareness of what fuels your cognitive energy.",
                "Luangkan 60 detik untuk mencatat refleksi harian Anda. Check-in rutin membangun kesadaran tentang apa yang mendukung energi kognitif Anda."
              )}
            </p>

            <form onSubmit={handleSaveCheckin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-semibold text-on-surface">
                  {t("Subjective Energy Today", "Energi Subjektif Hari Ini")}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    ["Recharging", "Steady", "Vibrant", "Peak"] as EnergyPreset[]
                  ).map((preset) => {
                    const active = selectedPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSelectedPreset(preset)}
                        className={`py-2 px-1 rounded-xl font-label-sm text-label-sm font-semibold transition-all ${
                          active
                            ? "bg-primary-container text-on-primary shadow-xs"
                            : "bg-surface-container-low text-secondary hover:bg-secondary-container hover:text-primary"
                        }`}
                      >
                        {translateMood(preset)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="mind-reflection"
                  className="font-label-md text-label-md font-semibold text-on-surface"
                >
                  {t(
                    "What gave you the strongest flow?",
                    "Apa yang memberikan fokus terbaik hari ini?"
                  )}
                </label>
                <textarea
                  id="mind-reflection"
                  rows={3}
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder={t(
                    "Writing creative copy uninterrupted before lunch...",
                    "Menyelesaikan pekerjaan fokus tanpa gangguan sebelum makan siang..."
                  )}
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingCheckin}
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {submittingCheckin
                    ? t("Saving...", "Menyimpan...")
                    : t("Save Entry", "Simpan Catatan")}
                </button>
              </div>

              {checkinSavedBanner && (
                <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    check_circle
                  </span>
                  <span>
                    {t(
                      "Reflection saved. Your daily mood and energy level have been updated.",
                      "Refleksi tersimpan. Suasana hati dan tingkat energi harian Anda telah diperbarui."
                    )}
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
