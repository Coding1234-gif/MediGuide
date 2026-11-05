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
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/** Groq exposes an OpenAI-compatible Chat Completions API, so the OpenAI SDK is used as the HTTP client. */
function client(): OpenAI {
  if (!env.GROQ_API_KEY) throw new ExtractionProviderError("not_configured", "GROQ_API_KEY is not set.", false);
  return new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: GROQ_BASE_URL, timeout: TIMEOUT_MS, maxRetries: 4 });
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

/** qwen3 models on Groq think by default (~30s per call); transcription doesn't need it. Ignored by other models via the fallback below. */
const REASONING = { reasoning_effort: "none" } as Record<string, unknown>;

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Ask for schema-constrained JSON. If the model rejects `json_schema` (400), fall back to plain JSON mode.
 * Output is always Zod-validated by the caller either way.
 */
async function completeJson(model: string, baseMessages: Message[], schemaName: string, schema: Record<string, unknown>): Promise<string> {
  const c = client();
  // Not every Groq model enforces json_schema, so the schema is always spelled out in the prompt as well.
  const messages: Message[] = [
    ...baseMessages,
    {
      role: "system",
      content: `Respond with ONLY one JSON object that conforms exactly to this JSON Schema (use these exact top-level keys, no wrapper objects, no extra keys, no prose):
${JSON.stringify(schema)}`,
    },
  ];
  try {
    const res = await c.chat.completions.create({
      model,
      messages,
      temperature: 0,
      ...REASONING,
      response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (err) {
    if (!(err instanceof OpenAI.APIError) || err.status !== 400) throw err;
    const res = await c.chat.completions.create({
      model,
      messages,
      temperature: 0,
      ...REASONING,
      response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

export class GroqExtractionProvider implements InstructionExtractionProvider {
  readonly id = "groq";
  constructor(private readonly model = env.AI_EXTRACTION_MODEL) {}

  async extract(input: ExtractionInput): Promise<ProviderRawOutput> {
    if (input.mimeType === "application/pdf") {
      throw new ExtractionProviderError("unsupported_document", "PDF reading isn't available with this AI provider. Please upload a photo (JPG/PNG) of the label.", false);
    }
    const dataUrl = `data:${input.mimeType};base64,${Buffer.from(input.bytes).toString("base64")}`;

    try {
      const raw = await completeJson(
        this.model,
        [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe the attached document according to the rules. Return only the JSON object." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        "medicine_instruction_extraction",
        extractionJsonSchema as unknown as Record<string, unknown>,
      );
      if (!raw) throw new ExtractionProviderError("invalid_output", "The AI service returned no content.", true);
      try {
        return { json: JSON.parse(raw), modelIdentifier: `groq:${this.model}`, live: true };
      } catch {
        throw new ExtractionProviderError("invalid_output", "The AI service returned malformed JSON.", true);
      }
    } catch (err) {
      throw mapError(err);
    }
  }
}

export class GroqTextProvider implements TextGenerationProvider {
  readonly id = "groq";
  constructor(private readonly model = env.AI_SUMMARY_MODEL) {}

  async generateJson(args: { system: string; user: string; schemaName: string; jsonSchema: Record<string, unknown> }) {
    try {
      const raw = await completeJson(
        this.model,
        [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        args.schemaName,
        args.jsonSchema,
      );
      return JSON.parse(raw);
    } catch (err) {
      throw mapError(err);
    }
  }
}
