import {
  getDb,
  healthLogs,
  dailyCheckins,
  waterLogs,
  healthTips,
  eq,
  and,
  gte,
  lte,
  desc,
} from "@lifesync/db";
import type {
  HealthLogInput,
  DailyCheckinInput,
  WaterLogInput,
} from "@lifesync/shared";

export async function listHealthLogs(
  userId: string,
  options: { date?: string; from?: string; to?: string; limit?: number } = {}
) {
  const db = getDb();
  const conditions = [eq(healthLogs.userId, userId)];

  if (options.date) {
    conditions.push(eq(healthLogs.date, options.date));
  }
  if (options.from) {
    conditions.push(gte(healthLogs.date, options.from));
  }
  if (options.to) {
    conditions.push(lte(healthLogs.date, options.to));
  }

  const rows = await db
    .select()
    .from(healthLogs)
    .where(and(...conditions))
    .orderBy(desc(healthLogs.date))
    .limit(options.limit || 30);

  return rows;
}

export async function upsertHealthLog(userId: string, input: HealthLogInput) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(healthLogs)
    .where(
      and(eq(healthLogs.userId, userId), eq(healthLogs.date, input.date))
    )
    .limit(1);

  const existing = existingRows[0];

  if (existing) {
    const updated = {
      sleepDurationMinutes: input.sleepDurationMinutes,
      sleepQuality: input.sleepQuality ?? existing.sleepQuality ?? 85,
      exerciseDurationMinutes: input.exerciseDurationMinutes,
      dailySteps: input.dailySteps,
      waterIntakeMl: input.waterIntakeMl,
      mood: input.mood,
      energyLevel: input.energyLevel,
      restingHeartRate: input.restingHeartRate ?? existing.restingHeartRate,
      notes:
        input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    await db
      .update(healthLogs)
      .set(updated)
      .where(
        and(eq(healthLogs.id, existing.id), eq(healthLogs.userId, userId))
      );

    return {
      ...existing,
      ...updated,
    };
  }

  const newRecord = {
    id: `hl_${crypto.randomUUID()}`,
    userId,
    date: input.date,
    sleepDurationMinutes: input.sleepDurationMinutes,
    sleepQuality: input.sleepQuality ?? 85,
    exerciseDurationMinutes: input.exerciseDurationMinutes,
    dailySteps: input.dailySteps,
    waterIntakeMl: input.waterIntakeMl,
    mood: input.mood,
    energyLevel: input.energyLevel,
    restingHeartRate: input.restingHeartRate ?? null,
    notes: input.notes ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(healthLogs).values(newRecord);
  return newRecord;
}

export async function updateHealthLogById(
  logId: string,
  userId: string,
  input: Partial<HealthLogInput>
) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(healthLogs)
    .where(eq(healthLogs.id, logId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }

  if (existing.userId !== userId) {
    return { error: "FORBIDDEN" as const };
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.sleepDurationMinutes !== undefined)
    updates.sleepDurationMinutes = input.sleepDurationMinutes;
  if (input.sleepQuality !== undefined) updates.sleepQuality = input.sleepQuality;
  if (input.exerciseDurationMinutes !== undefined)
    updates.exerciseDurationMinutes = input.exerciseDurationMinutes;
  if (input.dailySteps !== undefined) updates.dailySteps = input.dailySteps;
  if (input.waterIntakeMl !== undefined)
    updates.waterIntakeMl = input.waterIntakeMl;
  if (input.mood !== undefined) updates.mood = input.mood;
  if (input.energyLevel !== undefined) updates.energyLevel = input.energyLevel;
  if (input.restingHeartRate !== undefined)
    updates.restingHeartRate = input.restingHeartRate;
  if (input.notes !== undefined) updates.notes = input.notes;

  await db
    .update(healthLogs)
    .set(updates)
    .where(and(eq(healthLogs.id, logId), eq(healthLogs.userId, userId)));

  const refreshed = await db
    .select()
    .from(healthLogs)
    .where(eq(healthLogs.id, logId))
    .limit(1);

  return { data: refreshed[0] };
}

export async function deleteHealthLogById(logId: string, userId: string) {
  const db = getDb();

  const existingRows = await db
    .select()
    .from(healthLogs)
    .where(eq(healthLogs.id, logId))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }

  if (existing.userId !== userId) {
    return { error: "FORBIDDEN" as const };
  }

  await db
    .delete(healthLogs)
    .where(and(eq(healthLogs.id, logId), eq(healthLogs.userId, userId)));

  return { data: { id: logId, deleted: true } };
}

