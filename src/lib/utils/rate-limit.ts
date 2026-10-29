/**
 * Best-effort fixed-window rate limiter keyed by user + action.
 * In serverless deployments each instance keeps its own window, so this limits
 * abuse per instance only. Swap for a shared store (e.g. Upstash Redis) if needed.
 */
const windows = new Map<string, { start: number; count: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const w = windows.get(key);
  if (!w || now - w.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  if (w.count >= limit) return false;
  w.count += 1;
  return true;
}

export function resetRateLimits() {
  windows.clear();
}
