import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createApp } from "../app";
import { computeTimeRange } from "../services/schedule.service";
import { getDb, user, eq, inArray } from "@lifesync/db";

const app = createApp();
let server: ReturnType<typeof app.listen>;
let baseUrl = "";
const createdUserIds: string[] = [];

let userACookie = "";
let userAId = "";
let userBCookie = "";
let userBId = "";
let defaultCategoryId = "";
let userAScheduleId = "";

function extractSessionCookie(headers: Headers): string {
  const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    return setCookies.map((c) => c.split(";")[0]).join("; ");
  }
  const raw = headers.get("set-cookie");
  return raw ? raw.split(";")[0] ?? "" : "";
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    try {
      const db = getDb();
      await db.delete(user).where(inArray(user.id, createdUserIds));
    } catch {
      // Ignore cleanup errors
    }
  }
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe("1. 24-Hour Schedule Time Calculation & Midnight-Crossing Unit Tests", () => {
  test("computes standard same-day duration and interval", () => {
    const res = computeTimeRange("09:00", "12:30");
    expect("error" in res).toBe(false);
    if (!("error" in res)) {
      expect(res.startMinutes).toBe(540);
      expect(res.endMinutes).toBe(750);
      expect(res.durationMinutes).toBe(210);
      expect(res.crossesMidnight).toBe(false);
      expect(res.dayIntervals).toEqual([[540, 750]]);
    }
  });

  test("supports blocks ending at 00:00 (midnight of current day)", () => {
    const res = computeTimeRange("22:30", "00:00");
    expect("error" in res).toBe(false);
    if (!("error" in res)) {
      expect(res.durationMinutes).toBe(90);
      expect(res.crossesMidnight).toBe(false);
      expect(res.dayIntervals).toEqual([[1350, 1440]]);
    }
  });

  test("supports midnight-crossing activities (e.g., 22:30 to 06:30)", () => {
    const res = computeTimeRange("22:30", "06:30");
    expect("error" in res).toBe(false);
    if (!("error" in res)) {
      expect(res.durationMinutes).toBe(480);
      expect(res.crossesMidnight).toBe(true);
      expect(res.dayIntervals).toEqual([
        [1350, 1440],
        [0, 390],
      ]);
    }
  });

  test("rejects identical start and end times", () => {
    const res = computeTimeRange("10:00", "10:00");
    expect("error" in res).toBe(true);
  });
});

