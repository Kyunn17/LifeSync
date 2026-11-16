import { getDb, profile, weightLogs, eq, desc } from "@lifesync/db";
import type {
  FitnessGoal,
  FitnessLevel,
  Gender,
  NeatLevel,
  WeightLogInput,
} from "@lifesync/shared";

export interface BiometricInput {
  gender?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  neatLevel?: string | null;
  fitnessGoal?: string | null;
  fitnessLevel?: string | null;
  medicalConditions?: string[] | null;
  customMedicalCondition?: string | null;
}

export interface DynamicMetricsResult {
  bmi: number;
  bmiCategory: "Underweight" | "Normal" | "Overweight" | "Obese";
  bmr: number;
  tdee: number;
  neatMultiplier: number;
  dailyCalorieGoal: number;
  macroTargets: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  dailyWaterGoalMl: number;
  dailyStepsGoal: number;
  dailyExerciseGoalMinutes: number;
  dailyPushupGoal: number;
  dailySleepGoalMinutes: number;
  advisories: string[];
}

const NEAT_MULTIPLIERS: Record<NeatLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const NEAT_STEPS_BASE: Record<NeatLevel, number> = {
  SEDENTARY: 6000,
  LIGHT: 7500,
  MODERATE: 9500,
  ACTIVE: 11500,
  VERY_ACTIVE: 13000,
};

const FITNESS_PUSHUP_BASE: Record<FitnessLevel, number> = {
  BEGINNER: 15,
  INTERMEDIATE: 35,
  ADVANCED: 60,
};

