import { relations } from "drizzle-orm";
import { user, session, account } from "./auth";
import {
  profile,
  activities,
  dailySchedules,
  healthLogs,
  dailyCheckins,
  waterLogs,
  healthTips,
} from "./wellness";
import { mealLogs, customFoods } from "./nutrition";

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profile, {
    fields: [user.id],
    references: [profile.userId],
  }),
  sessions: many(session),
  accounts: many(account),
  activities: many(activities),
  dailySchedules: many(dailySchedules),
  healthLogs: many(healthLogs),
  dailyCheckins: many(dailyCheckins),
  waterLogs: many(waterLogs),
  authoredTips: many(healthTips),
  mealLogs: many(mealLogs),
  customFoods: many(customFoods),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  user: one(user, {
    fields: [activities.userId],
    references: [user.id],
  }),
  dailySchedules: many(dailySchedules),
}));

export const dailySchedulesRelations = relations(dailySchedules, ({ one }) => ({
  user: one(user, {
    fields: [dailySchedules.userId],
    references: [user.id],
  }),
  activity: one(activities, {
    fields: [dailySchedules.activityId],
    references: [activities.id],
  }),
}));

export const healthLogsRelations = relations(healthLogs, ({ one }) => ({
  user: one(user, {
    fields: [healthLogs.userId],
    references: [user.id],
  }),
}));

export const dailyCheckinsRelations = relations(dailyCheckins, ({ one }) => ({
  user: one(user, {
    fields: [dailyCheckins.userId],
    references: [user.id],
  }),
}));

export const waterLogsRelations = relations(waterLogs, ({ one }) => ({
  user: one(user, {
    fields: [waterLogs.userId],
    references: [user.id],
  }),
}));

export const healthTipsRelations = relations(healthTips, ({ one }) => ({
  author: one(user, {
    fields: [healthTips.authorId],
    references: [user.id],
  }),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  user: one(user, {
    fields: [mealLogs.userId],
    references: [user.id],
  }),
}));

export const customFoodsRelations = relations(customFoods, ({ one }) => ({
  user: one(user, {
    fields: [customFoods.userId],
    references: [user.id],
  }),
}));

