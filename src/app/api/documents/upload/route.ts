import { NextResponse } from "next/server";
import { uploadDocument } from "@/features/document-extraction/service";
import { ApiError, requireApiUser, withApi } from "@/lib/http";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { MAX_UPLOAD_BYTES } from "@/lib/validation/files";

export const runtime = "nodejs";

/** Multipart upload; the server validates type by magic bytes and stores the file privately. */
export const POST = withApi("documents.upload", async (request: Request) => {
  const user = await requireApiUser();
  if (!checkRateLimit(`upload:${user.id}`, 20, 60 * 60 * 1000)) {
    throw new ApiError("rate_limited", "Too many uploads. Please try again later.");
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw new ApiError("payload_too_large", "Files must be 4 MB or smaller.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError("bad_request", "Attach a file in the `file` field.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await uploadDocument(user.id, { bytes, declaredType: file.type, name: file.name });
  return NextResponse.json(
    { document: { id: doc.id, fileType: doc.fileType, fileSize: doc.fileSize, extractionStatus: doc.extractionStatus, createdAt: doc.createdAt } },
    { status: 201 },
  );
});
