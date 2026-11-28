"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, HeartPulse, Loader2, Phone, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/shared/notice";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import type { SymptomResult } from "@/features/symptom-guidance/service";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };
type Props = { symptoms: Option[]; durations: Option[]; redFlags: Array<{ id: string; question: string }> };

const STEPS = ["Symptoms", "Duration", "Safety check"] as const;

export function SymptomWizard({ symptoms, durations, redFlags }: Props) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<string | null>(null);
  const [vulnerable, setVulnerable] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SymptomResult | null>(null);

  const canNext = [selected.length > 0 || description.trim().length > 2, duration !== null && vulnerable !== null, redFlags.every((q) => q.id in answers)][step];

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const { result } = await apiFetch<{ result: SymptomResult }>("/api/symptoms/analyze", {
        method: "POST",
        json: {
          symptoms: selected,
          description,
          duration,
          vulnerableGroup: vulnerable,
          redFlagAnswers: Object.entries(answers).filter(([, v]) => v).map(([k]) => k),
        },
      });
      setResult(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setStep(0);
    setSelected([]);
    setDescription("");
    setDuration(null);
    setVulnerable(null);
    setAnswers({});
  }

  if (result) return <SymptomResults result={result} onReset={reset} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                i < step && "border-primary bg-primary text-primary-foreground",
                i === step && "border-primary text-primary",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("hidden text-sm sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        {step === 0 ? (
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">What symptoms do you have?</legend>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((s) => {
                const on = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected(on ? selected.filter((x) => x !== s.id) : [...selected, s.id])}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Anything else? (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Describe how you feel in your own words. Please don't include names or other personal details."
              />
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-lg font-semibold">How long have you had these symptoms?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {durations.map((d) => (
                  <ChoiceCard key={d.id} name="duration" checked={duration === d.id} onSelect={() => setDuration(d.id)} label={d.label} />
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="font-medium">Are you pregnant, aged 65 or over, or living with a long-term condition or weakened immune system?</legend>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceCard name="vulnerable" checked={vulnerable === true} onSelect={() => setVulnerable(true)} label="Yes" />
                <ChoiceCard name="vulnerable" checked={vulnerable === false} onSelect={() => setVulnerable(false)} label="No" />
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">A few safety questions</h2>
              <p className="text-sm text-muted-foreground">These help us spot situations that need urgent help.</p>
            </div>
            {redFlags.map((q) => (
              <fieldset key={q.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <legend className="sr-only">{q.question}</legend>
                <p className="text-sm font-medium" aria-hidden="true">{q.question}</p>
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  <ChoiceCard compact name={q.id} checked={answers[q.id] === true} onSelect={() => setAnswers({ ...answers, [q.id]: true })} label="Yes" />
                  <ChoiceCard compact name={q.id} checked={answers[q.id] === false} onSelect={() => setAnswers({ ...answers, [q.id]: false })} label="No" />
                </div>
              </fieldset>
            ))}
          </div>
        ) : null}

        {error ? <Notice tone="danger" className="mt-4">{error}</Notice> : null}

        <div className="mt-6 flex justify-between gap-2">
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || loading}>
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canNext || loading}>
              {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <HeartPulse aria-hidden="true" />}
              See information
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ name, checked, onSelect, label, compact }: { name: string; checked: boolean; onSelect: () => void; label: string; compact?: boolean }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        compact ? "justify-center px-4 py-2" : "px-4 py-3",
        checked ? "border-primary bg-accent text-accent-foreground" : "hover:bg-accent/50",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

function SymptomResults({ result, onReset }: { result: SymptomResult; onReset: () => void }) {
  const urgent = result.status === "emergency" || result.status === "urgent";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {urgent ? (
        <div role="alert" className="space-y-3 rounded-2xl border-2 border-destructive/40 bg-danger-soft p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-destructive">
            <ShieldAlert className="size-6" aria-hidden="true" />
            {result.status === "emergency" ? "Get emergency help now" : "Get urgent medical advice"}
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {result.safety.triggered.map((t) => (
              <li key={t.id}>{t.message}</li>
            ))}
          </ul>
          <p className="text-sm">
            {result.status === "emergency"
              ? "Call your local emergency number now (999 in the UK, 911 in the US, 112 in the EU) or go to the nearest emergency department."
              : "Contact a doctor or urgent care service today (in the UK, NHS 111). If things get worse, call emergency services."}
          </p>
          <a href="tel:999" className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white">
            <Phone className="size-4" aria-hidden="true" /> Call 999 (UK)
          </a>
          <p className="text-xs text-muted-foreground">MediGuide stopped here and didn&apos;t look up general information, because getting help comes first.</p>
        </div>
      ) : null}

      {result.status === "unsupported" ? (
        <Notice tone="info" title="We don't have reliable information for this yet">
          MediGuide only covers a small set of common symptoms (colds, flu, sore throat, cough, fever, headache, and stomach bugs). We&apos;d
          rather say so than guess. If you&apos;re unsure, speak to a pharmacist or doctor.
        </Notice>
      ) : null}

      {result.status === "seek_advice" ? (
        <Notice tone="warning" title="Consider speaking to a pharmacist or doctor">
          <ul className="list-disc pl-4">
            {result.adviceReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {result.overview ? (
        <section className="space-y-2 rounded-2xl border bg-card p-5">
          <p className="text-sm font-semibold">What the sources say</p>
          <p className="leading-relaxed">{result.overview.text}</p>
          <p className="text-xs text-muted-foreground">
            {result.overview.source === "curated"
              ? "Summary written from the referenced pages — not generated for you specifically."
              : "Rephrased by AI using only the referenced summaries below."}{" "}
            This isn&apos;t a diagnosis: MediGuide hasn&apos;t examined you.
          </p>
        </section>
      ) : null}

      {!urgent && (result.selfCare.length > 0 || result.seekAdviceIf.length > 0) ? (
        <div className="grid gap-4 md:grid-cols-2">
          {result.selfCare.length ? (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-2 font-semibold">General self-care the sources mention</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{result.selfCare.map((s) => <li key={s}>{s}</li>)}</ul>
            </section>
          ) : null}
          {result.seekAdviceIf.length ? (
            <section className="rounded-2xl border border-warning/30 bg-warning-soft p-5">
              <h2 className="mb-2 font-semibold">Get advice from a professional if</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">{result.seekAdviceIf.map((s) => <li key={s}>{s}</li>)}</ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {!urgent && result.prevention.length ? (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-2 font-semibold">Reducing the spread</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">{result.prevention.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      ) : null}

      {result.references.length ? (
        <section aria-labelledby="sources-title" className="space-y-3">
          <h2 id="sources-title" className="font-semibold">Sources</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.references.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4 hover:border-primary/40">
                  <span className="flex items-center gap-1.5 font-medium">
                    {r.title} <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {r.publisher}
                    {r.reviewedOn ? ` · page last reviewed ${r.reviewedOn}` : ""}
                  </span>
                  <span className="text-sm text-muted-foreground">{r.summary}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button variant="outline" onClick={onReset}>
        <RotateCcw aria-hidden="true" /> Start again
      </Button>
    </div>
  );
}
