/**
 * Minimal structured logger. Callers must pass identifiers and codes only —
 * never document contents, extracted fields, symptoms or other health data.
 */
type Level = "info" | "warn" | "error";
type Meta = Record<string, string | number | boolean | null | undefined>;

function write(level: Level, event: string, meta?: Meta) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, meta?: Meta) => write("info", event, meta),
  warn: (event: string, meta?: Meta) => write("warn", event, meta),
  error: (event: string, meta?: Meta) => write("error", event, meta),
};
