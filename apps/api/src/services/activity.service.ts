import {
  getDb,
  activities,
  eq,
  or,
  and,
  isNull,
  asc,
} from "@lifesync/db";
import type { ActivityCategoryInput } from "@lifesync/shared";

export async function listCategoriesForUser(userId: string) {
  const db = getDb();

  const rows = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.isActive, true),
        or(eq(activities.isSystem, true), isNull(activities.userId), eq(activities.userId, userId))
      )
    )
    .orderBy(asc(activities.createdAt));

  return rows;
}

export async function getCategoryById(categoryId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.id, categoryId))
    .limit(1);
  return rows[0] || null;
}

export async function createCustomCategory(
  userId: string,
  input: ActivityCategoryInput,
  isSystem = false
) {
  const db = getDb();
  const slug =
    input.slug ||
    input.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const newCategory = {
    id: `cat_${crypto.randomUUID().slice(0, 12)}`,
    userId: isSystem ? null : userId,
    name: input.name,
    slug,
    color: input.color,
    bgColor: input.bgColor,
    icon: input.icon,
    description: input.description ?? null,
    targetMinutesPerDay: input.targetMinutesPerDay,
    isSystem,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(activities).values(newCategory);
  return newCategory;
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  userRole: "USER" | "ADMIN",
  input: Partial<ActivityCategoryInput>
) {
  const db = getDb();
  const existing = await getCategoryById(categoryId);

  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }

  if (existing.isSystem && userRole !== "ADMIN") {
    return { error: "FORBIDDEN" as const };
  }

  if (!existing.isSystem && existing.userId !== userId && userRole !== "ADMIN") {
    return { error: "FORBIDDEN" as const };
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.slug !== undefined) updates.slug = input.slug;
  if (input.color !== undefined) updates.color = input.color;
  if (input.bgColor !== undefined) updates.bgColor = input.bgColor;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.description !== undefined) updates.description = input.description;
  if (input.targetMinutesPerDay !== undefined) {
    updates.targetMinutesPerDay = input.targetMinutesPerDay;
  }

  await db
    .update(activities)
    .set(updates)
    .where(eq(activities.id, categoryId));

  const updated = await getCategoryById(categoryId);
  return { data: updated };
}

export async function deleteCategory(
  categoryId: string,
  userId: string,
  userRole: "USER" | "ADMIN"
) {
  const db = getDb();
  const existing = await getCategoryById(categoryId);

  if (!existing) {
    return { error: "NOT_FOUND" as const };
  }

  if (existing.isSystem && userRole !== "ADMIN") {
    return { error: "FORBIDDEN" as const };
  }

  if (!existing.isSystem && existing.userId !== userId && userRole !== "ADMIN") {
    return { error: "FORBIDDEN" as const };
  }

  // Soft-deactivate if system category or hard-delete if custom
  if (existing.isSystem) {
    await db
      .update(activities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(activities.id, categoryId));
  } else {
    await db.delete(activities).where(eq(activities.id, categoryId));
  }

  return { data: { id: categoryId, deleted: true } };
}
