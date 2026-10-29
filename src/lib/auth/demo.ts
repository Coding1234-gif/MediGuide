import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

/** Fictional accounts for local development and hackathon demos. Two users let us demo isolation. */
export const DEMO_USERS = [
  { id: "00000000-0000-4000-8000-0000000a11ce", email: "alex@demo.mediguide.test", displayName: "Alex (demo)" },
  { id: "00000000-0000-4000-8000-000000000b0b", email: "sam@demo.mediguide.test", displayName: "Sam (demo)" },
] as const;

export const DEMO_COOKIE = "mg_demo_session";

function secret(): string {
  if (env.DEMO_SESSION_SECRET) return env.DEMO_SESSION_SECRET;
  // The fixed fallback is only acceptable for local development.
  if (env.NODE_ENV === "production") throw new Error("DEMO_SESSION_SECRET must be set to use demo mode in production.");
  return "mediguide-local-dev-secret-not-for-production";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createDemoToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyDemoToken(token: string | undefined): (typeof DEMO_USERS)[number] | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { sub, iat } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub: string; iat: number };
    if (Date.now() - iat > 7 * 24 * 3600 * 1000) return null;
    return DEMO_USERS.find((u) => u.id === sub) ?? null;
  } catch {
    return null;
  }
}
