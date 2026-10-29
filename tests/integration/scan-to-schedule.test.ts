import { beforeEach, describe, expect, it } from "vitest";
import { installMemoryStorage, installTestDb, type MemoryStorage } from "../support/test-db";
import { setExtractionProviderForTests } from "@/lib/ai/extraction";
import { findSample } from "@/lib/ai/fixtures";
import { ExtractionProviderError, type InstructionExtractionProvider } from "@/lib/ai/provider";
import { ensureProfile } from "@/features/profile/service";
import {
  deleteDocument,
  extractDocument,
  getDocumentForUser,
  readDocumentBytes,
  uploadDocument,
} from "@/features/document-extraction/service";
import { getExtractionForUser, verifyExtraction } from "@/features/instruction-verification/service";
import { createSchedule, getScheduleForUser, updateScheduleStatus } from "@/features/scheduling/service";
import { listReminders, updateReminder } from "@/features/reminders/service";
import { initialVerifiedFields } from "@/lib/validation/extraction";
import { ApiError } from "@/lib/errors";

const ALICE = "00000000-0000-4000-8000-0000000a11ce";
const BOB = "00000000-0000-4000-8000-000000000b0b";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function providerFor(sampleId: string): InstructionExtractionProvider {
  return {
    id: "test",
    extract: async () => ({ json: structuredClone(findSample(sampleId)!.extraction), modelIdentifier: `test:${sampleId}`, live: false }),
  };
}

function tomorrow(): string {
  return new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
}

let storage: MemoryStorage;

beforeEach(async () => {
  await installTestDb();
  storage = installMemoryStorage();
  await ensureProfile(ALICE);
  await ensureProfile(BOB);
});

async function uploadAndExtract(sampleId: string, userId = ALICE) {
  setExtractionProviderForTests(providerFor(sampleId));
  const doc = await uploadDocument(userId, { bytes: PNG, declaredType: "image/png", name: "label.png" });
  const { extraction } = await extractDocument(userId, doc.id);
  return { doc, extraction };
}

