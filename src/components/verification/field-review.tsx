"use client";

import { useId } from "react";
import { Quote } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { ExtractedField, VerifiedFieldState } from "@/lib/validation/extraction";

export type FieldDraft = { value: string; state: VerifiedFieldState | null };

const STATE_OPTIONS: Array<{ value: VerifiedFieldState; label: string; needsValue: boolean }> = [
  { value: "confirmed", label: "Matches my document", needsValue: true },
  { value: "corrected", label: "I corrected it", needsValue: true },
  { value: "missing", label: "Not on the document", needsValue: false },
  { value: "unclear", label: "Unclear / can't read", needsValue: false },
];

const HELP: Partial<Record<string, string>> = {
  frequency: "Copy it exactly, e.g. “three times a day” or “every 8 hours”.",
  duration: "e.g. “for 7 days”. Leave as not found if it isn't written.",
  dose_amount: "How much to take each time, e.g. “one tablet”.",
};

export function FieldReview({
  fieldKey,
  label,
  required,
  extracted,
  draft,
  onChange,
}: {
  fieldKey: string;
  label: string;
  required: boolean;
  extracted: ExtractedField;
  draft: FieldDraft;
  onChange: (next: FieldDraft) => void;
}) {
  const id = useId();
  const original = extracted.value ?? "";
  const needsAttention = extracted.status === "unclear" || extracted.status === "needs_verification";
  const unreviewed = draft.state === null;

  function setValue(value: string) {
    const state: VerifiedFieldState =
      value.trim() === "" ? (draft.state === "unclear" ? "unclear" : "missing") : value.trim() === original.trim() ? "confirmed" : "corrected";
    onChange({ value, state });
  }

  return (
    <fieldset
      className={cn(
        "space-y-3 rounded-xl border bg-card p-4 transition-colors",
        needsAttention && "border-warning/40",
        extracted.status === "unclear" && "border-destructive/35",
        unreviewed && "ring-1 ring-primary/20",
      )}
      data-field={fieldKey}
    >
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`${id}-value`} className="flex items-center gap-2 text-sm font-medium">
          {label}
          {required ? <span className="text-xs font-normal text-muted-foreground">(needed for reminders)</span> : null}
        </label>
        <StatusBadge status={extracted.status} />
      </div>

      <Input
        id={`${id}-value`}
        value={draft.value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Not found on the document"
        aria-describedby={`${id}-evidence`}
        className="h-10 text-base"
        maxLength={300}
      />

      <div id={`${id}-evidence`} className="space-y-1 text-xs">
        {extracted.source_text ? (
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            <span>
              Found on {extracted.page ? `page ${extracted.page}` : "the document"} as{" "}
              <mark className="rounded bg-warning-soft px-1 font-mono text-foreground">{extracted.source_text}</mark>
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">No supporting text was found on the document.</p>
        )}
        {HELP[fieldKey] ? <p className="text-muted-foreground">{HELP[fieldKey]}</p> : null}
      </div>

      <div role="radiogroup" aria-label={`Is “${label}” correct?`} className="flex flex-wrap gap-1.5">
        {STATE_OPTIONS.map((opt) => {
          const disabled = opt.needsValue && draft.value.trim() === "";
          const checked = draft.state === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                disabled && "cursor-not-allowed opacity-40 hover:bg-background",
              )}
            >
              <input
                type="radio"
                name={`${id}-state`}
                value={opt.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange({ value: opt.needsValue ? draft.value : opt.value === "missing" ? "" : draft.value, state: opt.value })}
                className="sr-only"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {unreviewed ? <p className="text-xs font-medium text-primary">Please check this against your document.</p> : null}
    </fieldset>
  );
}
