import type { ApiErrorBody, ApiErrorCode } from "@/lib/errors";

/** Client-side error mirroring the server's { error: { code, message, details } } body. */
export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode | "network",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(input, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ClientApiError(0, "network", "Couldn't reach MediGuide. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ClientApiError(res.status, err?.code ?? "internal", err?.message ?? "Something went wrong. Please try again.", err?.details);
  }
  return body as T;
}
