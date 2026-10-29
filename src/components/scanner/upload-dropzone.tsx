"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/shared/notice";
import { apiFetch, ClientApiError } from "@/lib/api-client";
import { ACCEPT_ATTRIBUTE, isAllowedMimeType, MAX_UPLOAD_BYTES } from "@/lib/validation/files";
import { cn } from "@/lib/utils";

type UploadResponse = { document: { id: string } };

function precheck(file: File): string | null {
  if (!isAllowedMimeType(file.type) && file.type !== "image/jpg") return "Please choose a JPEG, PNG or WebP photo, or a PDF.";
  if (file.size > MAX_UPLOAD_BYTES) return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 4 MB — try a lower-resolution photo.`;
  if (file.size === 0) return "That file is empty.";
  return null;
}

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { document } = await apiFetch<UploadResponse>("/api/documents/upload", { method: "POST", body: form });
  return document.id;
}

export function UploadDropzone() {
  const router = useRouter();
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const choose = useCallback((f: File | undefined) => {
    if (!f) return;
    const problem = precheck(f);
    setError(problem);
    if (problem) return;
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }, []);

  function clear() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const id = await uploadFile(file);
      toast.success("Uploaded securely. Reading your instructions…");
      router.push(`/scan/${id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-accent/40 focus-within:ring-3 focus-within:ring-ring/50",
            dragging && "border-primary bg-accent/60",
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary" aria-hidden="true">
            <UploadCloud className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              <span className="text-primary underline underline-offset-4">Choose a file</span> or drag it here
            </p>
            <p className="text-sm text-muted-foreground">Photo (JPEG, PNG, WebP) or PDF · up to 4 MB</p>
          </div>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="Preview of the selected instructions" className="size-full object-cover" />
            ) : (
              <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {file.type || "unknown type"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={clear} aria-label="Remove selected file" disabled={uploading}>
            <X />
          </Button>
        </div>
      )}

      {error ? (
        <Notice tone="danger" title="We couldn't use that file">
          {error}
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="h-11 flex-1 sm:flex-none sm:px-6" disabled={!file || uploading} onClick={submit}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
          {uploading ? "Uploading securely…" : "Upload and read instructions"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11 sm:hidden"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
        >
          <Camera aria-hidden="true" /> Take a photo
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
