/** Upload rules shared by the client (pre-check) and server (authoritative). */

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Kept under Vercel's 4.5 MB request body limit for serverless functions. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

export function isAllowedMimeType(type: string): type is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

/** Detect the real file type from magic bytes; never trust the client-declared type alone. */
export function sniffMimeType(bytes: Uint8Array): AllowedMimeType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  return null;
}

export type FileCheck = { ok: true; mimeType: AllowedMimeType } | { ok: false; code: "too_large" | "empty" | "unsupported_type" | "type_mismatch"; message: string };

export function validateUploadedFile(bytes: Uint8Array, declaredType: string): FileCheck {
  if (bytes.length === 0) return { ok: false, code: "empty", message: "The file is empty." };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, code: "too_large", message: `Files must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller.` };
  }
  const sniffed = sniffMimeType(bytes);
  if (!sniffed) return { ok: false, code: "unsupported_type", message: "Only JPEG, PNG, WebP images and PDF documents are supported." };
  if (declaredType && declaredType !== sniffed && !(declaredType === "image/jpg" && sniffed === "image/jpeg")) {
    return { ok: false, code: "type_mismatch", message: "The file's contents don't match its type." };
  }
  return { ok: true, mimeType: sniffed };
}

export function extensionFor(type: AllowedMimeType): string {
  return { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" }[type];
}
