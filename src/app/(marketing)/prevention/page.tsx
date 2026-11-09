import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { HEALTH_REFERENCES } from "@/lib/medical/references";

export const metadata: Metadata = { title: "Prevention and recovery" };

function AdviceList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{items.map((p) => <li key={p}>{p}</li>)}</ul>
    </div>
  );
}

export default function PreventionPage() {
  const topics = HEALTH_REFERENCES.filter((r) => r.prevention.length > 0 || r.selfCare.length > 0);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Prevention and recovery</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        General, sourced information about reducing the spread of common infections and looking after yourself while you recover. It
        isn&apos;t personal advice. Follow guidance from your own healthcare professionals.
      </p>
      <div className="mt-8 divide-y border-y">
        {topics.map((r) => (
          <article key={r.id} className="grid gap-4 py-8 md:grid-cols-[1fr_1.5fr] md:gap-10">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{r.title}</h2>
              <p className="text-sm text-muted-foreground">{r.summary}</p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Source: {r.publisher}{r.reviewedOn ? ` (reviewed ${r.reviewedOn})` : ""} <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            <div className="space-y-4">
              <AdviceList title="Reducing the spread" items={r.prevention} />
              <AdviceList title="While recovering" items={r.selfCare} />
              <AdviceList title="When to get advice" items={r.seekAdviceIf} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
