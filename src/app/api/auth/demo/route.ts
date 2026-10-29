import { NextResponse } from "next/server";
import { z } from "zod";
import { isDemoAuthEnabled } from "@/config/env";
import { createDemoToken, DEMO_COOKIE, DEMO_USERS } from "@/lib/auth/demo";
import { ApiError, readJson, withApi } from "@/lib/http";

const bodySchema = z.object({ userId: z.enum(DEMO_USERS.map((u) => u.id) as [string, ...string[]]) });

/** Sign in as a fictional demo account. Disabled unless demo mode is enabled. */
export const POST = withApi("auth.demo", async (request: Request) => {
  if (!isDemoAuthEnabled()) throw new ApiError("forbidden", "Demo sign-in is disabled on this deployment.");
  const { userId } = bodySchema.parse(await readJson(request));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, createDemoToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return response;
});

export const DELETE = withApi("auth.demo.signout", async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEMO_COOKIE);
  return response;
});
