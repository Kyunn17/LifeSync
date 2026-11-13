import {
  getDb,
  user,
  profile,
  dailySchedules,
  activities,
  waterLogs,
  healthLogs,
  dailyCheckins,
  session,
  account,
  eq,
} from "@lifesync/db";
import type { UpdateProfileInput } from "@lifesync/shared";

export async function getOrCreateProfile(userId: string) {
  const db = getDb();

  const existing = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const newProfile = {
    id: `prof_${crypto.randomUUID()}`,
    userId,
    bio: null,
    primaryFocus: "Optimal Sleep & Recovery",
    targetWakeTime: "06:45",
    targetSleepTime: "22:30",
    dailyWaterGoalMl: 2500,
    dailyStepsGoal: 10000,
    dailySleepGoalMinutes: 480,
    dailyExerciseGoalMinutes: 45,
    dailyCalorieGoal: 2000,
    timezone: "UTC",
    notificationsEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(profile).values(newProfile);
  return newProfile;
}

export async function getUserWithProfile(userId: string) {
  const db = getDb();

  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const foundUser = users[0];
  if (!foundUser) {
    return null;
  }

  const userProfile = await getOrCreateProfile(userId);
  return {
    ...foundUser,
    profile: userProfile,
  };
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
) {
  const db = getDb();

  if (input.name !== undefined) {
    await db
      .update(user)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));
  }

  await getOrCreateProfile(userId);

  const profileUpdates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.primaryFocus !== undefined) profileUpdates.primaryFocus = input.primaryFocus;
  if (input.targetWakeTime !== undefined) profileUpdates.targetWakeTime = input.targetWakeTime;
  if (input.targetSleepTime !== undefined) profileUpdates.targetSleepTime = input.targetSleepTime;
  if (input.dailyWaterGoalMl !== undefined) profileUpdates.dailyWaterGoalMl = input.dailyWaterGoalMl;
  if (input.dailyStepsGoal !== undefined) profileUpdates.dailyStepsGoal = input.dailyStepsGoal;
  if (input.dailySleepGoalMinutes !== undefined) profileUpdates.dailySleepGoalMinutes = input.dailySleepGoalMinutes;
  if (input.dailyExerciseGoalMinutes !== undefined) profileUpdates.dailyExerciseGoalMinutes = input.dailyExerciseGoalMinutes;
  if (input.dailyCalorieGoal !== undefined) profileUpdates.dailyCalorieGoal = input.dailyCalorieGoal;
  if (input.bio !== undefined) profileUpdates.bio = input.bio;
  if (input.timezone !== undefined) profileUpdates.timezone = input.timezone;
  if (input.notificationsEnabled !== undefined) profileUpdates.notificationsEnabled = input.notificationsEnabled;

  await db
    .update(profile)
    .set(profileUpdates)
    .where(eq(profile.userId, userId));

  return getUserWithProfile(userId);
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const db = getDb();

  // Delete all user records in proper dependency order
  await db.delete(dailySchedules).where(eq(dailySchedules.userId, userId));
  await db.delete(activities).where(eq(activities.userId, userId));
  await db.delete(waterLogs).where(eq(waterLogs.userId, userId));
  await db.delete(healthLogs).where(eq(healthLogs.userId, userId));
  await db.delete(dailyCheckins).where(eq(dailyCheckins.userId, userId));
  await db.delete(profile).where(eq(profile.userId, userId));
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(user).where(eq(user.id, userId));

  return true;
}

