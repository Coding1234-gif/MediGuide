import "server-only";
import OpenAI from "openai";
import { env } from "@/config/env";
import {
  ExtractionProviderError,
  type ExtractionInput,
  type InstructionExtractionProvider,
  type ProviderRawOutput,
  type TextGenerationProvider,
} from "./provider";
import { EXTRACTION_SYSTEM_PROMPT, extractionJsonSchema } from "./schemas";

const TIMEOUT_MS = 60_000;

function client(): OpenAI {
  if (!env.OPENAI_API_KEY) throw new ExtractionProviderError("not_configured", "OPENAI_API_KEY is not set.", false);
  return new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: TIMEOUT_MS, maxRetries: 2 });
}

function mapError(err: unknown): ExtractionProviderError {
  if (err instanceof ExtractionProviderError) return err;
  if (err instanceof OpenAI.APIConnectionTimeoutError) return new ExtractionProviderError("timeout", "The AI service timed out.", true);
  if (err instanceof OpenAI.APIError) {
    const retryable = err.status === 429 || (err.status ?? 500) >= 500;
    return new ExtractionProviderError("provider_error", `AI service error (${err.status ?? "unknown"}).`, retryable);
  }
  return new ExtractionProviderError("provider_error", "Unexpected AI service failure.", true);
}

export class OpenAIExtractionProvider implements InstructionExtractionProvider {
  readonly id = "openai";
  constructor(private readonly model = env.AI_EXTRACTION_MODEL) {}

  async extract(input: ExtractionInput): Promise<ProviderRawOutput> {
    const base64 = Buffer.from(input.bytes).toString("base64");
    const dataUrl = `data:${input.mimeType};base64,${base64}`;
    const documentPart =
      input.mimeType === "application/pdf"
        ? ({ type: "input_file", filename: "instructions.pdf", file_data: dataUrl } as const)
        : ({ type: "input_image", image_url: dataUrl, detail: "high" } as const);

    try {
      const response = await client().responses.create({
        model: this.model,
        input: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Transcribe the attached document according to the rules. Return only the JSON object." },
              documentPart,
            ],
          },
        ],
        text: {
          format: { type: "json_schema", name: "medicine_instruction_extraction", schema: extractionJsonSchema as unknown as Record<string, unknown>, strict: true },
        },
      });
      const raw = response.output_text;
      if (!raw) throw new ExtractionProviderError("invalid_output", "The AI service returned no content.", true);
      try {
        return { json: JSON.parse(raw), modelIdentifier: `openai:${this.model}`, live: true };
      } catch {
        throw new ExtractionProviderError("invalid_output", "The AI service returned malformed JSON.", true);
      }
    } catch (err) {
      throw mapError(err);
    }
  }
}

export class OpenAITextProvider implements TextGenerationProvider {
  readonly id = "openai";
  constructor(private readonly model = env.AI_SUMMARY_MODEL) {}

  async generateJson(args: { system: string; user: string; schemaName: string; jsonSchema: Record<string, unknown> }) {
    try {
      const response = await client().responses.create({
        model: this.model,
        input: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        text: { format: { type: "json_schema", name: args.schemaName, schema: args.jsonSchema, strict: true } },
      });
      return JSON.parse(response.output_text);
    } catch (err) {
      throw mapError(err);
    }
  }
}
