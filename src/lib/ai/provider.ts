import type { AllowedMimeType } from "@/lib/validation/files";

export type ExtractionInput = {
  bytes: Uint8Array;
  mimeType: AllowedMimeType;
  sha256: string;
};

export type ProviderRawOutput = {
  /** Unvalidated JSON from the provider; always passed through Zod before use. */
  json: unknown;
  /** "groq:<model>" or "fixture:<sample-id>" — persisted with the extraction. */
  modelIdentifier: string;
  /** True only for real model inference. Fixture results are labelled in the UI. */
  live: boolean;
};

export class ExtractionProviderError extends Error {
  constructor(
    public readonly code: "not_configured" | "unsupported_document" | "provider_error" | "timeout" | "invalid_output",
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

/** Adapter boundary: domain code depends on this, never on a vendor SDK. */
export interface InstructionExtractionProvider {
  readonly id: string;
  extract(input: ExtractionInput): Promise<ProviderRawOutput>;
}

export interface TextGenerationProvider {
  readonly id: string;
  generateJson(args: { system: string; user: string; schemaName: string; jsonSchema: Record<string, unknown> }): Promise<unknown>;
}