describe("scan → verify → schedule", () => {
  it("creates a schedule with reminder events from clear, verified instructions (Scenario A)", async () => {
    const { doc, extraction } = await uploadAndExtract("clear-course");
    expect((await getDocumentForUser(ALICE, doc.id)).extractionStatus).toBe("completed");

    // Scheduling before verification is refused.
    await expect(
      createSchedule(ALICE, { extractionId: extraction.id, times: ["08:00", "14:00", "20:00"], startDate: tomorrow(), timezone: "Asia/Taipei", approved: true }),
    ).rejects.toMatchObject({ code: "unprocessable" });

    const { schedulability } = await verifyExtraction(ALICE, extraction.id, {
      fields: initialVerifiedFields(extraction.extractedFields),
      matches_original: true,
    });
    expect(schedulability.schedulable).toBe(true);

    const req = { extractionId: extraction.id, times: ["08:00", "14:00", "20:00"], startDate: tomorrow(), timezone: "Asia/Taipei", approved: true as const };
    const first = await createSchedule(ALICE, req);
    expect(first.created).toBe(true);
    const { events } = await getScheduleForUser(ALICE, first.schedule.id);
    expect(events).toHaveLength(21);

    // Idempotent: a repeated request returns the same schedule and no duplicate events.
    const second = await createSchedule(ALICE, req);
    expect(second.created).toBe(false);
    expect(second.schedule.id).toBe(first.schedule.id);
    expect((await getScheduleForUser(ALICE, first.schedule.id)).events).toHaveLength(21);

    // The raw AI extraction is immutable; the verified snapshot is stored separately.
    const stored = await getExtractionForUser(ALICE, extraction.id);
    expect(stored.extraction.extractedFields).toEqual(extraction.extractedFields);
    expect(stored.extraction.verifiedFields).not.toBeNull();
  });

  it.each(["missing-frequency", "as-directed", "blurry-label", "contradictory"])(
    "refuses to schedule %s even after verification",
    async (sampleId) => {
      const { extraction } = await uploadAndExtract(sampleId);
      const { schedulability } = await verifyExtraction(ALICE, extraction.id, {
        fields: initialVerifiedFields(extraction.extractedFields),
        matches_original: true,
      });
      expect(schedulability.schedulable).toBe(false);
      await expect(
        createSchedule(ALICE, { extractionId: extraction.id, times: ["08:00"], startDate: tomorrow(), timezone: "UTC", approved: true }),
      ).rejects.toMatchObject({ code: "unprocessable" });
    },
  );

  it("records a failed extraction and allows retry", async () => {
    setExtractionProviderForTests({
      id: "failing",
      extract: async () => {
        throw new ExtractionProviderError("timeout", "timed out", true);
      },
    });
    const doc = await uploadDocument(ALICE, { bytes: PNG, declaredType: "image/png", name: "x.png" });
    await expect(extractDocument(ALICE, doc.id)).rejects.toMatchObject({ code: "unprocessable", details: { retryable: true } });
    expect((await getDocumentForUser(ALICE, doc.id)).extractionStatus).toBe("failed");

    setExtractionProviderForTests(providerFor("clear-course"));
    const { extraction } = await extractDocument(ALICE, doc.id);
    expect(extraction.modelIdentifier).toBe("test:clear-course");
  });

  it("rejects model output that fails schema validation", async () => {
    setExtractionProviderForTests({ id: "bad", extract: async () => ({ json: { fields: {} }, modelIdentifier: "bad", live: true }) });
    const doc = await uploadDocument(ALICE, { bytes: PNG, declaredType: "image/png", name: "x.png" });
    await expect(extractDocument(ALICE, doc.id)).rejects.toBeInstanceOf(ApiError);
  });

  it("acknowledges reminders and cancels future ones with the schedule", async () => {
    const { extraction } = await uploadAndExtract("clear-course");
    await verifyExtraction(ALICE, extraction.id, { fields: initialVerifiedFields(extraction.extractedFields), matches_original: true });
    const today = new Date().toISOString().slice(0, 10);
    const { schedule } = await createSchedule(ALICE, { extractionId: extraction.id, times: ["00:00", "12:00", "23:59"], startDate: today, timezone: "UTC", approved: true });

    const { items } = await listReminders(ALICE, { order: "asc", limit: 50, offset: 0 });
    const soonest = items[0];
    if (new Date(soonest.scheduledAt).getTime() <= Date.now() + 2 * 3600 * 1000) {
      const ack = await updateReminder(ALICE, soonest.id, "acknowledge");
      expect(ack.status).toBe("acknowledged");
    }
    const far = items[items.length - 1];
    await expect(updateReminder(ALICE, far.id, "acknowledge")).rejects.toMatchObject({ code: "conflict" });

    await updateScheduleStatus(ALICE, schedule.id, "cancelled");
    const after = await listReminders(ALICE, { status: "scheduled", order: "asc", limit: 50, offset: 0 });
    expect(after.items).toHaveLength(0);
  });
});

describe("ownership isolation (Scenario E)", () => {
  it("prevents another user from reading documents, extractions, schedules or reminders", async () => {
    const { doc, extraction } = await uploadAndExtract("clear-course", ALICE);
    await verifyExtraction(ALICE, extraction.id, { fields: initialVerifiedFields(extraction.extractedFields), matches_original: true });
    const { schedule } = await createSchedule(ALICE, { extractionId: extraction.id, times: ["08:00", "14:00", "20:00"], startDate: tomorrow(), timezone: "UTC", approved: true });

    await expect(getDocumentForUser(BOB, doc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(readDocumentBytes(BOB, doc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(extractDocument(BOB, doc.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(getExtractionForUser(BOB, extraction.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(
      verifyExtraction(BOB, extraction.id, { fields: initialVerifiedFields(extraction.extractedFields), matches_original: true }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(getScheduleForUser(BOB, schedule.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(updateScheduleStatus(BOB, schedule.id, "cancelled")).rejects.toMatchObject({ code: "not_found" });

    const bobs = await listReminders(BOB, { order: "asc", limit: 50, offset: 0 });
    expect(bobs.items).toHaveLength(0);
    const alices = await listReminders(ALICE, { order: "asc", limit: 1, offset: 0 });
    await expect(updateReminder(BOB, alices.items[0].id, "acknowledge")).rejects.toMatchObject({ code: "not_found" });
  });

  it("deletes the stored file when a document is deleted", async () => {
    const { doc } = await uploadAndExtract("clear-course");
    expect(storage.files.size).toBe(1);
    await deleteDocument(ALICE, doc.id);
    expect(storage.files.size).toBe(0);
    await expect(getDocumentForUser(ALICE, doc.id)).rejects.toMatchObject({ code: "not_found" });
  });
});
