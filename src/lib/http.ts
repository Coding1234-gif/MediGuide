import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";

import { API_ERROR_STATUS as STATUS, ApiError, type ApiErrorCode } from "@/lib/errors";

export { ApiError };

/** Consistent error body: { error: { code, message, details? } } */
export function errorResponse(code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status: STATUS[code] });
}

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("unauthorized", "Please sign in to continue.");
  return user;
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wrap a route handler with uniform error mapping. Never echoes request bodies into logs. */
export function withApi<C>(route: string, handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err.code, err.message, err.details);
      if (err instanceof ZodError) {
        return errorResponse(
          "bad_request",
          "Some of the submitted information is invalid.",
          err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        );
      }
      // Next.js control-flow errors (redirect/notFound) must propagate.
      if (err && typeof err === "object" && "digest" in err) throw err;
      logger.error("api.unhandled", { route, error: err instanceof Error ? err.message : String(err) });
      return errorResponse("internal", "Something went wrong on our side. Please try again.");
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("bad_request", "Request body must be valid JSON.");
  }
}
