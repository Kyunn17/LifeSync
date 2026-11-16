import {
  getDb,
  user,
  profile,
  dailySchedules,
  activities,
  waterLogs,
  healthLogs,
  dailyCheckins,
  weightLogs,
  session,
  account,
  eq,
  and,
} from "@lifesync/db";
import type {
  OnboardingProfileInput,
  UpdateProfileInput,
} from "@lifesync/shared";
import { calculateDynamicMetrics } from "./biometrics.service";

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
    dailyPushupGoal: 20,
    onboardingCompleted: false,
    isAutoCalculated: true,
    gender: "MALE",
    age: 25,
    weightKg: 65,
    heightCm: 170,
    neatLevel: "MODERATE",
    fitnessGoal: "MAINTENANCE",
    fitnessLevel: "BEGINNER",
    medicalConditions: [] as string[],
    customMedicalCondition: null,
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
  const biometrics = calculateDynamicMetrics({
    gender: userProfile.gender,
    age: userProfile.age,
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
    neatLevel: userProfile.neatLevel,
    fitnessGoal: userProfile.fitnessGoal,
    fitnessLevel: userProfile.fitnessLevel,
    medicalConditions: userProfile.medicalConditions,
    customMedicalCondition: userProfile.customMedicalCondition,
  });

  return {
    ...foundUser,
    profile: {
      ...userProfile,
      biometrics,
    },
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
  if (input.dailyPushupGoal !== undefined) profileUpdates.dailyPushupGoal = input.dailyPushupGoal;
  if (input.onboardingCompleted !== undefined) profileUpdates.onboardingCompleted = input.onboardingCompleted;
  if (input.isAutoCalculated !== undefined) profileUpdates.isAutoCalculated = input.isAutoCalculated;
  if (input.gender !== undefined) profileUpdates.gender = input.gender;
  if (input.age !== undefined) profileUpdates.age = input.age;
  if (input.weightKg !== undefined) profileUpdates.weightKg = input.weightKg;
  if (input.heightCm !== undefined) profileUpdates.heightCm = input.heightCm;
  if (input.neatLevel !== undefined) profileUpdates.neatLevel = input.neatLevel;
  if (input.fitnessGoal !== undefined) profileUpdates.fitnessGoal = input.fitnessGoal;
  if (input.fitnessLevel !== undefined) profileUpdates.fitnessLevel = input.fitnessLevel;
  if (input.medicalConditions !== undefined) profileUpdates.medicalConditions = input.medicalConditions;
  if (input.customMedicalCondition !== undefined) profileUpdates.customMedicalCondition = input.customMedicalCondition;
  if (input.bio !== undefined) profileUpdates.bio = input.bio;
  if (input.timezone !== undefined) profileUpdates.timezone = input.timezone;
  if (input.notificationsEnabled !== undefined) profileUpdates.notificationsEnabled = input.notificationsEnabled;

  await db
    .update(profile)
    .set(profileUpdates)
    .where(eq(profile.userId, userId));

  return getUserWithProfile(userId);
}

export async function completeOnboarding(
  userId: string,
  input: OnboardingProfileInput
) {
  const db = getDb();
  await getOrCreateProfile(userId);

  const cleanConditions = input.medicalConditions.filter(
    (c) => c.trim().length > 0 && c !== "NONE"
  );
  const customCondition = input.customMedicalCondition?.trim() || null;

  const calculated = calculateDynamicMetrics({
    gender: input.gender,
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    neatLevel: input.neatLevel,
    fitnessGoal: input.fitnessGoal,
    fitnessLevel: input.fitnessLevel,
    medicalConditions: cleanConditions,
    customMedicalCondition: customCondition,
  });

  const primaryFocusMap: Record<string, string> = {
    CUTTING: "Healthy Weight Loss & Metabolic Flow",
    BULKING: "Strength & Lean Muscle Growth",
    ENDURANCE: "Cardio Endurance & Stamina",
    MAINTENANCE: "Optimal Sleep & Holistic Balance",
  };

  const profileUpdates: Record<string, unknown> = {
    onboardingCompleted: true,
    isAutoCalculated: true,
    gender: input.gender,
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    neatLevel: input.neatLevel,
    fitnessGoal: input.fitnessGoal,
    fitnessLevel: input.fitnessLevel,
    medicalConditions: cleanConditions,
    customMedicalCondition: customCondition,
    primaryFocus: primaryFocusMap[input.fitnessGoal] ?? "Optimal Sleep & Holistic Balance",
    dailyCalorieGoal: calculated.dailyCalorieGoal,
    dailyWaterGoalMl: calculated.dailyWaterGoalMl,
    dailyStepsGoal: calculated.dailyStepsGoal,
    dailyExerciseGoalMinutes: calculated.dailyExerciseGoalMinutes,
    dailyPushupGoal: calculated.dailyPushupGoal,
    dailySleepGoalMinutes: calculated.dailySleepGoalMinutes,
    updatedAt: new Date(),
  };

  if (input.targetWakeTime !== undefined) {
    profileUpdates.targetWakeTime = input.targetWakeTime;
  }
  if (input.targetSleepTime !== undefined) {
    profileUpdates.targetSleepTime = input.targetSleepTime;
  }

  await db
    .update(profile)
    .set(profileUpdates)
    .where(eq(profile.userId, userId));

  // Record initial / onboarding weight log for today if none exists yet for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingToday = await db
    .select()
    .from(weightLogs)
    .where(and(eq(weightLogs.userId, userId), eq(weightLogs.date, todayStr)))
    .limit(1);

  if (!existingToday.length) {
    await db.insert(weightLogs).values({
      id: `wlog_${crypto.randomUUID()}`,
      userId,
      date: todayStr,
      weightKg: input.weightKg,
      previousWeightKg: null,
      deltaKg: 0,
      isAnomaly: false,
      anomalyNote: null,
      notes: "Berat badan awal (Onboarding Profil)",
      loggedAt: new Date(),
      createdAt: new Date(),
    });
  }

  return getUserWithProfile(userId);
}

export async function recalculateUserGoals(userId: string) {
  const db = getDb();
  const userProfile = await getOrCreateProfile(userId);

  const calculated = calculateDynamicMetrics({
    gender: userProfile.gender,
    age: userProfile.age,
    weightKg: userProfile.weightKg,
    heightCm: userProfile.heightCm,
    neatLevel: userProfile.neatLevel,
    fitnessGoal: userProfile.fitnessGoal,
    fitnessLevel: userProfile.fitnessLevel,
    medicalConditions: userProfile.medicalConditions,
    customMedicalCondition: userProfile.customMedicalCondition,
  });

  await db
    .update(profile)
    .set({
      isAutoCalculated: true,
      dailyCalorieGoal: calculated.dailyCalorieGoal,
      dailyWaterGoalMl: calculated.dailyWaterGoalMl,
      dailyStepsGoal: calculated.dailyStepsGoal,
      dailyExerciseGoalMinutes: calculated.dailyExerciseGoalMinutes,
      dailyPushupGoal: calculated.dailyPushupGoal,
      dailySleepGoalMinutes: calculated.dailySleepGoalMinutes,
      updatedAt: new Date(),
    })
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
  await db.delete(weightLogs).where(eq(weightLogs.userId, userId));
  await db.delete(profile).where(eq(profile.userId, userId));
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(user).where(eq(user.id, userId));

  return true;
}

