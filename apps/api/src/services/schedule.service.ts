import {
  getDb,
  dailySchedules,
  activities,
  eq,
  and,
  ne,
  asc,
} from "@lifesync/db";
import type {
  ScheduleBlockInput,
  UpdateScheduleBlockInput,
} from "@lifesync/shared";
import { getCategoryById, listCategoriesForUser } from "./activity.service";

export interface ParsedTimeRange {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  crossesMidnight: boolean;
  /** Intervals within the 24-hour day [0, 1440) */
  dayIntervals: Array<[number, number]>;
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  return hours * 60 + minutes;
}

export function minutesToHHMM(mins: number): string {
  if (mins >= 1440 || mins <= 0) return "00:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function computeTimeRange(
  startTime: string,
  endTime: string
): ParsedTimeRange | { error: string } {
  const startMinutes = parseTimeToMinutes(startTime);
  const rawEndMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === rawEndMinutes) {
    return {
      error:
        "Start time and end time cannot be identical. Please specify a valid duration.",
    };
  }

  // Case 1: Normal same-day block (or ending at 00:00 midnight of current day)
  if (rawEndMinutes > startMinutes) {
    const durationMinutes = rawEndMinutes - startMinutes;
    return {
      startMinutes,
      endMinutes: rawEndMinutes,
      durationMinutes,
      crossesMidnight: false,
      dayIntervals: [[startMinutes, rawEndMinutes]],
    };
  }

  // Case 2: Ends at exactly 00:00 (midnight) -> treat as end of current day (1440)
  if (rawEndMinutes === 0) {
    const durationMinutes = 1440 - startMinutes;
    return {
      startMinutes,
      endMinutes: 1440,
      durationMinutes,
      crossesMidnight: false,
      dayIntervals: [[startMinutes, 1440]],
    };
  }

  // Case 3: Crosses midnight (e.g., 22:30 -> 06:30)
  const endMinutes = rawEndMinutes + 1440;
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes > 1440) {
    return {
      error: "A single activity block cannot exceed 24 hours.",
    };
  }

  return {
    startMinutes,
    endMinutes,
    durationMinutes,
    crossesMidnight: true,
    dayIntervals: [
      [startMinutes, 1440],
      [0, rawEndMinutes],
    ],
  };
}

function intervalsOverlap(
  a: Array<[number, number]>,
  b: Array<[number, number]>
): boolean {
  for (const [aStart, aEnd] of a) {
    for (const [bStart, bEnd] of b) {
      if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
        return true;
      }
    }
  }
  return false;
}

