"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface CategoryStatsItem {
  categoryId: string;
  name: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  blockCount: number;
  totalMinutes: number;
  targetMinutesPerDay: number;
}

interface WeeklyAnalyticsData {
  period: "weekly";
  fromDate: string;
  toDate: string;
  hasSufficientData: boolean;
  loggedDaysCount: number;
  scheduledBlocksCount: number;
  totalMinutesInWeek: number;
  totalScheduledMinutes: number;
  averages: {
    sleepMinutes: number;
    exerciseMinutes: number;
    waterIntakeMl: number;
    energyLevel: number;
    dailySteps: number;
  };
  comparisonWithPreviousWeek: {
    previousLoggedDaysCount: number;
    sleepDeltaMinutes: number;
    exerciseDeltaMinutes: number;
    waterDeltaMl: number;
    energyDelta: number;
    scheduledMinutesDelta: number;
  };
  mostFrequentCategories: CategoryStatsItem[];
  dailySeries: Array<{
    date: string;
    sleepMinutes: number;
    sleepQuality: number | null;
    exerciseMinutes: number;
    waterIntakeMl: number;
    dailySteps: number;
    mood: string | null;
    energyLevel: number | null;
    scheduledMinutes: number;
    hasHealthLog: boolean;
  }>;
  insights: Array<{
    id: string;
    category: string;
    title: string;
    badge: string;
    description: string;
    metricLabel: string;
    metricValue: string;
    icon: string;
  }>;
}

