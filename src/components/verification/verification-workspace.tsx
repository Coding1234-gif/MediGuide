"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, FileSearch, Loader2, Pencil, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Notice } from "@/components/shared/notice";
import { DocumentViewer } from "./document-viewer";
import { FieldReview, type FieldDraft } from "./field-review";
import { ScheduleBuilder } from "@/components/schedules/schedule-builder";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import {
  EXTRACTION_FIELD_KEYS,
  FIELD_LABELS,
  SCHEDULE_REQUIRED_FIELDS,
  type ExtractionFieldKey,
  type ExtractionResult,
  type VerifiedFields,
} from "@/lib/validation/extraction";
import type { Schedulability } from "@/lib/scheduler/validation";
import { cn } from "@/lib/utils";

export type WorkspaceExtraction = {
  id: string;
  modelIdentifier: string;
  result: ExtractionResult;
  verifiedFields: VerifiedFields | null;
};

type Props = {
  document: { id: string; name: string; fileType: string; status: "pending" | "processing" | "completed" | "failed" };
  extraction: WorkspaceExtraction | null;
  initialSchedulability: Schedulability | null;
  existingScheduleId: string | null;
  timezone: string;
};

type Draft = Record<ExtractionFieldKey, FieldDraft>;

function draftFrom(ex: WorkspaceExtraction): Draft {
  return Object.fromEntries(
    EXTRACTION_FIELD_KEYS.map((k) => {
      const verified = ex.verifiedFields?.[k];
      if (verified) return [k, { value: verified.value ?? "", state: verified.state }];
      const f = ex.result.fields[k];
      // Fields with nothing to compare start as "not on the document"; everything else needs an explicit check.
      return [k, { value: f.value ?? "", state: f.value === null && f.status === "missing" ? "missing" : null }];
    }),
  ) as Draft;
}

