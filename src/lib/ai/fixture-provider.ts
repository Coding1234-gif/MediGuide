import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLE_DOCUMENTS } from "./fixtures";
import { ExtractionProviderError, type ExtractionInput, type InstructionExtractionProvider, type ProviderRawOutput } from "./provider";

let hashIndex: Promise<Map<string, string>> | undefined;

/** sha256(sample file bytes) → sample id, computed from the files actually shipped in public/samples. */
function loadHashIndex(): Promise<Map<string, string>> {
  hashIndex ??= (async () => {
    const map = new Map<string, string>();
    for (const sample of SAMPLE_DOCUMENTS) {
      try {
        const bytes = await readFile(path.join(process.cwd(), "public", "samples", sample.file));
        map.set(createHash("sha256").update(bytes).digest("hex"), sample.id);
      } catch {
        // Sample not generated yet; skip.
      }
    }
    return map;
  })();
  return hashIndex;
}

/**
 * Deterministic stand-in used when no AI key is configured. It recognises ONLY the
 * bundled fictional samples and refuses everything else — it never fabricates output.
 */
export class FixtureExtractionProvider implements InstructionExtractionProvider {
  readonly id = "fixture";

  async extract(input: ExtractionInput): Promise<ProviderRawOutput> {
    const sampleId = (await loadHashIndex()).get(input.sha256);
    const sample = SAMPLE_DOCUMENTS.find((s) => s.id === sampleId);
    if (!sample) {
      throw new ExtractionProviderError(
        "not_configured",
        "AI extraction isn't configured on this server (no OPENAI_API_KEY). In fixture mode only the bundled sample documents can be processed.",
        false,
      );
    }
    return { json: structuredClone(sample.extraction), modelIdentifier: `fixture:${sample.id}`, live: false };
  }
}
