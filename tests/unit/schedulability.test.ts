import { describe, expect, it } from "vitest";
import { assessSchedulability, validateChosenTimes } from "@/lib/scheduler/validation";
import { SAMPLE_DOCUMENTS } from "@/lib/ai/fixtures";
import { initialVerifiedFields, type VerifiedFields } from "@/lib/validation/extraction";

function fields(overrides: Partial<Record<keyof VerifiedFields, string | null>> = {}): VerifiedFields {
  const base: Record<string, string | null> = {
    medicine_name: "Corvanex 250 mg capsules",
    strength: "250 mg",
    dose_amount: "One capsule",
    route: "By mouth",
    frequency: "Three times a day",
    timing_instructions: "With food",
    duration: "For 7 days",
    special_conditions: null,
    ...overrides,
  };
  return Object.fromEntries(
    Object.entries(base).map(([k, v]) => [k, { value: v, state: v === null ? "missing" : "confirmed" }]),
  ) as VerifiedFields;
}

describe("assessSchedulability", () => {
  it("accepts complete, explicit instructions", () => {
    const r = assessSchedulability(fields());
    expect(r.schedulable).toBe(true);
    if (r.schedulable) {
      expect(r.pattern).toEqual({ kind: "times_per_day", count: 3 });
      expect(r.duration).toEqual({ kind: "days", days: 7 });
      expect(r.timesRequired).toBe(3);
    }
  });

  it.each([
    ["missing frequency", { frequency: null }],
    ["missing duration", { duration: null }],
    ["missing dose", { dose_amount: null }],
    ["as directed", { frequency: "As directed" }],
    ["as needed", { frequency: "When required" }],
    ["dose range", { dose_amount: "One or two tablets" }],
    ["vague duration", { duration: "Until finished" }],
  ])("blocks %s", (_label, overrides) => {
    expect(assessSchedulability(fields(overrides)).schedulable).toBe(false);
  });

  it("blocks when the user marks a required field unclear", () => {
    const f = fields();
    f.frequency = { value: "Three times a day", state: "unclear" };
    const r = assessSchedulability(f);
    expect(r.schedulable).toBe(false);
    if (!r.schedulable) expect(r.reasons[0].field).toBe("frequency");
  });

  it("matches the expected outcome for every bundled sample when accepted as-is", () => {
    for (const sample of SAMPLE_DOCUMENTS) {
      const r = assessSchedulability(initialVerifiedFields(sample.extraction));
      expect({ id: sample.id, schedulable: r.schedulable }).toEqual({ id: sample.id, schedulable: sample.expectSchedulable });
    }
  });
});

describe("validateChosenTimes", () => {
  it("requires exactly N distinct times for N-times-a-day", () => {
    const p = { kind: "times_per_day", count: 2 } as const;
    expect(validateChosenTimes(p, ["08:00", "20:00"])).toEqual([]);
    expect(validateChosenTimes(p, ["08:00"])).not.toEqual([]);
    expect(validateChosenTimes(p, ["08:00", "08:00"])).not.toEqual([]);
  });
  it("requires a single anchor for interval schedules", () => {
    expect(validateChosenTimes({ kind: "every_n_hours", hours: 8 }, ["07:00", "15:00"])).not.toEqual([]);
  });
});