export function VerificationWorkspace({ document: doc, extraction: initialExtraction, initialSchedulability, existingScheduleId, timezone }: Props) {
  const router = useRouter();
  const [extraction, setExtraction] = useState(initialExtraction);
  const [phase, setPhase] = useState<"extracting" | "failed" | "review" | "verified">(
    initialExtraction ? (initialExtraction.verifiedFields ? "verified" : "review") : doc.status === "failed" ? "failed" : "extracting",
  );
  const [extractError, setExtractError] = useState<{ message: string; retryable: boolean } | null>(
    doc.status === "failed" ? { message: "We couldn't read this document last time.", retryable: true } : null,
  );
  const [draft, setDraft] = useState<Draft | null>(initialExtraction ? draftFrom(initialExtraction) : null);
  const [attested, setAttested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [schedulability, setSchedulability] = useState<Schedulability | null>(initialSchedulability);
  const [showOriginal, setShowOriginal] = useState(true);
  const started = useRef(false);

  const runExtraction = useCallback(async () => {
    setPhase("extracting");
    setExtractError(null);
    try {
      const { extraction: ex } = await apiFetch<{ extraction: { id: string; modelIdentifier: string; result: ExtractionResult } }>(
        `/api/documents/${doc.id}/extract`,
        { method: "POST" },
      );
      const next = { ...ex, verifiedFields: null };
      setExtraction(next);
      setDraft(draftFrom(next));
      setPhase("review");
      router.refresh();
    } catch (err) {
      const e = err instanceof ClientApiError ? err : null;
      const retryable = (e?.details as { retryable?: boolean } | undefined)?.retryable ?? e?.code !== "service_unavailable";
      setExtractError({ message: e?.message ?? "We couldn't read this document.", retryable });
      setPhase("failed");
    }
  }, [doc.id, router]);

  useEffect(() => {
    if (!initialExtraction && doc.status === "pending" && !started.current) {
      started.current = true;
      void runExtraction();
    }
  }, [doc.status, initialExtraction, runExtraction]);

  const unreviewed = useMemo(() => (draft ? EXTRACTION_FIELD_KEYS.filter((k) => draft[k].state === null) : []), [draft]);

  async function submitVerification() {
    if (!draft || !extraction) return;
    setSaving(true);
    setSaveError(null);
    const fields = Object.fromEntries(
      EXTRACTION_FIELD_KEYS.map((k) => {
        const d = draft[k];
        const value = d.value.trim() === "" ? null : d.value.trim();
        return [k, { value, state: d.state === "confirmed" || d.state === "corrected" ? (value ? d.state : "missing") : d.state }];
      }),
    ) as VerifiedFields;
    try {
      const res = await apiFetch<{ schedulability: Schedulability }>(`/api/extractions/${extraction.id}/verify`, {
        method: "PATCH",
        json: { fields, matches_original: true },
      });
      setExtraction({ ...extraction, verifiedFields: fields });
      setSchedulability(res.schedulability);
      setPhase("verified");
      toast.success("Details verified.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSaveError(err instanceof ClientApiError ? err.message : "Couldn't save your verification.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDoc() {
    try {
      await apiFetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      toast.success("Document deleted.");
      router.push("/scan");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't delete the document.");
    }
  }

  const viewer = <DocumentViewer documentId={doc.id} fileType={doc.fileType} name={doc.name} />;

  // ---------- Extraction in progress / failed ----------
  if (phase === "extracting" || phase === "failed" || !extraction || !draft) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)]">{viewer}</div>
        <div className="space-y-4">
          {phase === "failed" ? (
            <>
              <Notice tone="danger" title="We couldn't read this document">
                <p>{extractError?.message}</p>
                <p className="mt-1">
                  Try a clearer, well-lit photo where all the text is visible — or ask your pharmacist to explain the instructions.
                </p>
              </Notice>
              <div className="flex flex-wrap gap-2">
                {extractError?.retryable !== false ? (
                  <Button onClick={runExtraction}>
                    <RefreshCw aria-hidden="true" /> Try again
                  </Button>
                ) : null}
                <Link href="/scan" className={buttonVariants({ variant: "outline" })}>
                  Upload a different file
                </Link>
                <DeleteButton onConfirm={deleteDoc} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-12 text-center" role="status" aria-live="polite">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">Reading your instructions…</p>
                <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds. We only transcribe what&apos;s written — nothing is guessed.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const result = extraction.result;
  const isFixture = extraction.modelIdentifier.startsWith("fixture:");

  const sourceBanner = (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Bot className="size-4" aria-hidden="true" />
      {isFixture ? (
        <span>
          <strong className="text-foreground">Pre-written sample result</strong> (fixture) — live AI isn&apos;t configured on this server.
        </span>
      ) : (
        <span>
          Read by AI ({extraction.modelIdentifier.replace(/^(groq|openai):/, "")}). AI can make mistakes — compare every field with your document.
        </span>
      )}
    </div>
  );

  const alerts = (
    <div className="space-y-3">
      {result.document_type !== "medicine_instructions" ? (
        <Notice tone="warning" title={result.document_type === "unreadable" ? "Most of this document couldn't be read" : "This doesn't look like medicine instructions"}>
          Please check you uploaded the right file. Reminders can only be created from clear medicine instructions.
        </Notice>
      ) : null}
      {result.suspicious_content_detected ? (
        <Notice tone="warning" title="Unusual text was ignored">
          Part of this document looked like instructions aimed at software rather than at you. MediGuide ignored it. Check the
          details below carefully against what your pharmacist or prescriber told you.
        </Notice>
      ) : null}
      {result.additional_medicines_detected.length > 0 ? (
        <Notice tone="info" title="More than one medicine found">
          This page also mentions {result.additional_medicines_detected.join(", ")}. MediGuide handles one medicine per scan —
          upload a separate photo for each.
        </Notice>
      ) : null}
    </div>
  );

  const warningsBlock =
    result.warnings.length + result.other_guidance.length > 0 ? (
      <section aria-labelledby="warnings-title" className="space-y-2">
        <h2 id="warnings-title" className="text-sm font-semibold">
          Warnings and guidance printed on your document
        </h2>
        <ul className="space-y-2">
          {result.warnings.map((w) => (
            <li key={`w-${w.text}`} className="flex gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>{w.text}</span>
            </li>
          ))}
          {result.other_guidance.map((w) => (
            <li key={`g-${w.text}`} className="rounded-lg border bg-muted/50 p-3 text-sm">
              {w.text}
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  // ---------- Verified: show outcome & schedule builder ----------
  if (phase === "verified" && schedulability) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100dvh-8rem)]">{viewer}</div>
        <div className="space-y-5">
          <VerifiedSummary fields={extraction.verifiedFields!} />
          {warningsBlock}
          {existingScheduleId ? (
            <Notice tone="success" title="A reminder schedule already uses these instructions">
              <Link href={`/schedules/${existingScheduleId}`}>View the schedule</Link>
            </Notice>
          ) : schedulability.schedulable ? (
            <ScheduleBuilder
              extractionId={extraction.id}
              pattern={schedulability.pattern}
              durationLabel={schedulability.duration.kind === "ongoing" ? "Ongoing" : `For ${schedulability.duration.days} days`}
              notes={schedulability.notes}
              defaultTimezone={timezone}
            />
          ) : (
            <Notice tone="warning" title="We can't create automatic reminders from these instructions" role="alert">
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {schedulability.reasons.map((r) => (
                  <li key={`${r.field}-${r.message}`}>{r.message}</li>
                ))}
              </ul>
              <p className="mt-2">
                Please check with your <strong>pharmacist or prescriber</strong> to clarify exactly how and when to take this medicine.
                MediGuide won&apos;t fill in or guess missing details.
              </p>
            </Notice>
          )}
          {!existingScheduleId ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setPhase("review")}>
                <Pencil aria-hidden="true" /> Edit verified details
              </Button>
              <DeleteButton onConfirm={deleteDoc} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ---------- Review ----------
  const fieldList = (
    <div className="space-y-3">
      {EXTRACTION_FIELD_KEYS.map((k) => (
        <FieldReview
          key={k}
          fieldKey={k}
          label={FIELD_LABELS[k]}
          required={SCHEDULE_REQUIRED_FIELDS.includes(k)}
          extracted={result.fields[k]}
          draft={draft[k]}
          onChange={(next) => setDraft((d) => (d ? { ...d, [k]: next } : d))}
        />
      ))}
    </div>
  );

  const footer = (
    <div className="sticky bottom-16 z-20 space-y-3 rounded-lg border border-input bg-card p-4 md:bottom-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {unreviewed.length > 0 ? (
          <>
            <strong className="text-foreground">{unreviewed.length}</strong> field{unreviewed.length > 1 ? "s" : ""} still to check:{" "}
            {unreviewed.map((k) => FIELD_LABELS[k]).join(", ")}
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-success">
            <CheckCircle2 className="size-4" aria-hidden="true" /> All fields checked
          </span>
        )}
      </p>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={attested} onCheckedChange={(c) => setAttested(c)} className="mt-0.5" />
        <span>I compared each detail with my original document, and corrected anything that was wrong.</span>
      </label>
      {saveError ? <Notice tone="danger">{saveError}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" className="h-11 flex-1 sm:flex-none" disabled={!attested || unreviewed.length > 0 || saving} onClick={submitVerification}>
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          Confirm details
        </Button>
        <CancelButton onConfirm={() => router.push("/scan")} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {sourceBanner}
      {alerts}
      {/* Desktop: split pane. Mobile: the original collapses above the details. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100dvh-8rem)]">
          <Button variant="outline" className="mb-3 w-full lg:hidden" aria-expanded={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
            <FileSearch aria-hidden="true" /> {showOriginal ? "Hide original document" : "Show original document"}
          </Button>
          <div className={cn("h-full", !showOriginal && "hidden lg:block")}>{viewer}</div>
        </div>
        <div className="space-y-4">
          {fieldList}
          {warningsBlock}
          {footer}
        </div>
      </div>
    </div>
  );
}

function VerifiedSummary({ fields }: { fields: VerifiedFields }) {
  return (
    <section aria-labelledby="verified-title" className="rounded-2xl border bg-card p-5">
      <h2 id="verified-title" className="mb-3 flex items-center gap-2 font-semibold">
        <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> Your verified instructions
      </h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {EXTRACTION_FIELD_KEYS.map((k) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{FIELD_LABELS[k]}</dt>
            <dd className={cn("text-sm font-medium", !fields[k].value && "font-normal text-muted-foreground italic")}>
              {fields[k].state === "unclear" ? "Marked unclear" : (fields[k].value ?? "Not on the document")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CancelButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="lg" variant="ghost" className="h-11" />}>Cancel</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without verifying?</AlertDialogTitle>
          <AlertDialogDescription>
            Your checks on this page won&apos;t be saved. The document stays in your list so you can come back later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep checking</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="text-destructive hover:text-destructive" />}>
        <Trash2 aria-hidden="true" /> Delete document
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this document?</AlertDialogTitle>
          <AlertDialogDescription>The uploaded file is permanently removed from storage. This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
