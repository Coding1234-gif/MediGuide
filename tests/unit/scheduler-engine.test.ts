import { describe, expect, it } from "vitest";
import { dailyClockTimes, generateReminderPlan } from "@/lib/scheduler/engine";
import { formatLocal } from "@/lib/scheduler/timezone";

describe("generateReminderPlan", () => {
  it("creates count × days events in UTC for a fixed course", () => {
    const plan = generateReminderPlan({
      pattern: { kind: "times_per_day", count: 3 },
      duration: { kind: "days", days: 7 },
      times: ["20:00", "08:00", "14:00"],
      startDate: "2026-11-02",
      timezone: "Asia/Taipei",
    });
    expect(plan.events).toHaveLength(21);
    expect(plan.dailyTimes).toEqual(["08:00", "14:00", "20:00"]);
    expect(plan.endDate).toBe("2026-11-08");
    // 08:00 in Taipei (UTC+8) is 00:00Z
    expect(plan.events[0].toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(formatLocal(plan.events[20], "Asia/Taipei", "yyyy-MM-dd HH:mm")).toBe("2026-11-08 20:00");
  });

  it("is deterministic and duplicate-free", () => {
    const input = {
      pattern: { kind: "times_per_day", count: 2 } as const,
      duration: { kind: "days", days: 5 } as const,
      times: ["09:00", "21:00"],
      startDate: "2026-11-01",
      timezone: "Europe/London",
    };
    const a = generateReminderPlan(input).events.map((d) => d.toISOString());
    const b = generateReminderPlan(input).events.map((d) => d.toISOString());
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("keeps local wall-clock time across a DST change (US fall back)", () => {
    const plan = generateReminderPlan({
      pattern: { kind: "times_per_day", count: 1 },
      duration: { kind: "days", days: 3 },
      times: ["08:00"],
      startDate: "2026-10-31",
      timezone: "America/New_York",
    });
    expect(plan.events.map((d) => d.toISOString())).toEqual([
      "2026-10-31T12:00:00.000Z", // EDT, UTC-4
      "2026-11-01T13:00:00.000Z", // EST, UTC-5
      "2026-11-02T13:00:00.000Z",
    ]);
    expect(plan.events.map((d) => formatLocal(d, "America/New_York", "HH:mm"))).toEqual(["08:00", "08:00", "08:00"]);
  });

  it("handles a non-existent local time in the spring-forward gap without duplicates", () => {
    const plan = generateReminderPlan({
      pattern: { kind: "every_n_hours", hours: 12 },
      duration: { kind: "days", days: 2 },
      times: ["02:30"],
      startDate: "2027-03-14",
      timezone: "America/New_York",
    });
    expect(plan.events).toHaveLength(4);
    expect(new Set(plan.events.map((d) => d.getTime())).size).toBe(4);
  });

  it("expands every-N-hours from a single anchor time", () => {
    expect(dailyClockTimes({ kind: "every_n_hours", hours: 8 }, ["07:00"])).toEqual(["07:00", "15:00", "23:00"]);
    expect(dailyClockTimes({ kind: "every_n_hours", hours: 6 }, ["22:00"])).toEqual(["04:00", "10:00", "16:00", "22:00"]);
  });

  it("skips reminders before notBefore", () => {
    const plan = generateReminderPlan({
      pattern: { kind: "times_per_day", count: 2 },
      duration: { kind: "days", days: 2 },
      times: ["08:00", "20:00"],
      startDate: "2026-11-02",
      timezone: "UTC",
      notBefore: new Date("2026-11-02T12:00:00Z"),
    });
    expect(plan.events.map((d) => d.toISOString())).toEqual([
      "2026-11-02T20:00:00.000Z",
      "2026-11-03T08:00:00.000Z",
      "2026-11-03T20:00:00.000Z",
    ]);
  });

  it("caps ongoing schedules to a rolling window", () => {
    const plan = generateReminderPlan({
      pattern: { kind: "times_per_day", count: 1 },
      duration: { kind: "ongoing" },
      times: ["08:00"],
      startDate: "2026-11-01",
      timezone: "UTC",
    });
    expect(plan.events).toHaveLength(28);
  });
});
