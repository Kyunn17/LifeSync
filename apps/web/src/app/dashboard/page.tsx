"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MoodType } from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";

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

function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
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
  const [syncSleepPrediction, setSyncSleepPrediction] =
    useState<boolean>(true);
  const [submittingCheckin, setSubmittingCheckin] = useState<boolean>(false);
  const [checkinSavedBanner, setCheckinSavedBanner] = useState<boolean>(false);
  const [telemetryToast, setTelemetryToast] = useState<string | null>(null);

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
          syncSleepPrediction,
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
  const mindStateLabel = analytics?.wellness.mood ?? "Calm & Focused";
  const effectiveBalanceScore =
    analytics && analytics.hasAnyRecord ? analytics.balanceScore : 88;

  const currentClockLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  return (
    <AppShell
      onQuickLogClick={() => router.push("/schedule")}
      balanceScore={effectiveBalanceScore}
    >
      <div className="flex flex-col gap-8 w-full">
        {/* Top Greeting & Biometric Pulse Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                Circadian Sync active
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
              {getGreetingByHour()}, {firstName}
            </h1>
            <p className="font-body-lg text-body-lg text-secondary">
              You have{" "}
              <span className="font-semibold text-primary">
                {formatDurationMinutes(
                  analytics?.schedule.remainingMinutes ?? 1440
                )}{" "}
                unallocated
              </span>{" "}
              today. Your circadian cycle indicates optimum mental clarity
              through early afternoon.
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
                  Vitality Pulse
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface">
                  {vitalityPulse}%{" "}
                  <span className="font-label-md text-label-md text-primary font-medium">
                    {vitalityPulse >= 75 ? "Optimal" : "Steady"}
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
                  Mind State
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
              title="Record Quick Mood Reflection"
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
                Insight of the Day
              </span>
              <p className="font-body-md text-body-md text-on-surface mt-0.5 font-medium">
                {analytics?.tips[0]?.content ?? (
                  <>
                    You register{" "}
                    <span className="font-semibold text-primary">
                      deeper REM &amp; Stage 3 restorative sleep
                    </span>{" "}
                    on consecutive days when evening meals conclude before 7:30
                    PM.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <span className="font-label-md text-label-md text-secondary">
              {analytics?.schedule.blocks.length ?? 0} blocks today
            </span>
            <Link
              href="/insights"
              className="w-8 h-8 rounded-lg hover:bg-surface-container-highest flex items-center justify-center text-secondary transition-colors"
              title="Explore Insights & Patterns"
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
                  Stewardship Architecture
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Today&apos;s 24-Hour Allocation
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
                  24h Donut
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
                  Chronological
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
                            {seg.name}:{" "}
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
                        Assigned
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
                        Free
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
                              {cat.name}
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
                        Open Buffer Capacity
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm font-bold text-primary">
                      {formatDurationMinutes(
                        analytics?.schedule.remainingMinutes ?? 1440
                      )}{" "}
                      Unallocated
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low/40 rounded-2xl p-6 space-y-2.5 max-h-80 overflow-y-auto">
                {(analytics?.schedule.blocks ?? []).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                      No blocks scheduled for today yet
                    </p>
                    <p className="font-body-sm text-body-sm text-secondary mt-1">
                      Open the 24-Hour Schedule planner to allocate your time.
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
                            {b.startTime} – {b.endTime} • {b.category.name}
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
                <span>00:00 (Midnight)</span>
                <span>06:00 (Wake)</span>
                <span>12:00 (Noon)</span>
                <span>18:00 (Evening)</span>
                <span>23:59</span>
              </div>

              <div
                onClick={() => router.push("/schedule")}
                className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container-highest cursor-pointer shadow-inner"
                title="Click to adjust 24-hour schedule blocks"
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
                  Current time marker at {currentClockLabel}
                </span>
                <Link
                  href="/schedule"
                  className="font-label-md text-label-md text-primary hover:underline font-semibold"
                >
                  Adjust Schedule Blocks →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mood / Wellness Snapshot */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            {/* Circadian State Card */}
            <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary via-primary-container to-secondary flex items-end p-6">
                <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1 rounded-full text-primary font-label-sm text-label-sm font-bold shadow-xs">
                  Natural Daylight Cycle
                </div>
                <div className="text-on-primary">
                  <span className="material-symbols-outlined text-[36px] text-primary-fixed">
                    wb_sunny
                  </span>
                  <p className="font-label-md text-label-md text-primary-fixed uppercase tracking-wider mt-1">
                    Biophilic Equilibrium
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    Circadian State
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm font-bold">
                    Synchronized
                  </span>
                </div>
                <p className="font-body-md text-body-md text-secondary">
                  Scheduling a 15-minute outdoor daylight walk between deep
                  focus blocks preserves evening melatonin onset.
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-surface-container-low">
                  <span className="font-label-md text-label-md text-on-surface font-medium">
                    Target Sleep Onset
                  </span>
                  <span className="font-label-md text-label-md text-primary font-bold">
                    {analytics?.goals.targetSleepTime || "22:30"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Telemetry Tile */}
            <div className="bg-surface-container-low rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Quick Telemetry
                </h3>
                <span className="material-symbols-outlined text-secondary">
                  sensors
                </span>
              </div>

              {telemetryToast && (
                <div className="px-3 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                  {telemetryToast}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryToast("Caffeine cutoff reminder active (14:00)");
                    setTimeout(() => setTelemetryToast(null), 3000);
                  }}
                  className="flex flex-col gap-1 p-3.5 bg-surface-container-lowest rounded-2xl hover:bg-surface-container-high transition-all text-left shadow-xs"
                >
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    coffee
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">
                    Caffeine
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    Cutoff: 2:00 PM
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTelemetryToast("5-minute box breathing timer started");
                    setTimeout(() => setTelemetryToast(null), 3000);
                  }}
                  className="flex flex-col gap-1 p-3.5 bg-surface-container-lowest rounded-2xl hover:bg-surface-container-high transition-all text-left shadow-xs"
                >
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    self_improvement
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">
                    Breathing
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    5 min box cycle
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/schedule")}
                  className="flex flex-col gap-1 p-3.5 bg-surface-container-lowest rounded-2xl hover:bg-surface-container-high transition-all text-left shadow-xs"
                >
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    bedtime
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">
                    Wind Down
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    Set {analytics?.goals.targetSleepTime || "22:30"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/wellness")}
                  className="flex flex-col gap-1 p-3.5 bg-surface-container-lowest rounded-2xl hover:bg-surface-container-high transition-all text-left shadow-xs"
                >
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    heart_check
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold mt-1">
                    HRV Sync
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    {analytics?.wellness.restingHeartRate ?? 58} bpm resting
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Health & Wellness Quick Cards Grid (Core Biometrics) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase font-bold tracking-wider text-secondary">
                Real-Time Telemetry
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Core Biometrics
              </h2>
            </div>
            <Link
              href="/wellness"
              className="font-label-md text-label-md text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <span>Detailed Vitals</span>
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
                  {analytics?.wellness.sleepQuality ?? 90}% Quality
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  Sleep Duration
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
                  Wake target {analytics?.goals.targetWakeTime || "06:30"}
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
                  Target {sleepPct}% completed
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
                  {exercisePct >= 100 ? "Met Target" : `${exercisePct}% Goal`}
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  Physical Exertion
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {exerciseMins} min
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {exerciseGoalMins}m goal
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  Zone 2 aerobic &amp; mobility tracking
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
                  ~{Math.round(exerciseMins * 7.5)} active kcal burned
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
                  {waterPct}% Goal
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  Daily Hydration
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
                  {Math.max(0, waterGoalMl - waterMl).toLocaleString()} ml
                  remaining today
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
                  title="Log one cup (+250ml)"
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
                  {stepsPct}% of Goal
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                  Active Footfall
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                    {stepsCount.toLocaleString()}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    / {stepsGoal.toLocaleString()} steps
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-secondary mt-1">
                  ~{(stepsCount * 0.0007).toFixed(1)} km covered today
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
                  {Math.max(0, stepsGoal - stepsCount).toLocaleString()} steps
                  to milestone
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
                  Activity Journal
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Recent Logs Today
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={journalFilterSlug}
                  onChange={(e) => setJournalFilterSlug(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-semibold transition-all outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {(analytics?.schedule.categoryDistribution ?? []).map((c) => (
                    <option key={c.categoryId} value={c.slug}>
                      {c.name}
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
                  No Scheduled Activities Logged Today
                </p>
                <p className="font-body-sm text-body-sm text-secondary max-w-md">
                  Plan your 24-hour day into sleep, deep work, exercise, meals,
                  and personal time to see your activity feed here.
                </p>
                <Link
                  href="/schedule"
                  className="mt-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold"
                >
                  Open Daily Schedule
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
                            {item.category.name}
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
                  Mindful Rhythm
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Evening Reflection
                </h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  nature_people
                </span>
              </div>
            </div>

            <p className="font-body-md text-body-md text-secondary">
              Take 60 seconds to lock in your daily qualitative data. Regular
              check-ins cultivate acute awareness of what fuels your cognitive
              energy.
            </p>

            <form onSubmit={handleSaveCheckin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md font-semibold text-on-surface">
                  Subjective Energy Today
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
                        {preset}
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
                  What gave you the strongest flow?
                </label>
                <textarea
                  id="mind-reflection"
                  rows={3}
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="Writing creative copy uninterrupted before lunch..."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncSleepPrediction}
                    onChange={(e) => setSyncSleepPrediction(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span className="font-body-sm text-body-sm text-secondary">
                    Sync with sleep prediction
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={submittingCheckin}
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
                >
                  {submittingCheckin ? "Saving..." : "Save Entry"}
                </button>
              </div>

              {checkinSavedBanner && (
                <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    check_circle
                  </span>
                  <span>
                    Reflection synchronized. Your daily check-in and vitality
                    pulse have been updated.
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

