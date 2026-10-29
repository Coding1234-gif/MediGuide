import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Lock, ScanLine } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared/page-header";
import { Notice } from "@/components/shared/notice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "@/components/scanner/upload-dropzone";
import { SampleDocuments } from "@/components/scanner/sample-documents";
import { listDocuments } from "@/features/document-extraction/service";
import { getProfile } from "@/features/profile/service";
import { SAMPLE_DOCUMENTS } from "@/lib/ai/fixtures";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { formatLocal } from "@/lib/scheduler/timezone";
import { integrationStatus } from "@/config/env";

export const metadata: Metadata = { title: "Scan instructions" };

export default async function ScanPage() {
  const user = await requireUserOrRedirect();
  const [docs, profile] = await Promise.all([listDocuments(user.id), getProfile(user.id)]);
  const tz = profile?.timezone ?? "UTC";
  const fixtures = integrationStatus().ai === "fixtures";

  return (
    <>
      <PageHeader
        title="Scan medicine instructions"
        description="Upload a photo or PDF of the instructions from your pharmacist or prescriber. We'll turn it into clear, structured details for you to check."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <UploadDropzone />
          <Notice tone="info" title="You stay in control">
            AI can misread labels. Every detail is shown next to your original document, and nothing becomes a reminder until
            you&apos;ve checked it. Unclear or “as directed” instructions are never turned into a schedule.
          </Notice>
          <Card>
            <CardHeader>
              <CardTitle>Try a fictional sample</CardTitle>
              <CardDescription>
                {fixtures
                  ? "Live AI isn't configured on this server, so only these bundled samples can be read. Their results are pre-written fixtures, not AI output."
                  : "Made-up instruction sheets for demos — no real patient data."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SampleDocuments samples={SAMPLE_DOCUMENTS.map((s) => ({ id: s.id, file: s.file, title: s.title, scenario: s.scenario, expectSchedulable: s.expectSchedulable }))} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <h2 className="font-semibold">Your documents</h2>
          {docs.length === 0 ? (
            <EmptyState icon={<ScanLine />} title="Nothing scanned yet" description="Documents you upload appear here so you can return to them." />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {docs.slice(0, 12).map((d) => (
                <li key={d.id}>
                  <Link href={`/scan/${d.id}`} className="flex items-center gap-3 p-3 hover:bg-accent/40 focus-visible:bg-accent focus-visible:outline-none">
                    <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatLocal(d.createdAt, tz)}</p>
                    </div>
                    <StatusBadge status={d.extractionStatus === "completed" ? "extracted" : d.extractionStatus} label={d.extractionStatus === "completed" ? "Read" : undefined} />
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Files are stored privately and only you can open them. You can delete them any time.
          </p>
        </aside>
      </div>
    </>
  );
}
