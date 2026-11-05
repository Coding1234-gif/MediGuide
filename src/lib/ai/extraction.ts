import "server-only";
import { env } from "@/config/env";
import { extractionResultSchema, normalizeExtraction, type ExtractionResult } from "@/lib/validation/extraction";
import { FixtureExtractionProvider } from "./fixture-provider";
import { GroqExtractionProvider } from "./groq-provider";
import { ExtractionProviderError, type ExtractionInput, type InstructionExtractionProvider } from "./provider";

let override: InstructionExtractionProvider | undefined;

export function getExtractionProvider(): InstructionExtractionProvider {
  if (override) return override;
  return env.GROQ_API_KEY ? new GroqExtractionProvider() : new FixtureExtractionProvider();
}

export function setExtractionProviderForTests(p: InstructionExtractionProvider | undefined) {
  override = p;
}

export type ValidatedExtraction = {
  result: ExtractionResult;
  modelIdentifier: string;
  live: boolean;
};

/** Run the provider, then treat its output as untrusted: Zod-validate and normalise invariants. */
export async function runInstructionExtraction(input: ExtractionInput): Promise<ValidatedExtraction> {
  const provider = getExtractionProvider();
  let raw = await provider.extract(input);
  let parsed = extractionResultSchema.safeParse(raw.json);
  if (!parsed.success) {
    // Live models occasionally return the wrong shape; one retry is cheap, and the output is validated either way.
    raw = await provider.extract(input);
    parsed = extractionResultSchema.safeParse(raw.json);
  }
  if (!parsed.success) {
    throw new ExtractionProviderError("invalid_output", "The AI returned data in an unexpected shape.", true);
  }
  return { result: normalizeExtraction(parsed.data), modelIdentifier: raw.modelIdentifier, live: raw.live };
}