const FITNESS_EXERCISE_MINUTES: Record<FitnessLevel, number> = {
  BEGINNER: 30,
  INTERMEDIATE: 45,
  ADVANCED: 60,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateDynamicMetrics(
  raw: BiometricInput
): DynamicMetricsResult {
  const gender: Gender = raw.gender === "FEMALE" ? "FEMALE" : "MALE";
  const age = clamp(Math.round(raw.age ?? 25), 10, 120);
  const weightKg = clamp(raw.weightKg ?? 65, 20, 350);
  const heightCm = clamp(raw.heightCm ?? 170, 80, 260);

  const neatLevel: NeatLevel =
    raw.neatLevel && raw.neatLevel in NEAT_MULTIPLIERS
      ? (raw.neatLevel as NeatLevel)
      : "MODERATE";

  const fitnessGoal: FitnessGoal =
    raw.fitnessGoal === "CUTTING" ||
    raw.fitnessGoal === "MAINTENANCE" ||
    raw.fitnessGoal === "BULKING" ||
    raw.fitnessGoal === "ENDURANCE"
      ? raw.fitnessGoal
      : "MAINTENANCE";

  const fitnessLevel: FitnessLevel =
    raw.fitnessLevel === "BEGINNER" ||
    raw.fitnessLevel === "INTERMEDIATE" ||
    raw.fitnessLevel === "ADVANCED"
      ? raw.fitnessLevel
      : "BEGINNER";

  const conditions = (raw.medicalConditions ?? []).filter(
    (c) => c && c !== "NONE"
  );
  const customCondition = raw.customMedicalCondition?.trim() || "";

  // 1. BMI
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  let bmiCategory: DynamicMetricsResult["bmiCategory"] = "Normal";
  if (bmi < 18.5) bmiCategory = "Underweight";
  else if (bmi < 25) bmiCategory = "Normal";
  else if (bmi < 30) bmiCategory = "Overweight";
  else bmiCategory = "Obese";

  // 2. BMR (Mifflin-St Jeor Equation)
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(gender === "MALE" ? baseBmr + 5 : baseBmr - 161);

  // 3. TDEE via NEAT
  const neatMultiplier = NEAT_MULTIPLIERS[neatLevel];
  const tdee = Math.round(bmr * neatMultiplier);

  // 4. Medical guardrails
  const hasDiabetes = conditions.includes("DIABETES");
  const hasPregnancy = conditions.includes("PREGNANCY");
  const hasCardiac = conditions.includes("HEART_CONDITION");
  const hasJointPain = conditions.includes("JOINT_PAIN");
  const hasBackInjury = conditions.includes("BACK_INJURY");
  const hasAsthma = conditions.includes("ASTHMA");
  const hasHypertension = conditions.includes("HYPERTENSION");
  const hasVertigo = conditions.includes("VERTIGO");

  const needsJointOrCardiacCap =
    hasCardiac || hasJointPain || hasBackInjury || hasPregnancy;

  // 5. Daily Calorie Goal
  let dailyCalorieGoal = tdee;
  if (fitnessGoal === "CUTTING") {
    const deficit = hasDiabetes || hasPregnancy ? 200 : 400;
    const floor = gender === "MALE" ? 1400 : 1200;
    dailyCalorieGoal = Math.max(floor, tdee - deficit);
  } else if (fitnessGoal === "BULKING") {
    dailyCalorieGoal = tdee + 350;
  } else if (fitnessGoal === "ENDURANCE") {
    dailyCalorieGoal = tdee + 200;
  }

  // 6. Macro targets
  const proteinPerKg =
    fitnessGoal === "BULKING" || fitnessGoal === "CUTTING" ? 1.8 : 1.5;
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const fatGrams = Math.round((dailyCalorieGoal * 0.25) / 9);
  const carbsGrams = Math.max(
    50,
    Math.round((dailyCalorieGoal - proteinGrams * 4 - fatGrams * 9) / 4)
  );

  // 7. Daily Water Goal
  let waterBase = Math.round((weightKg * 35) / 50) * 50;
  if (neatLevel === "MODERATE") waterBase += 300;
  else if (neatLevel === "ACTIVE" || neatLevel === "VERY_ACTIVE") waterBase += 500;
  const dailyWaterGoalMl = clamp(waterBase, 1500, 5000);

  // 8. Daily Steps Goal
  let dailyStepsGoal = NEAT_STEPS_BASE[neatLevel];
  if (needsJointOrCardiacCap) {
    dailyStepsGoal = Math.min(dailyStepsGoal, 6000);
  }

  // 9. Daily Push-up & Exercise Goals
  const weightScale = clamp(70 / weightKg, 0.7, 1.3);
  let dailyPushupGoal = Math.max(
    5,
    Math.round(FITNESS_PUSHUP_BASE[fitnessLevel] * weightScale)
  );
  let dailyExerciseGoalMinutes = FITNESS_EXERCISE_MINUTES[fitnessLevel];

  if (needsJointOrCardiacCap) {
    dailyPushupGoal = Math.max(5, Math.round(dailyPushupGoal * 0.5));
    dailyExerciseGoalMinutes = Math.min(dailyExerciseGoalMinutes, 30);
  }

  // 10. Sleep recommendation
  let dailySleepGoalMinutes = 480;
  if (age < 22) dailySleepGoalMinutes = 510;
  else if (age >= 60) dailySleepGoalMinutes = 450;

  // 11. Health safety advisories
  const advisories: string[] = [];
  if (hasCardiac || hasHypertension) {
    advisories.push(
      "Intensitas latihan & langkah disesuaikan agar detak jantung tetap aman (hindari beban mendadak)."
    );
  }
  if (hasJointPain || hasBackInjury) {
    advisories.push(
      "Target langkah dibatasi maks. 6.000 & target push-up dikurangi 50% (gunakan variasi tumpuan lutut/dinding bila nyeri)."
    );
  }
  if (hasDiabetes) {
    advisories.push(
      "Defisit kalori diperhalus agar kadar gula darah tetap stabil sepanjang hari."
    );
  }
  if (hasPregnancy) {
    advisories.push(
      "Mode kehamilan aktif: defisit kalori ketat dinonaktifkan dan target aktivitas dibuat low-impact."
    );
  }
  if (hasAsthma) {
    advisories.push(
      "Sediakan pemanasan 5-10 menit sebelum latihan fisik dan hindari pemicu napas pendek."
    );
  }
  if (hasVertigo) {
    advisories.push(
      "Hindari perubahan posisi kepala mendadak saat push-up; lakukan jeda antar set."
    );
  }
  if (customCondition) {
    advisories.push(
      `Catatan kondisi khusus (${customCondition}): sesuaikan ritme latihan dengan kenyamanan tubuh Anda.`
    );
  }

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    neatMultiplier,
    dailyCalorieGoal,
    macroTargets: {
      proteinGrams,
      carbsGrams,
      fatGrams,
    },
    dailyWaterGoalMl,
    dailyStepsGoal,
    dailyExerciseGoalMinutes,
    dailyPushupGoal,
    dailySleepGoalMinutes,
    advisories,
  };
}

export interface WeightLogResult {
  requiresConfirmation: boolean;
  previousWeightKg: number | null;
  newWeightKg: number;
  deltaKg: number;
  message?: string;
  log?: typeof weightLogs.$inferSelect;
  updatedGoals?: DynamicMetricsResult;
}

