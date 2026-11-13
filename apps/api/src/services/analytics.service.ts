import {
  getDb,
  dailySchedules,
  activities,
  healthLogs,
  dailyCheckins,
  eq,
  and,
  gte,
  lte,
  asc,
  desc,
} from "@lifesync/db";
import { getDailyScheduleSummary } from "./schedule.service";
import { getUserWithProfile } from "./user.service";
import { listActiveWellnessTips, getWaterSummaryForDate } from "./wellness.service";

function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export async function getDailyAnalytics(userId: string, date: string) {
  const db = getDb();

  const [scheduleSummary, userProfile, waterSummary, tips, healthRows, checkinRows] =
    await Promise.all([
      getDailyScheduleSummary(userId, date),
      getUserWithProfile(userId),
      getWaterSummaryForDate(userId, date),
      listActiveWellnessTips(),
      db
        .select()
        .from(healthLogs)
        .where(and(eq(healthLogs.userId, userId), eq(healthLogs.date, date)))
        .limit(1),
      db
        .select()
        .from(dailyCheckins)
        .where(
          and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, date))
        )
        .orderBy(desc(dailyCheckins.createdAt))
        .limit(5),
    ]);

  const todayHealth = healthRows[0] ?? null;
  const profile = userProfile?.profile ?? {
    dailyWaterGoalMl: 2500,
    dailyStepsGoal: 10000,
    dailySleepGoalMinutes: 480,
    dailyExerciseGoalMinutes: 45,
    dailyCalorieGoal: 2000,
    targetWakeTime: "06:30",
    targetSleepTime: "22:30",
  };

  // Compute sleep and exercise from either explicit health_logs OR scheduled blocks
  const sleepCategory = scheduleSummary.categoryDistribution.find(
    (c) => c.slug === "sleep"
  );
  const exerciseCategory = scheduleSummary.categoryDistribution.find(
    (c) => c.slug === "exercise"
  );

  const sleepMinutes =
    todayHealth?.sleepDurationMinutes ?? sleepCategory?.allocatedMinutes ?? 0;
  const exerciseMinutes =
    todayHealth?.exerciseDurationMinutes ??
    exerciseCategory?.allocatedMinutes ??
    0;
  const waterIntakeMl = Math.max(
    waterSummary.totalWaterMl,
    todayHealth?.waterIntakeMl ?? 0
  );
  const dailySteps = todayHealth?.dailySteps ?? 0;
  const mood = todayHealth?.mood ?? checkinRows[0]?.mood ?? null;
  const energyLevel =
    todayHealth?.energyLevel ?? checkinRows[0]?.energyLevel ?? null;

  // Compute real balance score (0-100) from actual user records
  const sleepProgress = Math.min(
    1,
    sleepMinutes / Math.max(60, profile.dailySleepGoalMinutes)
  );
  const exerciseProgress = Math.min(
    1,
    exerciseMinutes / Math.max(15, profile.dailyExerciseGoalMinutes)
  );
  const waterProgress = Math.min(
    1,
    waterIntakeMl / Math.max(500, profile.dailyWaterGoalMl)
  );
  const scheduleProgress = Math.min(
    1,
    scheduleSummary.allocatedMinutes / 960
  );

  const hasAnyRecord =
    scheduleSummary.blocks.length > 0 ||
    todayHealth !== null ||
    checkinRows.length > 0 ||
    waterIntakeMl > 0;

  const balanceScore = hasAnyRecord
    ? Math.round(
        sleepProgress * 30 +
          exerciseProgress * 25 +
          waterProgress * 20 +
          scheduleProgress * 25
      )
    : 0;

  return {
    date,
    hasAnyRecord,
    balanceScore,
    goals: profile,
    schedule: scheduleSummary,
    wellness: {
      sleepMinutes,
      sleepQuality: todayHealth?.sleepQuality ?? null,
      exerciseMinutes,
      waterIntakeMl,
      dailySteps,
      mood,
      energyLevel,
      restingHeartRate: todayHealth?.restingHeartRate ?? null,
      notes: todayHealth?.notes ?? null,
    },
    recentCheckins: checkinRows,
    tips,
  };
}