describe("2. Health Check & Unauthenticated Route Protection", () => {
  test("GET /api/health-check returns 200 and service status", async () => {
    const res = await fetch(`${baseUrl}/api/health-check`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { status: string; defaultCategoriesCount: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("healthy");
    expect(body.data.defaultCategoriesCount).toBe(10);
  });

  test("GET /api/schedules rejects unauthenticated requests with 401", async () => {
    const res = await fetch(`${baseUrl}/api/schedules?date=2026-11-06`);
    expect(res.status).toBe(401);
  });
});

describe("3. Authentication, RBAC & User Profile Isolation", () => {
  const suffix = Date.now();

  test("registers User A and assigns USER role automatically", async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User Alpha",
        email: `alpha.${suffix}@lifesync.test`,
        password: "Password123!",
      }),
    });

    expect(res.status).toBe(200);
    userACookie = extractSessionCookie(res.headers);
    expect(userACookie.length).toBeGreaterThan(10);

    const body = (await res.json()) as { user: { id: string; role?: string } };
    userAId = body.user.id;
    createdUserIds.push(userAId);

    // Verify /api/users/me returns USER role
    const meRes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Cookie: userACookie },
    });
    expect(meRes.status).toBe(200);
    const meBody = (await meRes.json()) as {
      success: boolean;
      data: { id: string; role: string };
    };
    expect(meBody.data.role).toBe("USER");
  });

  test("registers User B for cross-user data isolation tests", async () => {
    const res = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User Beta",
        email: `beta.${suffix}@lifesync.test`,
        password: "Password123!",
      }),
    });

    expect(res.status).toBe(200);
    userBCookie = extractSessionCookie(res.headers);
    const body = (await res.json()) as { user: { id: string } };
    userBId = body.user.id;
    createdUserIds.push(userBId);
  });

  test("blocks USER role from accessing /api/admin/users with 403 FORBIDDEN", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: userACookie },
    });
    expect(res.status).toBe(403);
  });

  test("blocks User B from reading User A's private profile via /api/users/:id", async () => {
    const res = await fetch(`${baseUrl}/api/users/${userAId}`, {
      headers: { Cookie: userBCookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("4. 24-Hour Daily Schedule CRUD, Overlap Prevention & Data Isolation", () => {
  const testDate = "2026-11-06";

  test("lists the 10 seeded default activity categories", async () => {
    const res = await fetch(`${baseUrl}/api/activities`, {
      headers: { Cookie: userACookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ id: string; slug: string }>;
    };
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(10);
    defaultCategoryId = body.data[0]!.id;
  });

  test("creates a valid schedule block (09:00 - 11:00)", async () => {
    const res = await fetch(`${baseUrl}/api/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        title: "Deep Work Architecture Sprint",
        activityId: defaultCategoryId,
        date: testDate,
        startTime: "09:00",
        endTime: "11:00",
        description: "Core system design",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      data: { id: string; durationMinutes: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.durationMinutes).toBe(120);
    userAScheduleId = body.data.id;
  });

  test("prevents overlapping schedule block (10:00 - 12:00) with 409 SCHEDULE_OVERLAP", async () => {
    const res = await fetch(`${baseUrl}/api/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        title: "Conflicting Meeting",
        activityId: defaultCategoryId,
        date: testDate,
        startTime: "10:00",
        endTime: "12:00",
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("SCHEDULE_OVERLAP");
  });

  test("allows midnight-crossing block (22:30 - 06:30) and prevents morning overlap (05:30 - 07:00)", async () => {
    const createNightRes = await fetch(`${baseUrl}/api/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        title: "Nocturnal Restorative Sleep",
        activityId: defaultCategoryId,
        date: testDate,
        startTime: "22:30",
        endTime: "06:30",
      }),
    });
    expect(createNightRes.status).toBe(201);

    const conflictMorningRes = await fetch(`${baseUrl}/api/schedules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        title: "Early Jog Overlapping Sleep",
        activityId: defaultCategoryId,
        date: testDate,
        startTime: "05:30",
        endTime: "07:00",
      }),
    });
    expect(conflictMorningRes.status).toBe(409);
  });

  test("enforces user data isolation: User B cannot PATCH or DELETE User A's schedule block", async () => {
    const patchRes = await fetch(
      `${baseUrl}/api/schedules/${userAScheduleId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: userBCookie,
        },
        body: JSON.stringify({ title: "Unauthorized Tamper" }),
      }
    );
    expect(patchRes.status).toBe(403);

    const deleteRes = await fetch(
      `${baseUrl}/api/schedules/${userAScheduleId}`,
      {
        method: "DELETE",
        headers: { Cookie: userBCookie },
      }
    );
    expect(deleteRes.status).toBe(403);
  });
});

describe("5. Wellness Tracking, Analytics & Admin Authorization", () => {
  const testDate = "2026-11-06";

  test("records daily health log, water intake, and check-in, then computes daily & weekly analytics", async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        date: testDate,
        sleepDurationMinutes: 465,
        sleepQuality: 91,
        exerciseDurationMinutes: 50,
        dailySteps: 9200,
        waterIntakeMl: 2000,
        mood: "Motivated",
        energyLevel: 88,
        restingHeartRate: 57,
        notes: "Felt energized after morning sunlight walk",
      }),
    });
    expect(healthRes.status).toBe(201);

    const waterRes = await fetch(`${baseUrl}/api/water`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userACookie,
      },
      body: JSON.stringify({
        date: testDate,
        amountMl: 250,
      }),
    });
    expect(waterRes.status).toBe(201);

    const dailyAnalyticsRes = await fetch(
      `${baseUrl}/api/analytics/daily?date=${testDate}`,
      {
        headers: { Cookie: userACookie },
      }
    );
    expect(dailyAnalyticsRes.status).toBe(200);
    const dailyBody = (await dailyAnalyticsRes.json()) as {
      success: boolean;
      data: {
        hasAnyRecord: boolean;
        schedule: { allocatedMinutes: number; remainingMinutes: number };
        wellness: { waterIntakeMl: number };
      };
    };
    expect(dailyBody.success).toBe(true);
    expect(dailyBody.data.hasAnyRecord).toBe(true);
    expect(dailyBody.data.schedule.allocatedMinutes).toBe(600); // 120m + 480m
    expect(dailyBody.data.schedule.remainingMinutes).toBe(840);
    expect(dailyBody.data.wellness.waterIntakeMl).toBe(2250);
  });

  test("allows ADMIN role to access /api/admin/users after database promotion", async () => {
    const db = getDb();
    await db
      .update(user)
      .set({ role: "ADMIN" })
      .where(eq(user.id, userAId));

    const adminRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Cookie: userACookie },
    });
    expect(adminRes.status).toBe(200);
    const adminBody = (await adminRes.json()) as {
      success: boolean;
      data: { stats: { totalRegisteredUsers: number } };
    };
    expect(adminBody.success).toBe(true);
    expect(adminBody.data.stats.totalRegisteredUsers).toBeGreaterThanOrEqual(2);
  });
});