export async function listCheckins(userId: string, date?: string) {
  const db = getDb();

  const conditions = [eq(dailyCheckins.userId, userId)];
  if (date) {
    conditions.push(eq(dailyCheckins.date, date));
  }

  return db
    .select()
    .from(dailyCheckins)
    .where(and(...conditions))
    .orderBy(desc(dailyCheckins.createdAt))
    .limit(30);
}

export async function createDailyCheckin(
  userId: string,
  input: DailyCheckinInput
) {
  const db = getDb();

  const newCheckin = {
    id: `chk_${crypto.randomUUID()}`,
    userId,
    date: input.date,
    mood: input.mood,
    energyLevel: input.energyLevel,
    reflection: input.reflection?.trim() || null,
    syncSleepPrediction: input.syncSleepPrediction ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(dailyCheckins).values(newCheckin);

  // Sync mood & energy level into that day's health_logs record
  const existingHealth = await db
    .select()
    .from(healthLogs)
    .where(
      and(eq(healthLogs.userId, userId), eq(healthLogs.date, input.date))
    )
    .limit(1);

  if (existingHealth[0]) {
    await db
      .update(healthLogs)
      .set({
        mood: input.mood,
        energyLevel: input.energyLevel,
        notes: input.reflection || existingHealth[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(healthLogs.id, existingHealth[0].id));
  } else {
    await db.insert(healthLogs).values({
      id: `hl_${crypto.randomUUID()}`,
      userId,
      date: input.date,
      sleepDurationMinutes: 0,
      sleepQuality: 85,
      exerciseDurationMinutes: 0,
      dailySteps: 0,
      waterIntakeMl: 0,
      mood: input.mood,
      energyLevel: input.energyLevel,
      restingHeartRate: null,
      notes: input.reflection || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return newCheckin;
}

export async function getWaterSummaryForDate(userId: string, date: string) {
  const db = getDb();

  const entries = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date)))
    .orderBy(desc(waterLogs.loggedAt));

  const totalFromWaterLogs = entries.reduce((sum, e) => sum + e.amountMl, 0);

  const healthRow = await db
    .select()
    .from(healthLogs)
    .where(and(eq(healthLogs.userId, userId), eq(healthLogs.date, date)))
    .limit(1);

  const totalWaterMl = Math.max(
    totalFromWaterLogs,
    healthRow[0]?.waterIntakeMl ?? 0
  );

  return {
    date,
    totalWaterMl,
    entries,
  };
}

export async function addWaterIntake(userId: string, input: WaterLogInput) {
  const db = getDb();

  const entry = {
    id: `wtr_${crypto.randomUUID()}`,
    userId,
    date: input.date,
    amountMl: input.amountMl,
    loggedAt: new Date(),
    createdAt: new Date(),
  };

  await db.insert(waterLogs).values(entry);

  const existingHealth = await db
    .select()
    .from(healthLogs)
    .where(
      and(eq(healthLogs.userId, userId), eq(healthLogs.date, input.date))
    )
    .limit(1);

  if (existingHealth[0]) {
    const newTotal = existingHealth[0].waterIntakeMl + input.amountMl;
    await db
      .update(healthLogs)
      .set({
        waterIntakeMl: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(healthLogs.id, existingHealth[0].id));
  } else {
    await db.insert(healthLogs).values({
      id: `hl_${crypto.randomUUID()}`,
      userId,
      date: input.date,
      sleepDurationMinutes: 0,
      sleepQuality: 85,
      exerciseDurationMinutes: 0,
      dailySteps: 0,
      waterIntakeMl: input.amountMl,
      mood: "Calm",
      energyLevel: 75,
      restingHeartRate: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return getWaterSummaryForDate(userId, input.date);
}

export async function listActiveWellnessTips() {
  const db = getDb();
  return db
    .select()
    .from(healthTips)
    .where(eq(healthTips.isActive, true))
    .orderBy(desc(healthTips.createdAt));
}