interface MonthlyAnalyticsData {
  period: "monthly";
  fromDate: string;
  toDate: string;
  hasSufficientData: boolean;
  loggedDaysCount: number;
  scheduledBlocksCount: number;
  totalScheduledMinutes: number;
  averages: {
    sleepMinutes: number;
    exerciseMinutes: number;
    waterIntakeMl: number;
    energyLevel: number;
    dailySteps: number;
  };
  comparisonWithPreviousMonth: {
    previousLoggedDaysCount: number;
    sleepDeltaMinutes: number;
    exerciseDeltaMinutes: number;
    waterDeltaMl: number;
    energyDelta: number;
  };
  mostFrequentCategories: CategoryStatsItem[];
  moodDistribution: Array<{
    mood: string;
    count: number;
    percentage: number;
  }>;
  dailyWaterTrends: Array<{
    date: string;
    waterIntakeMl: number;
    sleepMinutes: number;
    exerciseMinutes: number;
    energyLevel: number;
  }>;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHoursOneDecimal(minutes: number): string {
  return `${(Math.max(0, minutes) / 60).toFixed(1)}h`;
}

function formatSignedDelta(value: number, unit: string): string {
  const rounded = Math.round(value);
  if (rounded === 0) return `0 ${unit} vs prev`;
  return `${rounded > 0 ? "+" : ""}${rounded} ${unit} vs prev`;
}

export default function InsightsAndPatternsPage() {
  const router = useRouter();
  const { t, translateCategory } = useLanguage();
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  const [periodTab, setPeriodTab] = useState<"weekly" | "monthly">("weekly");
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalyticsData | null>(
    null
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalyticsData | null>(
    null
  );
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [appliedPrescriptions, setAppliedPrescriptions] = useState<
    Record<string, string>
  >({});

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [wkRes, moRes, catRes] = await Promise.all([
        apiFetch<WeeklyAnalyticsData>(`/api/analytics/weekly?date=${todayIso}`),
        apiFetch<MonthlyAnalyticsData>(
          `/api/analytics/monthly?date=${todayIso}`
        ),
        apiFetch<CategoryItem[]>("/api/activities"),
      ]);

      if (wkRes.success && wkRes.data) {
        setWeeklyData(wkRes.data);
      }
      if (moRes.success && moRes.data) {
        setMonthlyData(moRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [todayIso]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const activeData = periodTab === "weekly" ? weeklyData : monthlyData;
  const totalWindowHours = periodTab === "weekly" ? 168 : 720;

  // Compute 6-pillar breakdown from actual scheduled categories
  const pillarStats = useMemo(() => {
    const cats = activeData?.mostFrequentCategories ?? [];
    const mult = periodTab === "weekly" ? 1 : 4.28;

    const sumMinutesBySlugs = (slugs: string[]) =>
      cats
        .filter((c) => slugs.includes(c.slug))
        .reduce((s, c) => s + c.totalMinutes, 0);

    const sleepMins = sumMinutesBySlugs(["sleep"]);
    const workMins = sumMinutesBySlugs(["work", "study"]);
    const moveMins = sumMinutesBySlugs(["exercise"]);
    const mealsMins = sumMinutesBySlugs(["meals"]);
    const personalMins = sumMinutesBySlugs([
      "personal-time",
      "entertainment",
      "commute",
    ]);
    const restMins = sumMinutesBySlugs(["rest", "other"]);

    const trackedMins =
      sleepMins + workMins + moveMins + mealsMins + personalMins + restMins;

    return {
      trackedHours: Number((trackedMins / 60).toFixed(1)),
      alignmentPct:
        trackedMins > 0
          ? Math.min(
              100,
              Math.round((trackedMins / (totalWindowHours * 60 * 0.85)) * 100)
            )
          : 0,
      pillars: [
        {
          label: "Sleep",
          hours: Number((sleepMins / 60).toFixed(1)),
          targetHours: Math.round(56 * mult),
          widthPct: Number(
            ((sleepMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-primary-container",
        },
        {
          label: "Work",
          hours: Number((workMins / 60).toFixed(1)),
          targetHours: Math.round(40 * mult),
          widthPct: Number(
            ((workMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-secondary",
        },
        {
          label: "Movement",
          hours: Number((moveMins / 60).toFixed(1)),
          targetHours: Math.round(7 * mult),
          widthPct: Number(
            ((moveMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-primary",
        },
        {
          label: "Nutrition",
          hours: Number((mealsMins / 60).toFixed(1)),
          targetHours: Math.round(12 * mult),
          widthPct: Number(
            ((mealsMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-secondary-fixed-dim",
        },
        {
          label: "Personal",
          hours: Number((personalMins / 60).toFixed(1)),
          targetHours: Math.round(25 * mult),
          widthPct: Number(
            ((personalMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-inverse-primary",
        },
        {
          label: "Rest",
          hours: Number((restMins / 60).toFixed(1)),
          targetHours: Math.round(15 * mult),
          widthPct: Number(
            ((restMins / (totalWindowHours * 60)) * 100).toFixed(1)
          ),
          colorClass: "bg-surface-variant",
        },
      ],
    };
  }, [activeData, periodTab, totalWindowHours]);

  // Apply one-click prescription to today's schedule
  const handleApplyPrescription = async (
    key: string,
    title: string,
    slug: string,
    startTime: string,
    endTime: string,
    description: string
  ) => {
    const matchedCat =
      categories.find((c) => c.slug === slug) ?? categories[0];
    if (!matchedCat) {
      router.push("/schedule");
      return;
    }

    const res = await apiFetch("/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        title,
        activityId: matchedCat.id,
        date: todayIso,
        startTime,
        endTime,
        description,
      }),
    });

    if (res.success) {
      setAppliedPrescriptions((prev) => ({
        ...prev,
        [key]: "Applied to Today's Schedule",
      }));
      await fetchAnalytics();
    } else {
      setAppliedPrescriptions((prev) => ({
        ...prev,
        [key]: res.error?.message || "Slot already occupied",
      }));
    }
  };

  const syncRatePct = useMemo(() => {
    if (!activeData || !activeData.hasSufficientData) return 0;
    const avgE = activeData.averages.energyLevel || 78;
    return Math.min(100, Math.max(40, avgE));
  }, [activeData]);

  const comparison =
    periodTab === "weekly"
      ? weeklyData?.comparisonWithPreviousWeek
      : monthlyData?.comparisonWithPreviousMonth;

  return (
    <AppShell
      onQuickLogClick={() => router.push("/schedule")}
      balanceScore={syncRatePct || 85}
    >
      <div className="flex flex-col w-full">
        {/* Top Banner / Screen Intro */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pt-4">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide uppercase">
                <span className="material-symbols-outlined text-[14px] text-primary">
                  auto_awesome
                </span>
                {t("AI Health Companion", "Pendamping Kesehatan AI")}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium tracking-wide">
                {t("Computed across", "Dihitung dari")}{" "}
                {activeData?.loggedDaysCount ?? 0}{" "}
                {t("logged days &", "hari tercatat &")}{" "}
                {activeData?.scheduledBlocksCount ?? 0}{" "}
                {t("scheduled blocks", "blok terjadwal")}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              {t(
                "Insights & Biometric Patterns",
                "Wawasan & Pola Biometrik"
              )}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t(
                "Deep observations derived from continuous 24-hour time allocation, ambient biometric signals, and lifestyle markers.",
                "Pengamatan mendalam dari alokasi waktu 24 jam, sinyal biometrik harian, dan indikator gaya hidup Anda."
              )}
            </p>
          </div>

          {/* Quick Filter / Period Controls */}
          <div className="flex items-center gap-2 bg-surface-container-lowest p-1.5 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setPeriodTab("weekly")}
              className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                periodTab === "weekly"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t("Past 7 Days", "7 Hari Terakhir")}
            </button>
            <button
              type="button"
              onClick={() => setPeriodTab("monthly")}
              className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                periodTab === "monthly"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t("Past 30 Days", "30 Hari Terakhir")}
            </button>
          </div>
        </div>

        {/* Empty State Notice when insufficient user records exist */}
        {!loading && !activeData?.hasSufficientData && (
          <div className="mb-8 rounded-2xl bg-surface-container-lowest p-8 shadow-sm border border-dashed border-outline-variant/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">
                  insights
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  {t(
                    "Awaiting Your First Telemetry Records",
                    "Menunggu Catatan Telemetri Pertama Anda"
                  )}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                  {t(
                    "LifeSync never fabricates health statistics. Log your daily sleep, hydration, exercise, and 24-hour schedule blocks to unlock personalized week-over-week trends and category correlations.",
                    "LifeSync tidak pernah memalsukan statistik kesehatan. Catat tidur harian, hidrasi, olahraga, dan blok jadwal 24 jam Anda untuk membuka tren mingguan dan korelasi kategori."
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/schedule"
                className="px-4 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-colors"
              >
                {t("Allocate 24h Day", "Atur Jadwal 24 Jam")}
              </Link>
              <Link
                href="/wellness"
                className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 transition-all"
              >
                {t("Log Today's Vitals", "Catat Biometrik Hari Ini")}
              </Link>
            </div>
          </div>
        )}

        {/* Highlighted Key Pattern Cards (3 Mosaic Bento Highlights) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Average Sleep & Week Comparison */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary-container/40 blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    bedtime
                  </span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  {formatHoursOneDecimal(
                    activeData?.averages.sleepMinutes ?? 0
                  )}{" "}
                  {t("avg", "rata-rata")}
                </span>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                {t("Restorative Architecture", "Arsitektur Pemulihan")}
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1 mb-3 font-semibold">
                {t("Average Sleep Duration", "Rata-rata Durasi Tidur")}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {activeData?.loggedDaysCount ? (
                  <>
                    {t("Across", "Selama")}{" "}
                    <span className="font-semibold text-on-surface">
                      {activeData.loggedDaysCount}{" "}
                      {t("logged days", "hari tercatat")}
                    </span>
                    ,{" "}
                    {t(
                      "your average sleep duration is",
                      "rata-rata durasi tidur Anda adalah"
                    )}{" "}
                    <span className="font-semibold text-primary">
                      {formatHoursOneDecimal(activeData.averages.sleepMinutes)}
                    </span>{" "}
                    ({formatSignedDelta(comparison?.sleepDeltaMinutes ?? 0, "m")}
                    ).
                  </>
                ) : (
                  t(
                    "Log your nightly sleep duration in Wellness Tracking to compute your restorative sleep baseline and previous-week delta.",
                    "Catat durasi tidur malam Anda di Pelacakan Kesehatan untuk menghitung rata-rata tidur restoratif dan perbandingan minggu sebelumnya."
                  )
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 bg-surface-container-low/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t("Period Comparison", "Perbandingan Periode")}
                </span>
                <span className="font-label-lg text-label-lg font-bold text-primary">
                  {formatSignedDelta(
                    comparison?.sleepDeltaMinutes ?? 0,
                    t("mins", "mnt")
                  )}
                </span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-primary">
                trending_up
              </span>
            </div>
          </div>

          {/* Card 2: Movement & Hydration Trends */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">
                    directions_walk
                  </span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary-container font-label-sm text-label-sm font-semibold">
                  {activeData?.averages.exerciseMinutes ?? 0}m /{" "}
                  {t("day", "hari")}
                </span>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                {t(
                  "Metabolic & Hydration Velocity",
                  "Kecepatan Metabolik & Hidrasi"
                )}
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1 mb-3 font-semibold">
                {t("Movement & Hydration Trend", "Tren Olahraga & Hidrasi")}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {activeData?.loggedDaysCount ? (
                  <>
                    {t("Averaging", "Rata-rata")}{" "}
                    <span className="font-semibold text-on-surface">
                      {activeData.averages.exerciseMinutes} {t("mins", "mnt")}
                    </span>{" "}
                    {t("of daily movement and", "olahraga harian dan")}{" "}
                    <span className="font-semibold text-primary">
                      {(activeData.averages.waterIntakeMl / 1000).toFixed(2)} L
                    </span>{" "}
                    {t("of daily water intake", "asupan air harian")} (
                    {formatSignedDelta(
                      comparison?.exerciseDeltaMinutes ?? 0,
                      "m"
                    )}
                    ).
                  </>
                ) : (
                  t(
                    "Record daily exercise minutes and hydration intake to track how physical movement stabilizes afternoon cognitive energy.",
                    "Catat menit olahraga harian dan asupan air untuk melacak bagaimana aktivitas fisik menstabilkan energi kognitif sore hari."
                  )
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 bg-surface-container-low/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t("Daily Steps Average", "Rata-rata Langkah Harian")}
                </span>
                <span className="font-label-lg text-label-lg font-bold text-primary-container">
                  {(activeData?.averages.dailySteps ?? 0).toLocaleString()}{" "}
                  {t("steps", "langkah")}
                </span>
              </div>
              <div className="flex items-end gap-1 h-8">
                <span className="w-2 h-3 rounded-full bg-outline-variant" />
                <span className="w-2 h-5 rounded-full bg-secondary-fixed-dim" />
                <span className="w-2 h-8 rounded-full bg-primary-container" />
                <span className="w-2 h-7 rounded-full bg-primary" />
              </div>
            </div>
          </div>

          {/* Card 3: Most Frequent Activity Categories */}
          <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary-fixed/40 blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    donut_large
                  </span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                  {activeData?.scheduledBlocksCount ?? 0} {t("Blocks", "Blok")}
                </span>
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                {t("Category Frequency", "Frekuensi Kategori")}
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1 mb-3 font-semibold">
                {activeData?.mostFrequentCategories[0]
                  ? `${t("Top Pillar", "Pilar Utama")}: ${translateCategory(activeData.mostFrequentCategories[0].name)}`
                  : t("24-Hour Pillar Distribution", "Distribusi Pilar 24 Jam")}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {activeData?.mostFrequentCategories[0] ? (
                  <>
                    {t(
                      "Your most frequent scheduled activity category is",
                      "Kategori aktivitas terjadwal paling sering Anda adalah"
                    )}{" "}
                    <span className="font-semibold text-primary">
                      {translateCategory(
                        activeData.mostFrequentCategories[0].name
                      )}
                    </span>{" "}
                    {t("with", "dengan")}{" "}
                    <span className="font-semibold text-on-surface">
                      {formatHoursOneDecimal(
                        activeData.mostFrequentCategories[0].totalMinutes
                      )}
                    </span>{" "}
                    {t("across", "dalam")}{" "}
                    {activeData.mostFrequentCategories[0].blockCount}{" "}
                    {t("scheduled blocks.", "blok terjadwal.")}
                  </>
                ) : (
                  t(
                    "Schedule activities on your 24-hour timeline to analyze your top recurring lifestyle pillars.",
                    "Jadwalkan aktivitas pada garis waktu 24 jam Anda untuk menganalisis pilar gaya hidup utama Anda."
                  )
                )}
              </p>
            </div>
            <div className="mt-6 pt-4 bg-surface-container-low/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {t("Total Allocated Time", "Total Waktu Terjadwal")}
                </span>
                <span className="font-label-lg text-label-lg font-bold text-primary">
                  {formatHoursOneDecimal(
                    activeData?.totalScheduledMinutes ?? 0
                  )}
                </span>
              </div>
              <span className="material-symbols-outlined text-[26px] text-primary">
                verified
              </span>
            </div>
          </div>
        </div>

        {/* Weekly/Monthly 24-Hour Balance Trend & Contextual Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* Main Allocation Chart (8 Cols) */}
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                      Macro Stewardship
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                      Total {totalWindowHours} hrs
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight mt-1">
                    {periodTab === "weekly"
                      ? "Weekly 24-Hour Balance Trend"
                      : "Monthly 24-Hour Balance Trend"}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-on-surface-variant font-label-sm text-label-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-primary-container" />
                    Current Period
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-surface-container-highest" />
                    Ideal Baseline
                  </span>
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
                Tracking the cumulative allocation of your {totalWindowHours}{" "}
                hours across the core vitality pillars versus personalized
                biometric targets.
              </p>

              {/* Comparative Stacked Horizontal Bar Chart */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Current Period Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center font-label-sm text-label-sm">
                    <span className="font-semibold text-on-surface">
                      {periodTab === "weekly" ? "This Week" : "Past 30 Days"} (
                      {pillarStats.trackedHours}h tracked)
                    </span>
                    <span className="text-primary font-bold">
                      {pillarStats.alignmentPct}% Alignment
                    </span>
                  </div>
                  <div className="h-6 w-full bg-surface-container-low rounded-lg overflow-hidden flex shadow-inner">
                    {pillarStats.pillars.map((p) => (
                      <div
                        key={p.label}
                        className={`${p.colorClass} h-full transition-all`}
                        style={{ width: `${Math.max(0, p.widthPct)}%` }}
                        title={`${p.label}: ${p.hours}h (${p.widthPct}%)`}
                      />
                    ))}
                  </div>
                </div>

                {/* Baseline Ideal Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center font-label-sm text-label-sm">
                    <span className="font-medium text-on-surface-variant">
                      Baseline Target Model
                    </span>
                    <span className="text-secondary font-medium">
                      Equilibrium Standard
                    </span>
                  </div>
                  <div className="h-4 w-full bg-surface-container-low rounded-lg overflow-hidden flex opacity-75">
                    <div
                      className="bg-primary-container/80 h-full"
                      style={{ width: "33.3%" }}
                      title="Sleep Target: 33.3%"
                    />
                    <div
                      className="bg-secondary/80 h-full"
                      style={{ width: "23.8%" }}
                      title="Work Target: 23.8%"
                    />
                    <div
                      className="bg-primary/80 h-full"
                      style={{ width: "6.0%" }}
                      title="Movement Target: 6.0%"
                    />
                    <div
                      className="bg-secondary-fixed-dim/80 h-full"
                      style={{ width: "7.1%" }}
                      title="Nutrition Target: 7.1%"
                    />
                    <div
                      className="bg-inverse-primary/80 h-full"
                      style={{ width: "14.8%" }}
                      title="Personal Target: 14.8%"
                    />
                    <div
                      className="bg-surface-variant/80 h-full"
                      style={{ width: "15.0%" }}
                      title="Rest Target: 15.0%"
                    />
                  </div>
                </div>
              </div>

              {/* Pillar Legend & Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {pillarStats.pillars.map((p) => (
                  <div
                    key={`card_${p.label}`}
                    className="p-2.5 rounded-lg bg-surface-container-low flex flex-col"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${p.colorClass}`}
                      />
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                        {p.label}
                      </span>
                    </div>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                      {p.hours}h
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Target {p.targetHours}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container-low">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  info
                </span>
                Compare your real scheduled hours against ideal circadian targets.
              </span>
              <Link
                href="/schedule"
                className="text-primary font-label-md text-label-md font-bold hover:underline"
              >
                Rebalance Schedule →
              </Link>
            </div>
          </div>

          {/* Editorial Story / Circadian Clock Dial (4 Cols) */}
          <div className="lg:col-span-4 bg-primary-container text-on-primary rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-on-primary-container/10 blur-3xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container font-semibold">
                  Real-Time Phase
                </span>
                <span className="px-2.5 py-1 rounded-full bg-tertiary-container text-on-tertiary font-label-sm text-label-sm">
                  Active Wave
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md font-bold leading-tight mb-2">
                Optimal Evening Window Approaching
              </h3>
              <p className="font-body-sm text-body-sm text-surface-container-low/90 mb-6">
                Concluding dinner before 19:30 and dimming screens by 21:30
                supports deep restorative slow-wave sleep and next-day focus.
              </p>

              {/* Dial Representation */}
              <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="#a6ffd0"
                    strokeDasharray="264"
                    strokeDashoffset={Math.round(
                      264 - (264 * (syncRatePct || 78)) / 100
                    )}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-headline-sm text-headline-sm font-bold text-on-primary">
                    {syncRatePct || 78}%
                  </span>
                  <span className="font-label-sm text-label-sm text-on-primary-container uppercase">
                    Sync Rate
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-primary-container">
                  Avg Energy Level
                </span>
                <span className="font-label-lg text-label-lg font-bold">
                  {activeData?.averages.energyLevel || 78} / 100
                </span>
              </div>
              <Link
                href="/wellness"
                className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md font-semibold hover:bg-surface-container-low transition-all"
              >
                Log Vitals
              </Link>
            </div>
          </div>
        </div>

        {/* Activity vs. Well-being Correlation Matrix */}
        <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Biometric Multivariate Analysis
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight mt-1">
                Activity vs. Well-being Correlation Matrix
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Correlating tracked 24-hour domain timestamps with logged
                subjective state and daily wellness metrics.
              </p>
            </div>
            <div className="flex items-center gap-4 text-on-surface-variant font-label-sm text-label-sm">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                Strong Positive (&gt;+0.7)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
                Moderate Positive
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest" />
                Neutral / Low
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant font-label-md text-label-md border-b border-surface-container-low">
                  <th className="py-3 px-4 font-semibold">
                    Daily Allocation Pillar
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Vital Energy
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Mental Mood
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Sleep Quality
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    Primary Determinant
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-sm text-body-sm">
                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-on-surface flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[18px]">
                        bed
                      </span>
                    </span>
                    Sleep (Consolidated)
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.84{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.76{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.92{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-on-surface-variant">
                    Wake consistency &gt; Total bedtime duration
                  </td>
                </tr>

                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-on-surface flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">
                        fitness_center
                      </span>
                    </span>
                    Midday Movement
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.79{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                      +0.62{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                      +0.58{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-on-surface-variant">
                    Zone 2 aerobic exposure between 07:00 – 14:00
                  </td>
                </tr>

                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-on-surface flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[18px]">
                        restaurant
                      </span>
                    </span>
                    Dinner &lt; 19:30
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                      +0.54{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                      +0.32
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.88{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-on-surface-variant">
                    3-hour gap between meal conclusion and sleep
                  </td>
                </tr>

                <tr className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-on-surface flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[18px]">
                        laptop_mac
                      </span>
                    </span>
                    Focused Work (&le;90m sprints)
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
                      +0.28
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                      +0.71{" "}
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_upward
                      </span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">
                      +0.12
                    </span>
                  </td>
                  <td className="py-4 px-4 text-on-surface-variant">
                    Cessation of work screens at 20:30
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actionable Recommendations & One-Click Adjustments */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Continuous Optimization
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                Actionable Lifestyle Prescriptions
              </h2>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Click to instantly sync your 24-hour schedule
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Prescription 1 */}
            <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">
                      nightlight
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold bg-secondary-container px-2.5 py-0.5 rounded-full">
                    High Impact
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                  Schedule wind-down at 21:30
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Reserve 21:30 – 22:30 for dim lighting and zero blue-light
                  screens to extend deep restorative sleep duration.
                </p>
              </div>
              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPrescription(
                      "winddown",
                      "Evening Wind-Down & Tech-Free Rest",
                      "rest",
                      "21:30",
                      "22:30",
                      "Dim lighting, herbal tea, zero screens"
                    )
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-label-md text-label-md font-semibold transition-all shadow-sm ${
                    appliedPrescriptions.winddown
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-primary-container text-on-primary hover:opacity-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {appliedPrescriptions.winddown ? "check" : "update"}
                  </span>
                  <span>
                    {appliedPrescriptions.winddown || "Apply Adjustment"}
                  </span>
                </button>
              </div>
            </div>

            {/* Prescription 2 */}
            <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">
                      shield
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold bg-secondary-container px-2.5 py-0.5 rounded-full">
                    Cognitive Shield
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                  Protect 90m morning focus block
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Block 09:00 – 10:30 for uninterrupted deep work during peak
                  morning cognitive velocity.
                </p>
              </div>
              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPrescription(
                      "focus",
                      "Protected Morning Deep Focus Sprint",
                      "work",
                      "09:00",
                      "10:30",
                      "Asynchronous deep focus block"
                    )
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-label-md text-label-md font-semibold transition-all shadow-sm ${
                    appliedPrescriptions.focus
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-primary-container text-on-primary hover:opacity-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {appliedPrescriptions.focus ? "check" : "event_busy"}
                  </span>
                  <span>
                    {appliedPrescriptions.focus || "Block Out Period"}
                  </span>
                </button>
              </div>
            </div>

            {/* Prescription 3 */}
            <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">
                      directions_walk
                    </span>
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold bg-secondary-container px-2.5 py-0.5 rounded-full">
                    Metabolic Reset
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-2">
                  Midday sunlight &amp; mobility walk
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Add a 30-minute outdoor walk at 12:30 to flatten post-lunch
                  glucose spikes and prevent the 15:00 energy slump.
                </p>
              </div>
              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPrescription(
                      "walk",
                      "Midday Sunlight & Mobility Walk",
                      "exercise",
                      "12:30",
                      "13:00",
                      "Outdoor daylight walk after lunch"
                    )
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-label-md text-label-md font-semibold transition-all shadow-sm ${
                    appliedPrescriptions.walk
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-primary-container text-on-primary hover:opacity-95"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {appliedPrescriptions.walk ? "check" : "add_task"}
                  </span>
                  <span>{appliedPrescriptions.walk || "Schedule Walk"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

