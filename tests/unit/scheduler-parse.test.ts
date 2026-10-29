import { describe, expect, it } from "vitest";
import { parseDuration, parseFrequency } from "@/lib/scheduler/parse";

describe("parseFrequency", () => {
  it.each([
    ["Three times a day", { kind: "times_per_day", count: 3 }],
    ["twice daily", { kind: "times_per_day", count: 2 }],
    ["Once a day", { kind: "times_per_day", count: 1 }],
    ["Take daily", { kind: "times_per_day", count: 1 }],
    ["4 times per day", { kind: "times_per_day", count: 4 }],
    ["TDS", { kind: "times_per_day", count: 3 }],
    ["b.d.", { kind: "times_per_day", count: 2 }],
    ["every 8 hours", { kind: "every_n_hours", hours: 8 }],
    ["Every 24 hours", { kind: "times_per_day", count: 1 }],
  ])("parses %s", (text, expected) => {
    expect(parseFrequency(text)).toEqual(expected);
  });

  it.each([
    "As needed",
    "as required for pain",
    "PRN",
    "As directed by your doctor",
    "Up to four times a day",
    "One or two times a day",
    "No more than 3 times a day",
    "Twice a day then once a day",
    "",
    "with food",
    "every 5 hours",
  ])("refuses non-routine or unknown frequency: %s", (text) => {
    expect(parseFrequency(text).kind).toBe("unsupported");
  });

  it("detects contradictions between frequency and timing", () => {
    const r = parseFrequency("Twice a day", "Take three times daily after meals");
    expect(r.kind).toBe("unsupported");
  });

  it("does not treat timing like 'every day at breakfast' as a conflicting frequency", () => {
    expect(parseFrequency("Twice a day", "every day at breakfast and dinner")).toEqual({ kind: "times_per_day", count: 2 });
  });

  it("does not equate every 12 hours with twice a day", () => {
    expect(parseFrequency("Twice a day", "every 12 hours").kind).toBe("unsupported");
  });
});

describe("parseDuration", () => {
  it.each([
    ["For 7 days", { kind: "days", days: 7 }],
    ["Continue for 14 days", { kind: "days", days: 14 }],
    ["for two weeks", { kind: "days", days: 14 }],
    ["Long-term", { kind: "ongoing" }],
  ])("parses %s", (text, expected) => {
    expect(parseDuration(text)).toEqual(expected);
  });

  it.each(["Until finished", "complete the course", "for a while", "for 120 days", "for 5 days or for 7 days"])(
    "refuses %s",
    (text) => {
      expect(parseDuration(text).kind).toBe("unsupported");
    },
  );
});
