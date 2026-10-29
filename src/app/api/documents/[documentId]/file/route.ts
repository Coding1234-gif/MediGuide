import { z } from "zod";
import { readDocumentBytes } from "@/features/document-extraction/service";
import { requireApiUser, withApi } from "@/lib/http";

export const runtime = "nodejs";

/** Streams the original document to its owner only. Never cached by shared caches. */
export const GET = withApi("documents.file", async (_request: Request, ctx: RouteContext<"/api/documents/[documentId]/file">) => {
  const user = await requireApiUser();
  const { doc, bytes } = await readDocumentBytes(user.id, z.uuid().parse((await ctx.params).documentId));
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": doc.fileType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      // Allow our own verification page to embed PDFs in an <iframe>.
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'",
    },
  });
});
