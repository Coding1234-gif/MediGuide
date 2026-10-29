import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyExtraction } from "@/features/instruction-verification/service";
import { readJson, requireApiUser, withApi } from "@/lib/http";
import { verifyExtractionRequestSchema } from "@/lib/validation/extraction";

export const runtime = "nodejs";

export const PATCH = withApi("extractions.verify", async (request: Request, ctx: RouteContext<"/api/extractions/[extractionId]/verify">) => {
  const user = await requireApiUser();
  const extractionId = z.uuid().parse((await ctx.params).extractionId);
  const body = verifyExtractionRequestSchema.parse(await readJson(request));
  const { extraction, schedulability } = await verifyExtraction(user.id, extractionId, body);
  return NextResponse.json({
    extraction: { id: extraction.id, validationStatus: extraction.validationStatus, verifiedAt: extraction.verifiedAt },
    schedulability,
  });
});
