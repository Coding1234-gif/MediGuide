import { describe, expect, it } from "vitest";
import { assessRedFlags } from "@/lib/medical/safety";
import { matchSymptoms } from "@/lib/medical/supported-scenarios";
import { curatedReferenceProvider, HEALTH_REFERENCES } from "@/lib/medical/references";
import { buildIcs } from "@/lib/calendar/ics";

describe("red-flag escalation (independent of any model)", () => {
  it.each([
    ["I have crushing chest pain", "emergency"],
    ["struggling to breathe", "emergency"],
    ["my face is drooping and slurred speech", "emergency"],
    ["rash that doesn't fade under a glass", "emergency"],
    ["can't keep fluids down", "urgent"],
  ])("escalates %s", (text, level) => {
    expect(assessRedFlags(text, []).level).toBe(level);
  });

  it("escalates from structured answers", () => {
    expect(assessRedFlags("", ["breathing"]).level).toBe("emergency");
  });

  it("does not escalate ordinary symptoms or words containing 'fit'", () => {
    expect(assessRedFlags("runny nose and a sore throat, I feel unfit", []).level).toBe("none");
  });
});

describe("supported scenarios and references", () => {
  it("matches only supported symptoms", () => {
    expect(matchSymptoms([], "I have a cough and a headache").map((s) => s.id)).toEqual(["cough", "headache"]);
    expect(matchSymptoms([], "my knee hurts")).toEqual([]);
  });

  it("every reference has an https nhs.uk source URL", () => {
    for (const r of HEALTH_REFERENCES) expect(r.url).toMatch(/^https:\/\/www\.nhs\.uk\//);
    expect(curatedReferenceProvider.search(["gastro"]).map((r) => r.id)).toContain("nhs-diarrhoea-vomiting");
  });
});

describe("ICS export", () => {
  it("produces a valid VCALENDAR with escaped text and UTC times", () => {
    const ics = buildIcs([{ id: "abc", start: new Date("2026-11-02T08:00:00Z"), title: "Med, test; 1", description: "line1\nline2" }], new Date("2026-11-01T00:00:00Z"));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20261102T080000Z");
    expect(ics).toContain("SUMMARY:Med\\, test\\; 1");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
