"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ClientApiError } from "@/lib/api-client";
import { uploadFile } from "./upload-dropzone";

export type SampleSummary = { id: string; file: string; title: string; scenario: string; expectSchedulable: boolean };

/** One-click fictional documents for demos and testing. Never real patient data. */
export function SampleDocuments({ samples }: { samples: SampleSummary[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function uploadSample(sample: SampleSummary) {
    setBusy(sample.id);
    try {
      const res = await fetch(`/samples/${sample.file}`);
      if (!res.ok) throw new Error("Sample file is missing. Run `npm run samples` to generate it.");
      const blob = await res.blob();
      const id = await uploadFile(new File([blob], sample.file, { type: blob.type || "image/png" }));
      router.push(`/scan/${id}`);
    } catch (err) {
      toast.error(err instanceof ClientApiError || err instanceof Error ? err.message : "Couldn't load the sample.");
      setBusy(null);
    }
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {samples.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => uploadSample(s)}
            disabled={busy !== null}
            className="flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
          >
            <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
              {busy === s.id ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{s.title}</span>
              <span className="block text-xs text-muted-foreground">{s.scenario}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
