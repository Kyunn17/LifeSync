import { createDbClient, eq } from "./index";
import { activities, healthTips } from "./schema";
import { DEFAULT_ACTIVITY_CATEGORIES } from "@lifesync/shared";

const DEFAULT_TIPS = [
  {
    id: "tip_morning_photon",
    title: "Morning Photon Exposure",
    category: "Circadian Reset",
    badgeText: "High Impact",
    content:
      "Target 15 minutes of outdoor natural light within 45 minutes of waking up to anchor your master circadian clock and improve sleep onset tonight.",
    icon: "wb_sunny",
    isActive: true,
  },
  {
    id: "tip_caffeine_cutoff",
    title: "Caffeine Cutoff Window",
    category: "Adenosine Buffer",
    badgeText: "Sleep Shield",
    content:
      "Conclude stimulant intake 8 to 10 hours prior to your target sleep window to protect deep slow-wave sleep phases and lower nocturnal heart rate.",
    icon: "local_cafe",
    isActive: true,
  },
  {
    id: "tip_physiological_sigh",
    title: "Evening Physiological Sigh",
    category: "Parasympathetic Mode",
    badgeText: "Stress Calibration",
    content:
      "Perform 5 minutes of double-inhalation cyclic sighing during your evening wind-down block to reduce autonomic arousal before bed.",
    icon: "spa",
    isActive: true,
  },
  {
    id: "tip_post_meal_walk",
    title: "Post-Meal 15-Minute Walk",
    category: "Metabolic Push",
    badgeText: "Steady Energy",
    content:
      "Scheduling a light 15-minute walk after lunch stabilizes postprandial glucose and prevents the mid-afternoon cognitive dip.",
    icon: "directions_walk",
    isActive: true,
  },
];

export async function seedDefaults(databaseUrl?: string) {
  const db = createDbClient(databaseUrl);

  for (const cat of DEFAULT_ACTIVITY_CATEGORIES) {
    const id = `cat_${cat.slug}`;
    const existing = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(activities).values({
        id,
        userId: null,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        bgColor: cat.bgColor,
        icon: cat.icon,
        description: cat.description,
        targetMinutesPerDay: cat.targetMinutesPerDay,
        isSystem: true,
        isActive: true,
      });
    }
  }

  for (const tip of DEFAULT_TIPS) {
    const existing = await db
      .select()
      .from(healthTips)
      .where(eq(healthTips.id, tip.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(healthTips).values(tip);
    }
  }
}

if (import.meta.main) {
  seedDefaults()
    .then(() => {
      console.log("Successfully seeded default categories and wellness tips.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to seed database:", err);
      process.exit(1);
    });
}

