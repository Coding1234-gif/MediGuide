export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media_type"
  | "service_unavailable"
  | "internal";

export const API_ERROR_STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  service_unavailable: 503,
  internal: 500,
};

/** Domain/service error carrying an HTTP-mappable code. Messages are user-safe. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Shape of every error response body. */
export type ApiErrorBody = { error: { code: ApiErrorCode; message: string; details?: unknown } };
