import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { HEALTH_REFERENCES } from "@/lib/medical/references";

export const metadata: Metadata = { title: "Prevention and recovery" };

export default function PreventionPage() {
  const cards = HEALTH_REFERENCES.filter((r) => r.prevention.length > 0 || r.selfCare.length > 0);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Prevention and recovery</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        General, sourced information about reducing the spread of common infections and looking after yourself while you recover. It
        isn&apos;t personal advice — follow guidance from your own healthcare professionals.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {cards.map((r) => (
          <article key={r.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">{r.title}</h2>
            <p className="text-sm text-muted-foreground">{r.summary}</p>
            {r.prevention.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reducing the spread</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{r.prevention.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ) : null}
            {r.selfCare.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">While recovering</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{r.selfCare.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ) : null}
            {r.seekAdviceIf.length ? (
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">When to get advice</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{r.seekAdviceIf.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ) : null}
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary hover:underline">
              Source: {r.publisher}{r.reviewedOn ? ` (reviewed ${r.reviewedOn})` : ""} <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