async function aggregateWindowMetrics(
  userId: string,
  fromDate: string,
  toDate: string
) {
  const db = getDb();

  const [healthRows, scheduleRows] = await Promise.all([
    db
      .select()
      .from(healthLogs)
      .where(
        and(
          eq(healthLogs.userId, userId),
          gte(healthLogs.date, fromDate),
          lte(healthLogs.date, toDate)
        )
      )
      .orderBy(asc(healthLogs.date)),
    db
      .select({
        schedule: dailySchedules,
        category: activities,
      })
      .from(dailySchedules)
      .innerJoin(activities, eq(dailySchedules.activityId, activities.id))
      .where(
        and(
          eq(dailySchedules.userId, userId),
          gte(dailySchedules.date, fromDate),
          lte(dailySchedules.date, toDate)
        )
      )
      .orderBy(asc(dailySchedules.date), asc(dailySchedules.startMinutes)),
  ]);

  const loggedDaysCount = healthRows.length;

  const avgSleepMinutes =
    loggedDaysCount > 0
      ? Math.round(
          healthRows.reduce((s, r) => s + r.sleepDurationMinutes, 0) /
            loggedDaysCount
        )
      : 0;

  const avgExerciseMinutes =
    loggedDaysCount > 0
      ? Math.round(
          healthRows.reduce((s, r) => s + r.exerciseDurationMinutes, 0) /
            loggedDaysCount
        )
      : 0;

  const avgWaterIntakeMl =
    loggedDaysCount > 0
      ? Math.round(
          healthRows.reduce((s, r) => s + r.waterIntakeMl, 0) / loggedDaysCount
        )
      : 0;

  const avgEnergyLevel =
    loggedDaysCount > 0
      ? Math.round(
          healthRows.reduce((s, r) => s + r.energyLevel, 0) / loggedDaysCount
        )
      : 0;

  const avgSteps =
    loggedDaysCount > 0
      ? Math.round(
          healthRows.reduce((s, r) => s + r.dailySteps, 0) / loggedDaysCount
        )
      : 0;

  const totalScheduledMinutes = scheduleRows.reduce(
    (s, r) => s + r.schedule.durationMinutes,
    0
  );

  // Category frequency and total duration
  const categoryMap = new Map<
    string,
    {
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
  >();

  for (const { schedule, category } of scheduleRows) {
    const existing = categoryMap.get(category.id);
    if (existing) {
      existing.blockCount += 1;
      existing.totalMinutes += schedule.durationMinutes;
    } else {
      categoryMap.set(category.id, {
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        bgColor: category.bgColor,
        icon: category.icon,
        blockCount: 1,
        totalMinutes: schedule.durationMinutes,
        targetMinutesPerDay: category.targetMinutesPerDay,
      });
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes
  );

  return {
    fromDate,
    toDate,
    loggedDaysCount,
    scheduledBlocksCount: scheduleRows.length,
    totalScheduledMinutes,
    avgSleepMinutes,
    avgExerciseMinutes,
    avgWaterIntakeMl,
    avgEnergyLevel,
    avgSteps,
    categoryBreakdown,
    healthRows,
    scheduleRows,
  };
}

export async function getWeeklyAnalytics(userId: string, endDate: string) {
  const currentFrom = shiftDateString(endDate, -6);
  const prevTo = shiftDateString(endDate, -7);
  const prevFrom = shiftDateString(endDate, -13);

  const [currentWindow, previousWindow] = await Promise.all([
    aggregateWindowMetrics(userId, currentFrom, endDate),
    aggregateWindowMetrics(userId, prevFrom, prevTo),
  ]);

  const healthByDate = new Map(
    currentWindow.healthRows.map((r) => [r.date, r])
  );

  const dailySeries = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDateString(endDate, -i);
    const h = healthByDate.get(d);
    const daySchedMins = currentWindow.scheduleRows
      .filter((s) => s.schedule.date === d)
      .reduce((sum, s) => sum + s.schedule.durationMinutes, 0);

    dailySeries.push({
      date: d,
      sleepMinutes: h?.sleepDurationMinutes ?? 0,
      sleepQuality: h?.sleepQuality ?? null,
      exerciseMinutes: h?.exerciseDurationMinutes ?? 0,
      waterIntakeMl: h?.waterIntakeMl ?? 0,
      dailySteps: h?.dailySteps ?? 0,
      mood: h?.mood ?? null,
      energyLevel: h?.energyLevel ?? null,
      scheduledMinutes: daySchedMins,
      hasHealthLog: Boolean(h),
    });
  }

  const hasSufficientData =
    currentWindow.loggedDaysCount > 0 ||
    currentWindow.scheduledBlocksCount > 0;

  // Generate data-driven insights strictly from existing user records
  const insights: Array<{
    id: string;
    category: string;
    title: string;
    badge: string;
    description: string;
    metricLabel: string;
    metricValue: string;
    icon: string;
  }> = [];

  if (currentWindow.loggedDaysCount > 0) {
    const sleepHrs = (currentWindow.avgSleepMinutes / 60).toFixed(1);
    insights.push({
      id: "ins_sleep",
      category: "Restorative Sleep",
      title: "Sleep Duration & Daytime Energy",
      badge: `${sleepHrs}h Avg`,
      description: `Across ${currentWindow.loggedDaysCount} logged day(s) this week, your average sleep is ${sleepHrs} hours with an average daytime energy score of ${currentWindow.avgEnergyLevel}/100.`,
      metricLabel: "Average Energy Rating",
      metricValue: `${currentWindow.avgEnergyLevel} / 100`,
      icon: "bedtime",
    });

    const waterL = (currentWindow.avgWaterIntakeMl / 1000).toFixed(2);
    insights.push({
      id: "ins_hydration",
      category: "Metabolic Hydration",
      title: "Daily Hydration Consistency",
      badge: `${waterL}L / day`,
      description: `You averaged ${currentWindow.avgWaterIntakeMl.toLocaleString()} ml of water per logged day and ${currentWindow.avgExerciseMinutes} minutes of physical movement.`,
      metricLabel: "Movement Average",
      metricValue: `${currentWindow.avgExerciseMinutes} mins/day`,
      icon: "water_drop",
    });
  }

  if (currentWindow.categoryBreakdown.length > 0) {
    const topCat = currentWindow.categoryBreakdown[0]!;
    const topHours = (topCat.totalMinutes / 60).toFixed(1);
    insights.push({
      id: "ins_top_category",
      category: "24-Hour Time Stewardship",
      title: `Primary Focus: ${topCat.name}`,
      badge: `${topCat.blockCount} blocks`,
      description: `Your most frequent scheduled activity pillar is ${topCat.name}, accounting for ${topHours} hours across ${topCat.blockCount} scheduled block(s) this week.`,
      metricLabel: "Weekly Pillar Total",
      metricValue: `${topHours} hrs`,
      icon: topCat.icon || "schedule",
    });
  }

  return {
    period: "weekly" as const,
    fromDate: currentFrom,
    toDate: endDate,
    hasSufficientData,
    loggedDaysCount: currentWindow.loggedDaysCount,
    scheduledBlocksCount: currentWindow.scheduledBlocksCount,
    totalMinutesInWeek: 10080, // 168h * 60m
    totalScheduledMinutes: currentWindow.totalScheduledMinutes,
    averages: {
      sleepMinutes: currentWindow.avgSleepMinutes,
      exerciseMinutes: currentWindow.avgExerciseMinutes,
      waterIntakeMl: currentWindow.avgWaterIntakeMl,
      energyLevel: currentWindow.avgEnergyLevel,
      dailySteps: currentWindow.avgSteps,
    },
    comparisonWithPreviousWeek: {
      previousLoggedDaysCount: previousWindow.loggedDaysCount,
      sleepDeltaMinutes:
        currentWindow.avgSleepMinutes - previousWindow.avgSleepMinutes,
      exerciseDeltaMinutes:
        currentWindow.avgExerciseMinutes - previousWindow.avgExerciseMinutes,
      waterDeltaMl:
        currentWindow.avgWaterIntakeMl - previousWindow.avgWaterIntakeMl,
      energyDelta:
        currentWindow.avgEnergyLevel - previousWindow.avgEnergyLevel,
      scheduledMinutesDelta:
        currentWindow.totalScheduledMinutes -
        previousWindow.totalScheduledMinutes,
    },
    mostFrequentCategories: currentWindow.categoryBreakdown,
    dailySeries,
    insights,
  };
}

export async function getMonthlyAnalytics(userId: string, endDate: string) {
  const fromDate = shiftDateString(endDate, -29);
  const prevTo = shiftDateString(endDate, -30);
  const prevFrom = shiftDateString(endDate, -59);

  const [currentWindow, previousWindow] = await Promise.all([
    aggregateWindowMetrics(userId, fromDate, endDate),
    aggregateWindowMetrics(userId, prevFrom, prevTo),
  ]);

  const hasSufficientData =
    currentWindow.loggedDaysCount > 0 ||
    currentWindow.scheduledBlocksCount > 0;

  // Mood distribution across the 30-day window
  const moodCounts: Record<string, number> = {};
  for (const row of currentWindow.healthRows) {
    moodCounts[row.mood] = (moodCounts[row.mood] ?? 0) + 1;
  }

  const moodDistribution = Object.entries(moodCounts)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: Math.round((count / currentWindow.loggedDaysCount) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    period: "monthly" as const,
    fromDate,
    toDate: endDate,
    hasSufficientData,
    loggedDaysCount: currentWindow.loggedDaysCount,
    scheduledBlocksCount: currentWindow.scheduledBlocksCount,
    totalScheduledMinutes: currentWindow.totalScheduledMinutes,
    averages: {
      sleepMinutes: currentWindow.avgSleepMinutes,
      exerciseMinutes: currentWindow.avgExerciseMinutes,
      waterIntakeMl: currentWindow.avgWaterIntakeMl,
      energyLevel: currentWindow.avgEnergyLevel,
      dailySteps: currentWindow.avgSteps,
    },
    comparisonWithPreviousMonth: {
      previousLoggedDaysCount: previousWindow.loggedDaysCount,
      sleepDeltaMinutes:
        currentWindow.avgSleepMinutes - previousWindow.avgSleepMinutes,
      exerciseDeltaMinutes:
        currentWindow.avgExerciseMinutes - previousWindow.avgExerciseMinutes,
      waterDeltaMl:
        currentWindow.avgWaterIntakeMl - previousWindow.avgWaterIntakeMl,
      energyDelta:
        currentWindow.avgEnergyLevel - previousWindow.avgEnergyLevel,
    },
    mostFrequentCategories: currentWindow.categoryBreakdown,
    moodDistribution,
    dailyWaterTrends: currentWindow.healthRows.map((r) => ({
      date: r.date,
      waterIntakeMl: r.waterIntakeMl,
      sleepMinutes: r.sleepDurationMinutes,
      exerciseMinutes: r.exerciseDurationMinutes,
      energyLevel: r.energyLevel,
    })),
  };
}
