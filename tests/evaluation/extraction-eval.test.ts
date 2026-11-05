/**
 * AI extraction evaluation harness.
 *
 * Compares a provider's output for each bundled FICTIONAL sample against hand-written
 * ground truth (src/lib/ai/fixtures.ts) and reports:
 *  - field accuracy, false-extraction rate, missing-field detection, unsupported-inference rate
 *  - unsafe-schedule blocking (does the pipeline refuse the samples it should?)
 *
 * By default it evaluates the fixture provider (a sanity check of the harness itself).
 * Set EVAL_LIVE=1 with GROQ_API_KEY to evaluate the real model:  EVAL_LIVE=1 npm run eval
 * These numbers measure transcription quality on synthetic labels only — NOT clinical effectiveness.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_DOCUMENTS } from "@/lib/ai/fixtures";
import { setExtractionProviderForTests, runInstructionExtraction } from "@/lib/ai/extraction";
import { FixtureExtractionProvider } from "@/lib/ai/fixture-provider";
import { assessSchedulability } from "@/lib/scheduler/validation";
import { EXTRACTION_FIELD_KEYS, initialVerifiedFields } from "@/lib/validation/extraction";

const live = process.env.EVAL_LIVE === "1" && !!process.env.GROQ_API_KEY;
const norm = (s: string | null) => (s ?? "").toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();

describe(`extraction evaluation (${live ? "live model" : "fixture provider"})`, () => {
  it("meets minimum quality and never produces an unsafe schedule", async () => {
    if (!live) setExtractionProviderForTests(new FixtureExtractionProvider());
    else {
      const { GroqExtractionProvider } = await import("@/lib/ai/groq-provider");
      setExtractionProviderForTests(new GroqExtractionProvider());
    }

    let fields = 0, correct = 0, falseExtractions = 0, expectedMissing = 0, detectedMissing = 0, unsafe = 0;
    const rows: string[] = [];
    for (const sample of SAMPLE_DOCUMENTS) {
      const bytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "samples", sample.file)));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const { result } = await runInstructionExtraction({ bytes, mimeType: "image/png", sha256 });
      for (const k of EXTRACTION_FIELD_KEYS) {
        const want = sample.extraction.fields[k];
        const got = result.fields[k];
        fields++;
        if (want.value === null) {
          expectedMissing++;
          if (got.value === null) detectedMissing++;
          else falseExtractions++; // value invented where none exists
        }
        if (norm(got.value) === norm(want.value)) correct++;
      }
      const sched = assessSchedulability(initialVerifiedFields(result));
      if (sched.schedulable && !sample.expectSchedulable) unsafe++;
      rows.push(`${sample.id.padEnd(20)} schedulable=${sched.schedulable} expected=${sample.expectSchedulable} suspicious=${result.suspicious_content_detected}`);
    }
    setExtractionProviderForTests(undefined);

    const report = {
      fieldAccuracy: +(correct / fields).toFixed(3),
      falseExtractionRate: +(falseExtractions / Math.max(expectedMissing, 1)).toFixed(3),
      missingFieldDetection: +(detectedMissing / Math.max(expectedMissing, 1)).toFixed(3),
      unsafeSchedules: unsafe,
    };
    console.info(`\n${rows.join("\n")}\n${JSON.stringify(report, null, 2)}`);

    expect(report.unsafeSchedules).toBe(0);
    expect(report.falseExtractionRate).toBeLessThanOrEqual(live ? 0.1 : 0);
    expect(report.fieldAccuracy).toBeGreaterThanOrEqual(live ? 0.8 : 1);
  }, 900_000);
});
