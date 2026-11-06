"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MOOD_TYPES, type MoodType } from "@lifesync/shared";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";

interface HealthLogRecord {
  id: string;
  userId: string;
  date: string;
  sleepDurationMinutes: number;
  sleepQuality: number | null;
  exerciseDurationMinutes: number;
  dailySteps: number;
  waterIntakeMl: number;
  mood: MoodType;
  energyLevel: number;
  restingHeartRate: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WaterSummaryResponse {
  date: string;
  totalWaterMl: number;
  entries: Array<{
    id: string;
    date: string;
    amountMl: number;
    loggedAt: string;
  }>;
}

interface DailyScheduleSummary {
  date: string;
  allocatedMinutes: number;
  remainingMinutes: number;
  categoryDistribution: Array<{
    categoryId: string;
    name: string;
    slug: string;
    allocatedMinutes: number;
  }>;
}

interface WellnessTipItem {
  id: string;
  title: string;
  category: string;
  content: string;
  actionLabel: string | null;
  icon: string;
}

const MOOD_META: Record<
  MoodType,
  { emoji: string; clarityScore: number; stressScore: number }
> = {
  Peaceful: { emoji: "🌱", clarityScore: 4.8, stressScore: 14 },
  Motivated: { emoji: "⚡", clarityScore: 4.7, stressScore: 20 },
  Calm: { emoji: "🌊", clarityScore: 4.5, stressScore: 18 },
  Focused: { emoji: "🎯", clarityScore: 4.6, stressScore: 22 },
  Vibrant: { emoji: "✨", clarityScore: 4.9, stressScore: 15 },
  Steady: { emoji: "🍃", clarityScore: 4.2, stressScore: 26 },
  Fatigued: { emoji: "☁️", clarityScore: 3.1, stressScore: 54 },
  Restless: { emoji: "🌀", clarityScore: 2.9, stressScore: 68 },
};

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function formatTableDate(dateStr: string): string {
  const today = getTodayIsoDate();
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  const shortLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
  if (dateStr === today) {
    return `Today, ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(dt)}`;
  }
  return shortLabel;
}

function formatShortWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dt);
}

