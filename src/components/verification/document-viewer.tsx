"use client";

import { useState } from "react";
import { ExternalLink, Minus, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shows the user's original document (served privately from /api/documents/:id/file). */
export function DocumentViewer({ documentId, fileType, name }: { documentId: string; fileType: string; name: string }) {
  const src = `/api/documents/${documentId}/file`;
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);

  if (fileType === "application/pdf") {
    return (
      <div className="flex h-full min-h-[60vh] flex-col overflow-hidden rounded-xl border bg-muted">
        <iframe src={src} title={`Original document: ${name}`} className="min-h-[60vh] w-full flex-1 bg-white" />
        <div className="border-t bg-card p-2 text-right">
          <a href={src} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
            Open PDF in a new tab <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-muted">
      <div className="flex items-center justify-between gap-2 border-b bg-card px-2 py-1.5">
        <span className="truncate px-1 text-xs text-muted-foreground">Original · {name}</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out" disabled={zoom <= 1}>
            <Minus />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in" disabled={zoom >= 4}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setRotation((r) => (r + 90) % 360)} aria-label="Rotate 90 degrees">
            <RotateCw />
          </Button>
        </div>
      </div>
      <div className="relative min-h-[50vh] flex-1 overflow-auto lg:min-h-0" tabIndex={0} aria-label="Original document, scrollable when zoomed">
        {failed ? (
          <p className="p-6 text-sm text-muted-foreground">The original document couldn&apos;t be displayed. It may have been deleted.</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image; not optimisable by next/image
          <img
            src={src}
            alt={`Your original instructions document (${name})`}
            onError={() => setFailed(true)}
            className="mx-auto origin-top transition-transform"
            style={{ width: `${zoom * 100}%`, maxWidth: "none", transform: `rotate(${rotation}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
