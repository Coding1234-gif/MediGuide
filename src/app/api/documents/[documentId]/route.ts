import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDocument } from "@/features/document-extraction/service";
import { requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

export const DELETE = withApi("documents.delete", async (_request: Request, ctx: RouteContext<"/api/documents/[documentId]">) => {
  const user = await requireApiUser();
  await deleteDocument(user.id, z.uuid().parse((await ctx.params).documentId));
  return new NextResponse(null, { status: 204 });
});