export default function WellnessTrackingPage() {
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [logs, setLogs] = useState<HealthLogRecord[]>([]);
  const [todaySchedule, setTodaySchedule] =
    useState<DailyScheduleSummary | null>(null);
  const [tips, setTips] = useState<WellnessTipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState<number>(1);

  // Instant Registry Form State
  const [logDate, setLogDate] = useState<string>(todayIso);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [waterLiters, setWaterLiters] = useState<number>(2.25);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(45);
  const [dailySteps, setDailySteps] = useState<number>(8500);
  const [restingHr, setRestingHr] = useState<number>(58);
  const [selectedMood, setSelectedMood] = useState<MoodType>("Motivated");
  const [energyLevel, setEnergyLevel] = useState<number>(82);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Quick Drawer extra state
  const [drawerWaterIncrementMl, setDrawerWaterIncrementMl] =
    useState<number>(250);

  const fetchWellnessData = useCallback(
    async (days: number) => {
      setLoading(true);
      try {
        const fromDate = shiftIsoDate(todayIso, -(days - 1));
        const [healthRes, schedRes, tipsRes] = await Promise.all([
          apiFetch<HealthLogRecord[]>(
            `/api/health?from=${fromDate}&to=${todayIso}&limit=${days}`
          ),
          apiFetch<DailyScheduleSummary>(`/api/schedules?date=${todayIso}`),
          apiFetch<WellnessTipItem[]>("/api/tips"),
        ]);

        if (healthRes.success && healthRes.data) {
          setLogs(healthRes.data);
          const todayLog = healthRes.data.find((r) => r.date === todayIso);
          if (todayLog) {
            setSleepHours(
              Number((todayLog.sleepDurationMinutes / 60).toFixed(1))
            );
            setWaterLiters(
              Number((todayLog.waterIntakeMl / 1000).toFixed(2))
            );
            setExerciseMinutes(todayLog.exerciseDurationMinutes);
            setDailySteps(todayLog.dailySteps);
            setSelectedMood(todayLog.mood);
            setEnergyLevel(todayLog.energyLevel);
            if (todayLog.restingHeartRate) {
              setRestingHr(todayLog.restingHeartRate);
            }
            setNotes(todayLog.notes ?? "");
          }
        }

        if (schedRes.success && schedRes.data) {
          setTodaySchedule(schedRes.data);
        }

        if (tipsRes.success && tipsRes.data) {
          setTips(tipsRes.data);
        }
      } finally {
        setLoading(false);
      }
    },
    [todayIso]
  );

  useEffect(() => {
    fetchWellnessData(periodDays);
  }, [periodDays, fetchWellnessData]);

  const handleSaveVitalMetrics = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        date: logDate,
        sleepDurationMinutes: Math.round(sleepHours * 60),
        sleepQuality: Math.min(100, Math.round((sleepHours / 8) * 90)),
        exerciseDurationMinutes: Math.max(0, Math.round(exerciseMinutes)),
        dailySteps: Math.max(0, Math.round(dailySteps)),
        waterIntakeMl: Math.max(0, Math.round(waterLiters * 1000)),
        mood: selectedMood,
        energyLevel: Math.min(100, Math.max(1, Math.round(energyLevel))),
        restingHeartRate: restingHr > 0 ? Math.round(restingHr) : null,
        notes: notes.trim() || null,
      };

      const [healthRes] = await Promise.all([
        apiFetch<HealthLogRecord>("/api/health", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
        apiFetch("/api/checkins", {
          method: "POST",
          body: JSON.stringify({
            date: logDate,
            mood: selectedMood,
            energyLevel: payload.energyLevel,
            reflection: notes.trim() || null,
            syncSleepPrediction: true,
          }),
        }),
      ]);

      if (healthRes.success) {
        setStatusBanner(
          `Synchronized vital metrics for ${formatTableDate(logDate)}`
        );
        setDrawerOpen(false);
        await fetchWellnessData(periodDays);
        setTimeout(() => setStatusBanner(null), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddWater = async (amountMl: number) => {
    setDrawerWaterIncrementMl(amountMl);
    const res = await apiFetch<WaterSummaryResponse>("/api/water", {
      method: "POST",
      body: JSON.stringify({
        date: todayIso,
        amountMl,
      }),
    });

    if (res.success && res.data) {
      setWaterLiters(Number((res.data.totalWaterMl / 1000).toFixed(2)));
      setStatusBanner(
        `Added +${amountMl}ml hydration (${(res.data.totalWaterMl / 1000).toFixed(2)}L today)`
      );
      await fetchWellnessData(periodDays);
      setTimeout(() => setStatusBanner(null), 3500);
    }
  };

  const handleDeleteLog = async (id: string) => {
    const res = await apiFetch(`/api/health/${id}`, {
      method: "DELETE",
    });
    if (res.success) {
      setStatusBanner("Deleted health log entry");
      await fetchWellnessData(periodDays);
      setTimeout(() => setStatusBanner(null), 3000);
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      "Date",
      "Sleep (Hours)",
      "Sleep Quality (%)",
      "Exercise (Minutes)",
      "Daily Steps",
      "Hydration (mL)",
      "Mood",
      "Energy Level",
      "Resting HR (BPM)",
      "Notes",
    ];
    const rows = logs.map((l) => [
      l.date,
      (l.sleepDurationMinutes / 60).toFixed(1),
      String(l.sleepQuality ?? 85),
      String(l.exerciseDurationMinutes),
      String(l.dailySteps),
      String(l.waterIntakeMl),
      l.mood,
      String(l.energyLevel),
      String(l.restingHeartRate ?? ""),
      `"${(l.notes ?? "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lifesync-wellness-${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summary metrics derived from real logs (or current form inputs if no logs yet)
  const summaryMetrics = useMemo(() => {
    if (logs.length === 0) {
      const moodInfo = MOOD_META[selectedMood];
      return {
        avgSleepHours: sleepHours.toFixed(1),
        restorativeScore: Math.min(100, Math.round((sleepHours / 8) * 90)),
        avgExerciseMins: exerciseMinutes,
        latestSteps: dailySteps,
        estimatedKcal: Math.round(exerciseMinutes * 7.2),
        todayWaterLiters: waterLiters.toFixed(2),
        waterGoalPct: Math.min(100, Math.round((waterLiters / 2.5) * 100)),
        latestMood: selectedMood,
        clarityIndex: moodInfo.clarityScore.toFixed(1),
        stressScore: moodInfo.stressScore,
        restingHr,
      };
    }

    const totalSleepMins = logs.reduce(
      (acc, r) => acc + r.sleepDurationMinutes,
      0
    );
    const avgSleepHours = totalSleepMins / logs.length / 60;
    const avgQuality = Math.round(
      logs.reduce((acc, r) => acc + (r.sleepQuality ?? 85), 0) / logs.length
    );
    const avgExerciseMins = Math.round(
      logs.reduce((acc, r) => acc + r.exerciseDurationMinutes, 0) / logs.length
    );

    const latest = logs[0]!;
    const moodInfo = MOOD_META[latest.mood] ?? MOOD_META.Calm;
    const waterL = latest.waterIntakeMl / 1000;

    return {
      avgSleepHours: avgSleepHours.toFixed(1),
      restorativeScore: avgQuality,
      avgExerciseMins,
      latestSteps: latest.dailySteps,
      estimatedKcal: Math.round(
        latest.exerciseDurationMinutes * 6.5 + latest.dailySteps * 0.03
      ),
      todayWaterLiters: waterL.toFixed(1),
      waterGoalPct: Math.min(100, Math.round((waterL / 2.5) * 100)),
      latestMood: latest.mood,
      clarityIndex: moodInfo.clarityScore.toFixed(1),
      stressScore: moodInfo.stressScore,
      restingHr: latest.restingHeartRate ?? 58,
    };
  }, [
    logs,
    sleepHours,
    exerciseMinutes,
    dailySteps,
    waterLiters,
    selectedMood,
    restingHr,
  ]);

  // 7-day correlation series for the SVG chart
  const sevenDaySeries = useMemo(() => {
    const logByDate = new Map(logs.map((l) => [l.date, l]));
    const days: Array<{
      date: string;
      dayLabel: string;
      sleepHrs: number;
      energy: number;
      hasRecord: boolean;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = shiftIsoDate(todayIso, -i);
      const found = logByDate.get(d);
      days.push({
        date: d,
        dayLabel: formatShortWeekday(d),
        sleepHrs: found
          ? Number((found.sleepDurationMinutes / 60).toFixed(1))
          : 0,
        energy: found ? found.energyLevel : 0,
        hasRecord: Boolean(found),
      });
    }
    return days;
  }, [logs, todayIso]);

  // Phase distribution from today's schedule or wellness logs
  const phaseBreakdown = useMemo(() => {
    const dist = todaySchedule?.categoryDistribution ?? [];
    const getCatHours = (slugs: string[], fallbackHrs: number) => {
      const mins = dist
        .filter((c) => slugs.includes(c.slug))
        .reduce((sum, c) => sum + c.allocatedMinutes, 0);
      if (mins > 0) return Number((mins / 60).toFixed(1));
      return fallbackHrs;
    };

    const sleepH = getCatHours(
      ["sleep"],
      Number(summaryMetrics.avgSleepHours) || 7.8
    );
    const workH = getCatHours(["work", "study"], 7.0);
    const moveH = getCatHours(
      ["exercise"],
      Number((summaryMetrics.avgExerciseMins / 60).toFixed(1)) || 1.0
    );
    const restH = Math.max(
      0,
      Number((24 - (sleepH + workH + moveH)).toFixed(1))
    );

    return {
      sleepH,
      sleepPct: Math.round((sleepH / 24) * 100),
      workH,
      workPct: Math.round((workH / 24) * 100),
      moveH,
      movePct: Math.round((moveH / 24) * 100),
      restH,
      restPct: Math.max(
        0,
        100 -
          Math.round((sleepH / 24) * 100) -
          Math.round((workH / 24) * 100) -
          Math.round((moveH / 24) * 100)
      ),
    };
  }, [todaySchedule, summaryMetrics]);

  // Pagination for Recent Metric History table
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, historyPage]);

  // X positions for the 7-day SVG chart (35, 135, 235, 335, 435, 535, 635)
  const svgPoints = useMemo(() => {
    return sevenDaySeries.map((item, idx) => {
      const barX = 35 + idx * 100;
      const centerX = barX + 14;
      const sleepRatio = Math.min(1, item.sleepHrs / 10);
      const barHeight = Math.max(8, Math.round(sleepRatio * 215));
      const barY = 240 - barHeight;

      const energyRatio = item.hasRecord
        ? Math.min(1, Math.max(0.08, item.energy / 100))
        : 0.5;
      const lineY = Math.round(240 - energyRatio * 205);

      return {
        ...item,
        barX,
        centerX,
        barHeight,
        barY,
        lineY,
      };
    });
  }, [sevenDaySeries]);

  const energyLinePath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    return svgPoints
      .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.centerX} ${pt.lineY}`)
      .join(" ");
  }, [svgPoints]);

  const energyAreaPath = useMemo(() => {
    if (svgPoints.length === 0) return "";
    const first = svgPoints[0]!;
    const last = svgPoints[svgPoints.length - 1]!;
    return `${energyLinePath} L ${last.centerX} 240 L ${first.centerX} 240 Z`;
  }, [energyLinePath, svgPoints]);

  return (
    <AppShell
      onQuickLogClick={() => setDrawerOpen(true)}
      balanceScore={summaryMetrics.restorativeScore}
    >
      <div className="flex flex-col w-full">
        {/* Top Ambient Banner / Breadcrumb & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-surface-container-high/60">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wider uppercase">
                Biophilic Analytics
              </span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">
                • {logs.length} Recorded Biological Days
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">
              Wellness Tracking
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Monitor your physiological rhythm, habit equilibrium, and
              restorative balance across dynamic biological timelines.
            </p>
          </div>

          {/* Date Filter & Quick Actions */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="flex items-center bg-surface-container-low p-1 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setPeriodDays(7)}
                className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                  periodDays === 7
                    ? "bg-surface-container-lowest font-semibold text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriodDays(30)}
                className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                  periodDays === 30
                    ? "bg-surface-container-lowest font-semibold text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Last 30 Days
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:opacity-95 active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_circle
              </span>
              <span>Quick Log</span>
            </button>
          </div>
        </div>

        {statusBanner && (
          <div className="mt-6 flex items-center justify-between px-4 py-3 rounded-2xl bg-secondary-container text-on-secondary-container font-label-md text-label-md shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                verified
              </span>
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs text-secondary hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Metrics Bento Grid (5 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-8">
          {/* Card 1: Sleep Quality & Duration */}
          <div className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(15,56,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(15,56,42,0.07)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/60 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  bedtime
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">
                High Consistency
              </span>
            </div>
            <div className="mt-4">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Sleep Equilibrium
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  {summaryMetrics.avgSleepHours}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  hrs avg
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-container-low">
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  auto_awesome
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  <strong className="text-primary font-semibold">
                    {summaryMetrics.restorativeScore}%
                  </strong>{" "}
                  restorative score
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Active Movement */}
          <div className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(15,56,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(15,56,42,0.07)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed/50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  directions_run
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary font-label-sm text-label-sm font-semibold">
                Zone 2 Target
              </span>
            </div>
            <div className="mt-4">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Active Movement
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  {summaryMetrics.avgExerciseMins}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  mins/day
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
                <span>
                  <strong>
                    {summaryMetrics.latestSteps.toLocaleString()}
                  </strong>{" "}
                  steps
                </span>
                <span>
                  <strong>{summaryMetrics.estimatedKcal}</strong> kcal
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Hydration Equilibrium */}
          <div className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(15,56,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(15,56,42,0.07)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[22px]">
                  water_drop
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickAddWater(250)}
                className="px-2 py-0.5 rounded-full bg-secondary-container/70 hover:bg-secondary-container text-primary font-label-sm text-label-sm font-bold transition-colors"
                title="Quick log +250ml water"
              >
                +250ml ({summaryMetrics.waterGoalPct}%)
              </button>
            </div>
            <div className="mt-4">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Hydration Daily
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  {summaryMetrics.todayWaterLiters}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  L of 2.5L
                </span>
              </div>
              <div className="w-full bg-surface-container-low rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${summaryMetrics.waterGoalPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Mood & Mental Clarity */}
          <div className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(15,56,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(15,56,42,0.07)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  self_improvement
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm font-semibold">
                {MOOD_META[summaryMetrics.latestMood]?.emoji}{" "}
                {summaryMetrics.latestMood}
              </span>
            </div>
            <div className="mt-4">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Clarity Index
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  {summaryMetrics.clarityIndex}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  / 5.0
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-container-low">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="font-label-md text-label-md text-on-surface-variant">
                  Stress metric:{" "}
                  <strong className="text-on-surface font-semibold">
                    {summaryMetrics.stressScore}/100
                  </strong>{" "}
                  ({summaryMetrics.stressScore <= 30 ? "Low" : "Moderate"})
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Heart Rate & Recovery */}
          <div className="group relative overflow-hidden bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_24px_rgba(15,56,42,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(15,56,42,0.07)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[22px]">
                  cardiology
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                Optimal
              </span>
            </div>
            <div className="mt-4">
              <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Resting HR
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
                  {summaryMetrics.restingHr}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  bpm
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-container-low font-label-md text-label-md text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  verified
                </span>
                <span>Sympathetic calm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Visual Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* 7-Day Multi-Variable Correlation Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-3xl p-7 shadow-[0_4px_24px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Biological Synthesis
                  </span>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-0.5">
                    Sleep &amp; Sustained Daytime Energy
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs font-label-md text-label-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-secondary-container" />
                    <span className="text-on-surface-variant font-medium">
                      Sleep Duration (hrs)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary-fixed" />
                    <span className="text-on-surface-variant font-medium">
                      Reported Energy (0-100)
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Visual SVG Chart */}
              <div className="mt-8 relative w-full h-72">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-surface-container-highest flex justify-between text-[11px] font-label-sm text-outline">
                    <span>10h / 100%</span>
                  </div>
                  <div className="border-b border-dashed border-surface-container-highest flex justify-between text-[11px] font-label-sm text-outline">
                    <span>7.5h / 75%</span>
                  </div>
                  <div className="border-b border-dashed border-surface-container-highest flex justify-between text-[11px] font-label-sm text-outline">
                    <span>5.0h / 50%</span>
                  </div>
                  <div className="border-b border-dashed border-surface-container-highest flex justify-between text-[11px] font-label-sm text-outline">
                    <span>2.5h / 25%</span>
                  </div>
                  <div className="border-b border-surface-container-highest" />
                </div>

                <svg
                  className="w-full h-full overflow-visible relative z-10"
                  preserveAspectRatio="none"
                  viewBox="0 0 700 240"
                >
                  <defs>
                    <linearGradient
                      id="energyGlow"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#005f3f"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="#005f3f"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {svgPoints.map((pt) => (
                    <rect
                      key={pt.date}
                      x={pt.barX}
                      y={pt.barY}
                      width="28"
                      height={pt.barHeight}
                      rx="6"
                      fill={pt.sleepHrs >= 7.5 ? "#a5d0bc" : "#c1ecd7"}
                      opacity={pt.hasRecord ? "0.9" : "0.35"}
                    />
                  ))}

                  {energyAreaPath && (
                    <path d={energyAreaPath} fill="url(#energyGlow)" />
                  )}

                  {energyLinePath && (
                    <path
                      d={energyLinePath}
                      fill="none"
                      stroke="#005f3f"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3.5"
                    />
                  )}

                  {svgPoints.map((pt) => (
                    <circle
                      key={`node_${pt.date}`}
                      cx={pt.centerX}
                      cy={pt.lineY}
                      r={pt.energy >= 80 ? "6" : "5"}
                      fill={pt.energy >= 80 ? "#0d7a53" : "#005f3f"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
              </div>

              {/* Horizontal Day Labels */}
              <div className="grid grid-cols-7 text-center font-label-md text-label-md text-on-surface-variant font-medium pt-3 border-t border-surface-container-low">
                {svgPoints.map((pt) => (
                  <div key={`lbl_${pt.date}`}>
                    <p
                      className={`font-bold ${
                        pt.date === todayIso
                          ? "text-primary"
                          : "text-on-surface"
                      }`}
                    >
                      {pt.dayLabel}
                    </p>
                    <span className="text-xs text-outline">
                      {pt.hasRecord
                        ? `${pt.sleepHrs}h • ${pt.energy}%`
                        : "No log"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesis Callout */}
            <div className="mt-6 p-4 rounded-2xl bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    psychology
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  <strong>Key Correlation:</strong> Nights with &ge;7.5 hrs
                  restorative rest directly support{" "}
                  <strong className="text-primary">
                    elevated daytime vitality ({summaryMetrics.restorativeScore}
                    % equilibrium)
                  </strong>{" "}
                  and lower perceived stress.
                </p>
              </div>
            </div>
          </div>

          {/* 24-Hour Circadian Phase Distribution (4 Cols) */}
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-3xl p-7 shadow-[0_4px_24px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Circadian Clock
                  </span>
                  <h2 className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight mt-0.5">
                    Phase Distribution
                  </h2>
                </div>
                <span className="material-symbols-outlined text-[22px] text-outline">
                  schedule
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5">
                24h natural cycle alignment according to your scheduled &amp;
                logged blocks.
              </p>

              {/* Donut & Phases Visual */}
              <div className="relative flex items-center justify-center my-6">
                <svg
                  className="w-48 h-48 transform -rotate-90"
                  viewBox="0 0 120 120"
                >
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="48"
                    stroke="#bee9d4"
                    strokeDasharray="99.5 201"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="48"
                    stroke="#005f3f"
                    strokeDasharray="87.5 213"
                    strokeDashoffset="-105"
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="48"
                    stroke="#4edea3"
                    strokeDasharray="30 271"
                    strokeDashoffset="-198"
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="48"
                    stroke="#e5eeff"
                    strokeDasharray="84.5 216"
                    strokeDashoffset="-234"
                    strokeLinecap="round"
                    strokeWidth="14"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="font-headline-lg text-headline-lg font-bold text-primary">
                    24
                    <span className="text-headline-sm font-medium">h</span>
                  </span>
                  <span className="font-label-sm text-label-sm uppercase text-on-surface-variant font-semibold tracking-wider">
                    Synchronized
                  </span>
                </div>
              </div>

              {/* Legend breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                    <span className="text-on-surface">
                      Deep Restoration (Sleep)
                    </span>
                  </div>
                  <span className="font-bold text-on-surface">
                    {phaseBreakdown.sleepH}h{" "}
                    <span className="font-normal text-outline">
                      ({phaseBreakdown.sleepPct}%)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-on-surface">
                      High-Cognition Focus
                    </span>
                  </div>
                  <span className="font-bold text-on-surface">
                    {phaseBreakdown.workH}h{" "}
                    <span className="font-normal text-outline">
                      ({phaseBreakdown.workPct}%)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim" />
                    <span className="text-on-surface">Physical Movement</span>
                  </div>
                  <span className="font-bold text-on-surface">
                    {phaseBreakdown.moveH}h{" "}
                    <span className="font-normal text-outline">
                      ({phaseBreakdown.movePct}%)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-body-sm font-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-surface-container" />
                    <span className="text-on-surface">
                      Metabolic &amp; Rest Transition
                    </span>
                  </div>
                  <span className="font-bold text-on-surface">
                    {phaseBreakdown.restH}h{" "}
                    <span className="font-normal text-outline">
                      ({phaseBreakdown.restPct}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-surface-container-low flex items-center justify-between text-label-md font-label-md">
              <span className="text-on-surface-variant">
                Optimal Sleep Window
              </span>
              <span className="font-bold text-primary">
                10:30 PM – 06:30 AM
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Quick Log Card & Recent Entry Table Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Fast In-Page Metric Logger (5 Cols) */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-7 shadow-[0_4px_24px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Instant Registry
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Log Today&apos;s Vital Metrics
                  </h3>
                </div>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => {
                    if (e.target.value) setLogDate(e.target.value);
                  }}
                  className="rounded-lg bg-surface-container-low px-2.5 py-1.5 font-label-sm text-label-sm text-primary font-semibold outline-none"
                />
              </div>

              <form onSubmit={handleSaveVitalMetrics} className="space-y-4">
                {/* Step 1: Sleep & Hydration Counters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Sleep Duration
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSleepHours((s) =>
                            Math.max(0, Number((s - 0.5).toFixed(1)))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-lg hover:bg-surface transition-all"
                      >
                        -
                      </button>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-sm text-headline-sm font-bold text-primary">
                          {sleepHours.toFixed(1)}
                        </span>
                        <span className="text-xs text-on-surface-variant font-label-sm">
                          hrs
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSleepHours((s) =>
                            Math.min(24, Number((s + 0.5).toFixed(1)))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-lg hover:bg-surface transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1.5">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Hydration Intake
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setWaterLiters((w) =>
                            Math.max(0, Number((w - 0.25).toFixed(2)))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-lg hover:bg-surface transition-all"
                      >
                        -
                      </button>
                      <div className="flex items-baseline gap-0.5">
                        <span className="font-headline-sm text-headline-sm font-bold text-primary">
                          {waterLiters.toFixed(2)}
                        </span>
                        <span className="text-xs text-on-surface-variant font-label-sm">
                          L
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setWaterLiters((w) =>
                            Math.min(10, Number((w + 0.25).toFixed(2)))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center font-bold text-lg hover:bg-surface transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exercise & Steps Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Exercise (mins)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={exerciseMinutes}
                      onChange={(e) =>
                        setExerciseMinutes(Number(e.target.value) || 0)
                      }
                      className="bg-transparent font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-container-low/70 flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Daily Steps
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={200000}
                      value={dailySteps}
                      onChange={(e) =>
                        setDailySteps(Number(e.target.value) || 0)
                      }
                      className="bg-transparent font-headline-sm text-headline-sm font-bold text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* Step 2: Mental State Chips */}
                <div className="flex flex-col gap-2 pt-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Mood &amp; Mental State
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_TYPES.map((mood) => {
                      const active = selectedMood === mood;
                      return (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => setSelectedMood(mood)}
                          className={`px-3 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                            active
                              ? "bg-secondary-container text-on-secondary-container font-semibold shadow-sm"
                              : "bg-surface-container-low text-on-surface-variant hover:bg-secondary-container/50"
                          }`}
                        >
                          <span>{MOOD_META[mood].emoji}</span>
                          <span>{mood}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Daytime Energy Slider */}
                <div className="flex flex-col gap-1.5 pt-2">
                  <div className="flex justify-between items-center font-label-md text-label-md">
                    <span className="text-on-surface font-semibold">
                      Perceived Energy Balance
                    </span>
                    <span className="font-bold text-primary">
                      {energyLevel} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(Number(e.target.value))}
                    className="w-full accent-primary bg-surface-container-highest h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-label-sm text-outline">
                    <span>Depleted</span>
                    <span>Sustained</span>
                    <span>Peak Vitality</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-3 py-3 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-[0_4px_16px_rgba(0,95,63,0.2)] hover:bg-primary-container active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    check
                  </span>
                  <span>
                    {submitting
                      ? "Synchronizing..."
                      : "Record Synchronized Habits"}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Recent Habit Log History Table (7 Cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-7 shadow-[0_4px_24px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold text-secondary">
                    Historical Audit
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Recent Metric History
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={logs.length === 0}
                  className="text-secondary hover:text-primary disabled:opacity-40 font-label-md text-label-md flex items-center gap-1 font-semibold"
                >
                  <span>Export CSV</span>
                  <span className="material-symbols-outlined text-[16px]">
                    download
                  </span>
                </button>
              </div>

              {loading ? (
                <div className="space-y-3 py-6">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded-xl bg-surface-container-low animate-pulse"
                    />
                  ))}
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-outline-variant/50 rounded-2xl">
                  <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                    No Vital Logs Recorded Yet
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Use the Instant Registry form on the left to log your first
                    daily sleep, hydration, movement, and mood record.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="border-b border-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase">
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Rest / Sleep</th>
                        <th className="pb-3 font-semibold">Hydration</th>
                        <th className="pb-3 font-semibold">Mental State</th>
                        <th className="pb-3 font-semibold">Vitality</th>
                        <th className="pb-3 text-right font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low/60 text-on-surface">
                      {paginatedLogs.map((entry) => {
                        const sleepH = (
                          entry.sleepDurationMinutes / 60
                        ).toFixed(1);
                        const waterL = (entry.waterIntakeMl / 1000).toFixed(2);
                        const inEquilibrium =
                          entry.energyLevel >= 70 &&
                          entry.sleepDurationMinutes >= 420;

                        return (
                          <tr
                            key={entry.id}
                            className="hover:bg-surface transition-colors group"
                          >
                            <td className="py-3.5 font-medium">
                              <div className="flex flex-col">
                                <span className="font-bold text-on-surface">
                                  {formatTableDate(entry.date)}
                                </span>
                                <span className="text-xs text-outline">
                                  {entry.dailySteps.toLocaleString()} steps •{" "}
                                  {entry.exerciseDurationMinutes}m active
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className="font-semibold text-primary">
                                {sleepH} hrs
                              </span>
                              <div className="text-xs text-outline">
                                {entry.sleepQuality ?? 85}% restorative
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span>{waterL} L</span>
                            </td>
                            <td className="py-3.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                                <span>
                                  {MOOD_META[entry.mood]?.emoji ?? "🌿"}
                                </span>{" "}
                                {entry.mood}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span className="font-bold text-on-surface">
                                {entry.energyLevel}
                              </span>
                              <span className="text-xs text-outline">/100</span>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold ${
                                    inEquilibrium
                                      ? "text-primary"
                                      : "text-secondary"
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      inEquilibrium
                                        ? "bg-primary"
                                        : "bg-secondary"
                                    }`}
                                  />
                                  {inEquilibrium
                                    ? "In Equilibrium"
                                    : "Recovery Needed"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLog(entry.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-on-surface-variant hover:text-error transition-opacity"
                                  title="Delete entry"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    delete
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant border-t border-surface-container-low">
              <span>
                Showing {paginatedLogs.length} of {logs.length} biological days
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded bg-surface-container-low hover:bg-surface-container disabled:opacity-40 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_left
                  </span>
                </button>
                <span className="font-bold text-on-surface">
                  Page {historyPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={historyPage >= totalPages}
                  onClick={() =>
                    setHistoryPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="p-1 rounded bg-surface-container-low hover:bg-surface-container disabled:opacity-40 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Biophilic Lifestyle & Recovery Recommendations Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container/60 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">
                  wb_sunny
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase font-semibold text-secondary">
                  {tips[0]?.category || "Circadian Reset"}
                </span>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-0.5">
                  {tips[0]?.title || "Morning Photon Exposure"}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  {tips[0]?.content ||
                    "Target 15 mins of outdoor natural light within 45 minutes of wake-up to cement your cortisol peak and sleep onset tonight."}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-container-low flex justify-between items-center font-label-md text-label-md">
              <span className="text-primary font-semibold">
                {tips[0]?.actionLabel || "Recommended by 08:30 AM"}
              </span>
              <span className="material-symbols-outlined text-secondary text-[20px]">
                check_circle
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed/50 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">
                  local_cafe
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase font-semibold text-secondary">
                  {tips[1]?.category || "Adenosine Buffer"}
                </span>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-0.5">
                  {tips[1]?.title || "Caffeine Cutoff Window"}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  {tips[1]?.content ||
                    "Stop stimulant intake by 2:00 PM (10 hours prior to sleep) to protect deep slow-wave phase duration and lower nocturnal heart rate."}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-container-low flex justify-between items-center font-label-md text-label-md">
              <span className="text-on-surface-variant font-medium">
                {tips[1]?.actionLabel || "10h pre-sleep cutoff"}
              </span>
              <span className="material-symbols-outlined text-outline text-[20px]">
                schedule
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_20px_rgba(15,56,42,0.04)] flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">
                <span className="material-symbols-outlined text-[26px]">
                  spa
                </span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm uppercase font-semibold text-secondary">
                  {tips[2]?.category || "Parasympathetic Mode"}
                </span>
                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface mt-0.5">
                  {tips[2]?.title || "Evening Physiological Sigh"}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  {tips[2]?.content ||
                    "Perform 5 minutes of double-inhalation cyclic sighing before bed to drop autonomic arousal by 34%."}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-surface-container-low flex justify-between items-center font-label-md text-label-md">
              <span className="text-primary font-semibold">
                {tips[2]?.actionLabel || "5-min breathwork protocol"}
              </span>
              <span className="material-symbols-outlined text-primary text-[22px]">
                play_circle
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Log Slide-out Overlay Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-on-surface/30 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-surface-container-lowest shadow-2xl h-full p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">
                      vital_signs
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      Log Health Habits
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Real-time biometric sync active
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                    Step Count (Today)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={dailySteps}
                      onChange={(e) =>
                        setDailySteps(Number(e.target.value) || 0)
                      }
                      className="w-full px-4 py-3 rounded-xl bg-surface-container-low text-on-surface font-headline-sm text-headline-sm font-bold outline-none border border-transparent focus:border-primary transition"
                    />
                    <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                      Steps
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                    Quick Add Hydration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[250, 500, 750, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAddWater(amt)}
                        className={`py-2.5 rounded-xl font-label-md text-label-md transition ${
                          drawerWaterIncrementMl === amt
                            ? "bg-secondary-container text-on-secondary-container font-bold"
                            : "bg-surface-container-low text-primary font-semibold hover:bg-secondary-container"
                        }`}
                      >
                        +{amt} ml
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                      Resting HR (BPM)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={220}
                      value={restingHr}
                      onChange={(e) =>
                        setRestingHr(Number(e.target.value) || 58)
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-headline-sm text-headline-sm font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                      Exercise (Mins)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={exerciseMinutes}
                      onChange={(e) =>
                        setExerciseMinutes(Number(e.target.value) || 0)
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-headline-sm text-headline-sm font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                    Stress Calibration
                  </label>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Autonomous State ({selectedMood})
                    </span>
                    <span className="font-label-lg text-label-lg font-bold text-primary">
                      {MOOD_META[selectedMood].stressScore <= 25
                        ? "Very Low"
                        : "Moderate"}{" "}
                      ({MOOD_META[selectedMood].stressScore}/100)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="font-label-md text-label-md font-semibold text-on-surface block mb-2">
                    Daily Notes &amp; Observations
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes on sleep clarity, meals, or physical sensations..."
                    className="w-full p-3.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm outline-none resize-none placeholder:text-outline"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-surface-container-low flex flex-col gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveVitalMetrics()}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold shadow-md hover:bg-primary-container disabled:opacity-50 transition"
              >
                {submitting ? "Saving..." : "Sync & Save Log"}
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full py-2.5 text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

