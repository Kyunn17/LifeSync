import {
  getDb,
  user,
  session,
  activities,
  dailySchedules,
  healthTips,
  eq,
  desc,
  asc,
  sql,
} from "@lifesync/db";
import type {
  AdminUpdateUserInput,
  ActivityCategoryInput,
  WellnessTipInput,
  UpdateWellnessTipInput,
} from "@lifesync/shared";
import {
  createCustomCategory,
  updateCategory,
  deleteCategory,
} from "./activity.service";

export async function getPlatformStats() {
  const db = getDb();

  const [
    usersCountRows,
    activeUsersRows,
    categoriesRows,
    schedulesCountRows,
    tipsCountRows,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(user),
    db
      .select({
        count: sql<number>`count(distinct ${session.userId})::int`,
      })
      .from(session),
    db.select({ count: sql<number>`count(*)::int` }).from(activities),
    db.select({ count: sql<number>`count(*)::int` }).from(dailySchedules),
    db.select({ count: sql<number>`count(*)::int` }).from(healthTips),
  ]);

  const allUsers = await db
    .select({
      role: user.role,
      banned: user.banned,
    })
    .from(user);

  const adminCount = allUsers.filter((u) => u.role === "ADMIN").length;
  const bannedCount = allUsers.filter((u) => u.banned).length;

  return {
    totalRegisteredUsers: usersCountRows[0]?.count ?? 0,
    activeSessionUsers: activeUsersRows[0]?.count ?? 0,
    adminUsersCount: adminCount,
    suspendedUsersCount: bannedCount,
    totalCategoriesCount: categoriesRows[0]?.count ?? 0,
    totalScheduledBlocksCount: schedulesCountRows[0]?.count ?? 0,
    totalWellnessTipsCount: tipsCountRows[0]?.count ?? 0,
  };
}

export async function listAllUsersForAdmin() {
  const db = getDb();

  // Privacy requirement: Only return account-level metadata, never personal wellness logs
  const usersList = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return usersList;
}

export async function updateUserByAdmin(
  targetUserId: string,
  adminUserId: string,
  input: AdminUpdateUserInput
) {
  const db = getDb();

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  if (!existing[0]) {
    return { error: "NOT_FOUND" as const, message: "Target user not found." };
  }

  // Prevent an admin from accidentally demoting or banning their own active account
  if (targetUserId === adminUserId) {
    if (input.role && input.role !== "ADMIN") {
      return {
        error: "SELF_DEMOTION_FORBIDDEN" as const,
        message: "Administrators cannot remove their own ADMIN role.",
      };
    }
    if (input.banned === true) {
      return {
        error: "SELF_BAN_FORBIDDEN" as const,
        message: "Administrators cannot suspend their own account.",
      };
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.role !== undefined) updates.role = input.role;
  if (input.banned !== undefined) updates.banned = input.banned;

  await db.update(user).set(updates).where(eq(user.id, targetUserId));

  const updated = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  return { data: updated[0] };
}

export async function listSystemAndAllCategoriesForAdmin() {
  const db = getDb();
  return db
    .select()
    .from(activities)
    .orderBy(desc(activities.isSystem), asc(activities.name));
}

export async function createSystemCategoryByAdmin(
  adminId: string,
  input: ActivityCategoryInput
) {
  return createCustomCategory(adminId, input, true);
}

export async function updateCategoryByAdmin(
  categoryId: string,
  adminId: string,
  input: Partial<ActivityCategoryInput>
) {
  return updateCategory(categoryId, adminId, "ADMIN", input);
}

export async function deleteCategoryByAdmin(
  categoryId: string,
  adminId: string
) {
  return deleteCategory(categoryId, adminId, "ADMIN");
}

export async function listAllTipsForAdmin() {
  const db = getDb();
  return db
    .select()
    .from(healthTips)
    .orderBy(desc(healthTips.createdAt));
}

export async function createWellnessTipByAdmin(
  adminId: string,
  input: WellnessTipInput
) {
  const db = getDb();

  const newTip = {
    id: `tip_${crypto.randomUUID()}`,
    title: input.title.trim(),
    category: input.category.trim(),
    content: input.content.trim(),
    actionLabel: input.actionLabel?.trim() || null,
    icon: input.icon || "lightbulb",
    isActive: input.isActive ?? true,
    createdBy: adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(healthTips).values(newTip);
  return newTip;
}

export async function updateWellnessTipByAdmin(
  tipId: string,
  input: UpdateWellnessTipInput
) {
  const db = getDb();

  const existing = await db
    .select()
    .from(healthTips)
    .where(eq(healthTips.id, tipId))
    .limit(1);

  if (!existing[0]) {
    return { error: "NOT_FOUND" as const };
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.category !== undefined) updates.category = input.category.trim();
  if (input.content !== undefined) updates.content = input.content.trim();
  if (input.actionLabel !== undefined)
    updates.actionLabel = input.actionLabel?.trim() || null;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  await db.update(healthTips).set(updates).where(eq(healthTips.id, tipId));

  const refreshed = await db
    .select()
    .from(healthTips)
    .where(eq(healthTips.id, tipId))
    .limit(1);

  return { data: refreshed[0] };
}

export async function deleteWellnessTipByAdmin(tipId: string) {
  const db = getDb();

  const existing = await db
    .select()
    .from(healthTips)
    .where(eq(healthTips.id, tipId))
    .limit(1);

  if (!existing[0]) {
    return { error: "NOT_FOUND" as const };
  }

  await db.delete(healthTips).where(eq(healthTips.id, tipId));
  return { data: { id: tipId, deleted: true } };
}
