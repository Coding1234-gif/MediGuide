import { NextResponse } from "next/server";
import { analyzeSymptoms, symptomRequestSchema } from "@/features/symptom-guidance/service";
import { ApiError, readJson, requireApiUser, withApi } from "@/lib/http";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export const POST = withApi("symptoms.analyze", async (request: Request) => {
  const user = await requireApiUser();
  if (!checkRateLimit(`symptoms:${user.id}`, 30, 60 * 60 * 1000)) {
    throw new ApiError("rate_limited", "Too many requests. Please try again later.");
  }
  const input = symptomRequestSchema.parse(await readJson(request));
  return NextResponse.json({ result: await analyzeSymptoms(user.id, input) });
});