export async function logUserWeight(
  userId: string,
  input: WeightLogInput
): Promise<WeightLogResult> {
  const db = getDb();

  const [existingProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  const [latestLog] = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.date), desc(weightLogs.loggedAt))
    .limit(1);

  const previousWeightKg =
    latestLog?.weightKg ?? existingProfile?.weightKg ?? null;

  const deltaKg =
    previousWeightKg !== null
      ? Number((input.weightKg - previousWeightKg).toFixed(1))
      : 0;

  const isAnomaly = previousWeightKg !== null && Math.abs(deltaKg) >= 10;

  if (isAnomaly) {
    const cleanNote = input.anomalyNote?.trim() ?? "";
    if (!input.confirmAnomaly || cleanNote.length < 3) {
      return {
        requiresConfirmation: true,
        previousWeightKg,
        newWeightKg: input.weightKg,
        deltaKg,
        message:
          `Perubahan berat badan drastis (${deltaKg >= 0 ? "+" : ""}${deltaKg} kg) terdeteksi. ` +
          `Mohon konfirmasi apakah berat ${input.weightKg} kg sudah benar dan tuliskan catatan alasannya.`,
      };
    }
  }

  const newLog = {
    id: `wlog_${crypto.randomUUID()}`,
    userId,
    date: input.date,
    weightKg: input.weightKg,
    previousWeightKg,
    deltaKg,
    isAnomaly,
    anomalyNote: input.anomalyNote?.trim() || null,
    notes: input.notes?.trim() || null,
    loggedAt: new Date(),
    createdAt: new Date(),
  };

  await db.insert(weightLogs).values(newLog);

  let updatedGoals: DynamicMetricsResult | undefined;
  if (existingProfile) {
    const profileUpdate: Record<string, unknown> = {
      weightKg: input.weightKg,
      updatedAt: new Date(),
    };

    if (existingProfile.isAutoCalculated) {
      updatedGoals = calculateDynamicMetrics({
        gender: existingProfile.gender,
        age: existingProfile.age,
        weightKg: input.weightKg,
        heightCm: existingProfile.heightCm,
        neatLevel: existingProfile.neatLevel,
        fitnessGoal: existingProfile.fitnessGoal,
        fitnessLevel: existingProfile.fitnessLevel,
        medicalConditions: existingProfile.medicalConditions,
        customMedicalCondition: existingProfile.customMedicalCondition,
      });

      profileUpdate.dailyCalorieGoal = updatedGoals.dailyCalorieGoal;
      profileUpdate.dailyWaterGoalMl = updatedGoals.dailyWaterGoalMl;
      profileUpdate.dailyStepsGoal = updatedGoals.dailyStepsGoal;
      profileUpdate.dailyExerciseGoalMinutes =
        updatedGoals.dailyExerciseGoalMinutes;
      profileUpdate.dailyPushupGoal = updatedGoals.dailyPushupGoal;
      profileUpdate.dailySleepGoalMinutes = updatedGoals.dailySleepGoalMinutes;
    }

    await db
      .update(profile)
      .set(profileUpdate)
      .where(eq(profile.userId, userId));
  }

  return {
    requiresConfirmation: false,
    previousWeightKg,
    newWeightKg: input.weightKg,
    deltaKg,
    log: newLog,
    updatedGoals,
  };
}

export interface WeightEvaluationResult {
  logs: (typeof weightLogs.$inferSelect)[];
  evaluation: {
    fitnessGoal: string;
    currentWeightKg: number | null;
    baselineWeightKg: number | null;
    weeklyDeltaKg: number | null;
    status:
      | "OPTIMAL"
      | "TOO_FAST"
      | "PLATEAU"
      | "SLIGHTLY_HIGH"
      | "INSUFFICIENT_DATA";
    badge: string;
    summary: string;
    daysTracked: number;
  };
}

