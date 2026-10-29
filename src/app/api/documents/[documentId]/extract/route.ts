import { NextResponse } from "next/server";
import { z } from "zod";
import { extractDocument } from "@/features/document-extraction/service";
import { ApiError, requireApiUser, withApi } from "@/lib/http";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withApi("documents.extract", async (_request: Request, ctx: RouteContext<"/api/documents/[documentId]/extract">) => {
  const user = await requireApiUser();
  const documentId = z.uuid().parse((await ctx.params).documentId);
  if (!checkRateLimit(`extract:${user.id}`, 15, 60 * 60 * 1000)) {
    throw new ApiError("rate_limited", "Too many extraction requests. Please try again later.");
  }
  const { extraction, live } = await extractDocument(user.id, documentId);
  return NextResponse.json({
    extraction: {
      id: extraction.id,
      documentId: extraction.documentId,
      modelIdentifier: extraction.modelIdentifier,
      live,
      result: extraction.extractedFields,
      createdAt: extraction.createdAt,
    },
  });
});
