import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { VerificationWorkspace } from "@/components/verification/verification-workspace";
import { getDocumentForUser, getLatestExtraction } from "@/features/document-extraction/service";
import { getProfile } from "@/features/profile/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { assessSchedulability } from "@/lib/scheduler/validation";

export const metadata: Metadata = { title: "Check your instructions" };

export default async function DocumentPage({ params }: PageProps<"/scan/[documentId]">) {
  const user = await requireUserOrRedirect();
  const { documentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) notFound();

  const doc = await getDocumentForUser(user.id, documentId).catch((err) => {
    if (err instanceof ApiError && err.code === "not_found") notFound();
    throw err;
  });
  const [extraction, profile] = await Promise.all([getLatestExtraction(doc.id), getProfile(user.id)]);

  let existingScheduleId: string | null = null;
  if (extraction) {
    const db = await getDb();
    const [s] = await db
      .select({ id: schema.schedules.id })
      .from(schema.schedules)
      .where(and(eq(schema.schedules.extractionId, extraction.id), inArray(schema.schedules.status, ["draft", "active", "paused"])));
    existingScheduleId = s?.id ?? null;
  }

  return (
    <>
      <Link href="/scan" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> All documents
      </Link>
      <PageHeader
        title={extraction?.verifiedFields ? "Your verified instructions" : "Check the details"}
        description={
          extraction?.verifiedFields
            ? "These are the details you confirmed. Reminders can only be created from clear, complete instructions."
            : "Compare each detail with your original document. Correct anything that's wrong, and mark anything you can't read as unclear."
        }
      />
      <VerificationWorkspace
        document={{ id: doc.id, name: doc.originalName, fileType: doc.fileType, status: doc.extractionStatus }}
        extraction={
          extraction
            ? { id: extraction.id, modelIdentifier: extraction.modelIdentifier, result: extraction.extractedFields, verifiedFields: extraction.verifiedFields }
            : null
        }
        initialSchedulability={extraction?.verifiedFields ? assessSchedulability(extraction.verifiedFields) : null}
        existingScheduleId={existingScheduleId}
        timezone={profile?.timezone ?? "UTC"}
      />
    </>
  );
}