export async function resolveAndCarveOverlaps(
  userId: string,
  date: string,
  newStartMin: number,
  newEndMin: number,
  excludeScheduleId?: string
): Promise<void> {
  const db = getDb();

  const existingBlocks = await db
    .select()
    .from(dailySchedules)
    .where(
      excludeScheduleId
        ? and(
            eq(dailySchedules.userId, userId),
            eq(dailySchedules.date, date),
            ne(dailySchedules.id, excludeScheduleId)
          )
        : and(eq(dailySchedules.userId, userId), eq(dailySchedules.date, date))
    );

  for (const block of existingBlocks) {
    const bStart = block.startMinutes;
    const bEnd =
      block.endTime === "00:00" || block.crossesMidnight || block.endMinutes > 1440
        ? 1440
        : block.endMinutes;

    if (Math.max(newStartMin, bStart) >= Math.min(newEndMin, bEnd)) {
      continue; // No overlap
    }

    // Case A: New block completely covers existing block -> delete existing
    if (newStartMin <= bStart && newEndMin >= bEnd) {
      await db
        .delete(dailySchedules)
        .where(
          and(eq(dailySchedules.id, block.id), eq(dailySchedules.userId, userId))
        );
      continue;
    }

    // Case B: New block splits existing block in the middle -> keep left & insert right
    if (newStartMin > bStart && newEndMin < bEnd) {
      await db
        .update(dailySchedules)
        .set({
          endTime: minutesToHHMM(newStartMin),
          endMinutes: newStartMin,
          durationMinutes: newStartMin - bStart,
          crossesMidnight: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(dailySchedules.id, block.id), eq(dailySchedules.userId, userId))
        );

      await db.insert(dailySchedules).values({
        id: `sch_${crypto.randomUUID()}`,
        userId,
        activityId: block.activityId,
        title: block.title,
        description: block.description,
        date,
        startTime: minutesToHHMM(newEndMin),
        endTime: minutesToHHMM(bEnd),
        startMinutes: newEndMin,
        endMinutes: bEnd,
        durationMinutes: bEnd - newEndMin,
        crossesMidnight: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      continue;
    }

    // Case C: New block overlaps tail of existing block -> shorten existing to end at newStartMin
    if (newStartMin > bStart && newStartMin < bEnd) {
      await db
        .update(dailySchedules)
        .set({
          endTime: minutesToHHMM(newStartMin),
          endMinutes: newStartMin,
          durationMinutes: newStartMin - bStart,
          crossesMidnight: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(dailySchedules.id, block.id), eq(dailySchedules.userId, userId))
        );
      continue;
    }

    // Case D: New block overlaps head of existing block -> move existing start to newEndMin
    if (newEndMin > bStart && newEndMin < bEnd) {
      await db
        .update(dailySchedules)
        .set({
          startTime: minutesToHHMM(newEndMin),
          startMinutes: newEndMin,
          endTime: minutesToHHMM(bEnd),
          endMinutes: bEnd,
          durationMinutes: bEnd - newEndMin,
          crossesMidnight: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(dailySchedules.id, block.id), eq(dailySchedules.userId, userId))
        );
    }
  }
}

export async function checkScheduleOverlap(
  userId: string,
  date: string,
  candidateIntervals: Array<[number, number]>,
  excludeScheduleId?: string
) {
  const db = getDb();

  const existingBlocks = await db
    .select()
    .from(dailySchedules)
    .where(
      excludeScheduleId
        ? and(
            eq(dailySchedules.userId, userId),
            eq(dailySchedules.date, date),
            ne(dailySchedules.id, excludeScheduleId)
          )
        : and(eq(dailySchedules.userId, userId), eq(dailySchedules.date, date))
    );

  for (const block of existingBlocks) {
    const parsed = computeTimeRange(block.startTime, block.endTime);
    if ("error" in parsed) continue;

    if (intervalsOverlap(candidateIntervals, parsed.dayIntervals)) {
      return {
        overlaps: true as const,
        conflictingBlock: block,
      };
    }
  }

  return { overlaps: false as const };
}

export async function getDailyScheduleSummary(userId: string, date: string) {
  const db = getDb();

  const rows = await db
    .select({
      schedule: dailySchedules,
      category: activities,
    })
    .from(dailySchedules)
    .innerJoin(activities, eq(dailySchedules.activityId, activities.id))
    .where(
      and(eq(dailySchedules.userId, userId), eq(dailySchedules.date, date))
    )
    .orderBy(asc(dailySchedules.startMinutes));

  const userCategories = await listCategoriesForUser(userId);

  const blocks = rows.map(({ schedule, category }) => {
    const isLegacyMidnight =
      schedule.crossesMidnight || schedule.endMinutes > 1440;
    const clampedEndMin = isLegacyMidnight ? 1440 : schedule.endMinutes;
    const clampedDuration = isLegacyMidnight
      ? Math.max(0, 1440 - schedule.startMinutes)
      : schedule.durationMinutes;

    return {
      ...schedule,
      endTime: isLegacyMidnight ? "00:00" : schedule.endTime,
      endMinutes: clampedEndMin,
      durationMinutes: clampedDuration,
      crossesMidnight: false,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        color: category.color,
        bgColor: category.bgColor,
        icon: category.icon,
        targetMinutesPerDay: category.targetMinutesPerDay,
      },
    };
  });

  const allocatedMinutes = Math.min(
    1440,
    blocks.reduce((sum, b) => sum + b.durationMinutes, 0)
  );
  const remainingMinutes = Math.max(0, 1440 - allocatedMinutes);
  const allocatedPercentage = Math.round((allocatedMinutes / 1440) * 100);

  const categoryTotalsMap = new Map<
    string,
    {
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
  >();

  for (const cat of userCategories) {
    categoryTotalsMap.set(cat.id, {
      categoryId: cat.id,
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      bgColor: cat.bgColor,
      icon: cat.icon,
      allocatedMinutes: 0,
      targetMinutesPerDay: cat.targetMinutesPerDay,
      percentageOfDay: 0,
    });
  }

  for (const block of blocks) {
    const existing = categoryTotalsMap.get(block.activityId);
    if (existing) {
      existing.allocatedMinutes += block.durationMinutes;
      existing.percentageOfDay = Math.round(
        (existing.allocatedMinutes / 1440) * 100
      );
    } else {
      categoryTotalsMap.set(block.activityId, {
        categoryId: block.category.id,
        name: block.category.name,
        slug: block.category.slug,
        color: block.category.color,
        bgColor: block.category.bgColor,
        icon: block.category.icon,
        allocatedMinutes: block.durationMinutes,
        targetMinutesPerDay: block.category.targetMinutesPerDay,
        percentageOfDay: Math.round((block.durationMinutes / 1440) * 100),
      });
    }
  }

  const categoryDistribution = Array.from(categoryTotalsMap.values()).sort(
    (a, b) => b.allocatedMinutes - a.allocatedMinutes
  );

  return {
    date,
    totalMinutesInDay: 1440,
    allocatedMinutes,
    remainingMinutes,
    allocatedPercentage,
    blocks,
    categoryDistribution,
  };
}

export async function createScheduleBlock(
  userId: string,
  input: ScheduleBlockInput
) {
  const db = getDb();

  const category = await getCategoryById(input.activityId);
  if (!category || (!category.isSystem && category.userId !== userId)) {
    return {
      error: "INVALID_CATEGORY" as const,
      message: "Selected activity category does not exist or is unauthorized.",
    };
  }

  const timeRange = computeTimeRange(input.startTime, input.endTime);
  if ("error" in timeRange) {
    return {
      error: "INVALID_TIME_RANGE" as const,
      message: timeRange.error,
    };
  }

  const categorySummary = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    color: category.color,
    bgColor: category.bgColor,
    icon: category.icon,
    targetMinutesPerDay: category.targetMinutesPerDay,
  };

  if (timeRange.crossesMidnight) {
    const day1Duration = 1440 - timeRange.startMinutes;
    await resolveAndCarveOverlaps(
      userId,
      input.date,
      timeRange.startMinutes,
      1440
    );

    const day1Schedule = {
      id: `sch_${crypto.randomUUID()}`,
      userId,
      activityId: input.activityId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      date: input.date,
      startTime: input.startTime,
      endTime: "00:00",
      startMinutes: timeRange.startMinutes,
      endMinutes: 1440,
      durationMinutes: day1Duration,
      crossesMidnight: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(dailySchedules).values(day1Schedule);

    const nextDate = shiftIsoDate(input.date, 1);
    const carryEndMin = timeRange.endMinutes - 1440;
    if (carryEndMin > 0) {
      await resolveAndCarveOverlaps(userId, nextDate, 0, carryEndMin);

      const day2Schedule = {
        id: `sch_${crypto.randomUUID()}`,
        userId,
        activityId: input.activityId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        date: nextDate,
        startTime: "00:00",
        endTime: input.endTime,
        startMinutes: 0,
        endMinutes: carryEndMin,
        durationMinutes: carryEndMin,
        crossesMidnight: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(dailySchedules).values(day2Schedule);
    }

    return {
      data: {
        ...day1Schedule,
        carriedOverToDate: nextDate,
        category: categorySummary,
      },
    };
  }

  await resolveAndCarveOverlaps(
    userId,
    input.date,
    timeRange.startMinutes,
    timeRange.endMinutes
  );

  const newSchedule = {
    id: `sch_${crypto.randomUUID()}`,
    userId,
    activityId: input.activityId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    startMinutes: timeRange.startMinutes,
    endMinutes: timeRange.endMinutes,
    durationMinutes: timeRange.durationMinutes,
    crossesMidnight: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(dailySchedules).values(newSchedule);

  return {
    data: {
      ...newSchedule,
      category: categorySummary,
    },
  };
}

export async function updateScheduleBlock(
  scheduleId: string,
  userId: string,
  input: UpdateScheduleBlockInput
) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(dailySchedules)
    .where(eq(dailySchedules.id, scheduleId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    return {
      error: "NOT_FOUND" as const,
      message: "Schedule block not found.",
    };
  }

  // Strict user data isolation
  if (existing.userId !== userId) {
    return {
      error: "FORBIDDEN" as const,
      message: "You do not have permission to modify this schedule block.",
    };
  }

  const targetActivityId = input.activityId ?? existing.activityId;
  const category = await getCategoryById(targetActivityId);
  if (!category || (!category.isSystem && category.userId !== userId)) {
    return {
      error: "INVALID_CATEGORY" as const,
      message: "Selected activity category does not exist.",
    };
  }

  const targetDate = input.date ?? existing.date;
  const targetStartTime = input.startTime ?? existing.startTime;
  const targetEndTime = input.endTime ?? existing.endTime;

  const timeRange = computeTimeRange(targetStartTime, targetEndTime);
  if ("error" in timeRange) {
    return {
      error: "INVALID_TIME_RANGE" as const,
      message: timeRange.error,
    };
  }

  const nextTitle =
    input.title !== undefined ? input.title.trim() : existing.title;
  const nextDescription =
    input.description !== undefined
      ? input.description?.trim() || null
      : existing.description;

  const categorySummary = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    color: category.color,
    bgColor: category.bgColor,
    icon: category.icon,
    targetMinutesPerDay: category.targetMinutesPerDay,
  };

  if (timeRange.crossesMidnight) {
    await resolveAndCarveOverlaps(
      userId,
      targetDate,
      timeRange.startMinutes,
      1440,
      scheduleId
    );

    const updatedValues = {
      activityId: targetActivityId,
      title: nextTitle,
      description: nextDescription,
      date: targetDate,
      startTime: targetStartTime,
      endTime: "00:00",
      startMinutes: timeRange.startMinutes,
      endMinutes: 1440,
      durationMinutes: 1440 - timeRange.startMinutes,
      crossesMidnight: false,
      updatedAt: new Date(),
    };

    await db
      .update(dailySchedules)
      .set(updatedValues)
      .where(
        and(eq(dailySchedules.id, scheduleId), eq(dailySchedules.userId, userId))
      );

    const nextDate = shiftIsoDate(targetDate, 1);
    const carryEndMin = timeRange.endMinutes - 1440;
    if (carryEndMin > 0) {
      await resolveAndCarveOverlaps(userId, nextDate, 0, carryEndMin);
      await db.insert(dailySchedules).values({
        id: `sch_${crypto.randomUUID()}`,
        userId,
        activityId: targetActivityId,
        title: nextTitle,
        description: nextDescription,
        date: nextDate,
        startTime: "00:00",
        endTime: targetEndTime,
        startMinutes: 0,
        endMinutes: carryEndMin,
        durationMinutes: carryEndMin,
        crossesMidnight: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return {
      data: {
        ...existing,
        ...updatedValues,
        carriedOverToDate: nextDate,
        category: categorySummary,
      },
    };
  }

  await resolveAndCarveOverlaps(
    userId,
    targetDate,
    timeRange.startMinutes,
    timeRange.endMinutes,
    scheduleId
  );

  const updatedValues = {
    activityId: targetActivityId,
    title: nextTitle,
    description: nextDescription,
    date: targetDate,
    startTime: targetStartTime,
    endTime: targetEndTime,
    startMinutes: timeRange.startMinutes,
    endMinutes: timeRange.endMinutes,
    durationMinutes: timeRange.durationMinutes,
    crossesMidnight: false,
    updatedAt: new Date(),
  };

  await db
    .update(dailySchedules)
    .set(updatedValues)
    .where(
      and(eq(dailySchedules.id, scheduleId), eq(dailySchedules.userId, userId))
    );

  return {
    data: {
      ...existing,
      ...updatedValues,
      category: categorySummary,
    },
  };
}

export async function deleteScheduleBlock(scheduleId: string, userId: string) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(dailySchedules)
    .where(eq(dailySchedules.id, scheduleId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }

  if (existing.userId !== userId) {
    return { error: "FORBIDDEN" as const };
  }

  await db
    .delete(dailySchedules)
    .where(
      and(eq(dailySchedules.id, scheduleId), eq(dailySchedules.userId, userId))
    );

  return { data: { id: scheduleId, deleted: true } };
}