export async function getWeightEvaluation(
  userId: string
): Promise<WeightEvaluationResult> {
  const db = getDb();

  const [userProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  const logs = await db
    .select()
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.date), desc(weightLogs.loggedAt))
    .limit(30);

  const fitnessGoal = userProfile?.fitnessGoal ?? "MAINTENANCE";

  if (logs.length < 2) {
    return {
      logs,
      evaluation: {
        fitnessGoal,
        currentWeightKg: logs[0]?.weightKg ?? userProfile?.weightKg ?? null,
        baselineWeightKg: null,
        weeklyDeltaKg: null,
        status: "INSUFFICIENT_DATA",
        badge: "Menunggu Data Mingguan",
        summary:
          "Catat berat badan secara rutin minimal 2 kali dalam seminggu untuk melihat evaluasi progres diet/kebugaran Anda.",
        daysTracked: logs.length,
      },
    };
  }

  const latest = logs[0]!;
  const latestTime = new Date(`${latest.date}T00:00:00Z`).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Find closest log at or around 7 days ago, or fallback to earliest log in last 14 days
  let baseline = logs[logs.length - 1]!;
  let bestDiff = Infinity;
  for (let i = 1; i < logs.length; i++) {
    const candidate = logs[i]!;
    const candidateTime = new Date(`${candidate.date}T00:00:00Z`).getTime();
    const diffFromSevenDays = Math.abs(
      latestTime - candidateTime - sevenDaysMs
    );
    if (diffFromSevenDays < bestDiff) {
      bestDiff = diffFromSevenDays;
      baseline = candidate;
    }
  }

  const weeklyDeltaKg = Number(
    (latest.weightKg - baseline.weightKg).toFixed(2)
  );
  const absDelta = Math.abs(weeklyDeltaKg);

  let status: WeightEvaluationResult["evaluation"]["status"] = "OPTIMAL";
  let badge = "Progres Stabil";
  let summary = "";

  if (fitnessGoal === "CUTTING") {
    if (weeklyDeltaKg <= -0.15 && weeklyDeltaKg >= -1.0) {
      status = "OPTIMAL";
      badge = "Progres Cutting Ideal";
      summary = `Penurunan ${absDelta} kg sejak ${baseline.date} sangat bagus dan sehat untuk fase Cutting (rentang ideal -0.2 s/d -0.8 kg/minggu).`;
    } else if (weeklyDeltaKg < -1.0) {
      status = "TOO_FAST";
      badge = "Defisit Terlalu Cepat";
      summary = `Penurunan ${absDelta} kg cukup ekstrem. Pastikan asupan protein tercukupi agar massa otot dan energi tidak ikut turun.`;
    } else {
      status = "PLATEAU";
      badge = "Perlu Evaluasi Defisit";
      summary = `Berat badan berubah ${weeklyDeltaKg >= 0 ? "+" : ""}${weeklyDeltaKg} kg. Coba perhatikan asupan kalori harian atau tambah aktivitas langkah (NEAT).`;
    }
  } else if (fitnessGoal === "BULKING") {
    if (weeklyDeltaKg >= 0.15 && weeklyDeltaKg <= 0.6) {
      status = "OPTIMAL";
      badge = "Lean Bulking Optimal";
      summary = `Kenaikan +${weeklyDeltaKg} kg sejak ${baseline.date} berada pada kecepatan ideal untuk membangun massa otot bersih.`;
    } else if (weeklyDeltaKg > 0.6) {
      status = "SLIGHTLY_HIGH";
      badge = "Surplus Agak Tinggi";
      summary = `Kenaikan +${weeklyDeltaKg} kg cukup cepat; pertimbangkan sedikit mengecilkan surplus agar penumpukan lemak minimal.`;
    } else {
      status = "PLATEAU";
      badge = "Surplus Belum Tercapai";
      summary = `Berat badan berubah ${weeklyDeltaKg >= 0 ? "+" : ""}${weeklyDeltaKg} kg. Pastikan kalori dan protein harian melampaui kebutuhan maintenance.`;
    }
  } else {
    if (absDelta <= 0.4) {
      status = "OPTIMAL";
      badge = "Berat Badan Stabil";
      summary = `Fluktuasi ${weeklyDeltaKg >= 0 ? "+" : ""}${weeklyDeltaKg} kg berada di rentang sehat dan stabil sesuai target Maintenance.`;
    } else {
      status = "SLIGHTLY_HIGH";
      badge = "Fluktuasi Terdeteksi";
      summary = `Terdapat perubahan ${weeklyDeltaKg >= 0 ? "+" : ""}${weeklyDeltaKg} kg dalam periode ini. Pantau keseimbangan kalori & hidrasi Anda.`;
    }
  }

  return {
    logs,
    evaluation: {
      fitnessGoal,
      currentWeightKg: latest.weightKg,
      baselineWeightKg: baseline.weightKg,
      weeklyDeltaKg,
      status,
      badge,
      summary,
      daysTracked: logs.length,
    },
  };
}

