/**
 * Deterministic parsers that map *verified* instruction text onto the small set of
 * scheduling patterns MediGuide supports. They never infer clinical intent:
 * anything outside the explicit patterns below is reported as unsupported.
 */

export type FrequencyPattern =
  | { kind: "times_per_day"; count: 1 | 2 | 3 | 4 }
  | { kind: "every_n_hours"; hours: 4 | 6 | 8 | 12 | 24 };

export type ParseFailure = { kind: "unsupported"; reason: string };

/** Phrases that mean the instruction requires judgement and must never become a fixed routine. */
const NON_ROUTINE_PATTERNS: Array<[RegExp, string]> = [
  [/\bas\s+(?:needed|required)\b|\bwhen\s+(?:needed|required)\b|\bif\s+(?:needed|required)\b|\bp\.?r\.?n\.?\b/i, "The instructions say to take this “as needed”, which depends on symptoms rather than a fixed routine."],
  [/\bas\s+directed\b|\bas\s+advised\b|\bas\s+instructed\b|\bas\s+per\s+(?:doctor|prescriber|pharmacist)\b/i, "The instructions say “as directed”, which refers to guidance that isn't written on this document."],
  [/\bup\s+to\b|\bmax(?:imum)?\b|\bno\s+more\s+than\b/i, "The instructions describe a maximum rather than a fixed routine."],
  [/\bor\b/i, "The instructions offer a choice (for example “one or two”), which needs clarification before scheduling."],
  [/\bsliding\s+scale\b|\btaper|\breduc(?:e|ing)\b|\bincreas(?:e|ing)\b|\bthen\b/i, "The instructions change over time (for example a tapering course), which MediGuide does not schedule automatically."],
];

const WORD_NUMBERS: Record<string, number> = { one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4 };

function toNumber(token: string): number | null {
  const t = token.toLowerCase();
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t];
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function detectNonRoutine(textValue: string): string | null {
  for (const [re, reason] of NON_ROUTINE_PATTERNS) if (re.test(textValue)) return reason;
  return null;
}

const DAILY_COUNT_RE =
  /\b(once|twice|thrice|one|two|three|four|[1-4])\s*(?:times?|x)?\s*(?:a|per|each|every)\s*day\b|\b(once|twice|thrice)\s+daily\b|\b(one|two|three|four|[1-4])\s+times\s+daily\b/gi;
const LATIN_RE = /\b(o\.?d|b\.?d|b\.?i\.?d|t\.?d\.?s|t\.?i\.?d|q\.?d\.?s|q\.?i\.?d)\b\.?/gi;
const LATIN_MAP: Record<string, 1 | 2 | 3 | 4> = { od: 1, bd: 2, bid: 2, tds: 3, tid: 3, qds: 4, qid: 4 };
const EVERY_HOURS_RE = /\bevery\s+(\d{1,2})\s*(?:hours?|hrs?|h)\b|\bq\s?(\d{1,2})h\b/gi;
const DAILY_ONLY_RE = /\b(?:daily|every\s+day|each\s+day|once\s+a\s+day)\b/i;
const PER_DAY_LIST_RE = /\b(morning|breakfast)\b.*\b(evening|night|bedtime|dinner)\b/i;

/** Collect every distinct frequency the text mentions; more than one means it is contradictory. */
function collectFrequencies(textValue: string, allowBareDaily: boolean): FrequencyPattern[] {
  const found: FrequencyPattern[] = [];
  for (const m of textValue.matchAll(DAILY_COUNT_RE)) {
    const n = toNumber(m[1] ?? m[2] ?? m[3]);
    if (n && n >= 1 && n <= 4) found.push({ kind: "times_per_day", count: n as 1 | 2 | 3 | 4 });
  }
  for (const m of textValue.matchAll(LATIN_RE)) {
    const key = m[1].replace(/\./g, "").toLowerCase();
    const n = LATIN_MAP[key];
    if (n) found.push({ kind: "times_per_day", count: n });
  }
  for (const m of textValue.matchAll(EVERY_HOURS_RE)) {
    const n = Number.parseInt(m[1] ?? m[2], 10);
    found.push({ kind: "every_n_hours", hours: n as 4 });
  }
  if (allowBareDaily && found.length === 0 && DAILY_ONLY_RE.test(textValue)) found.push({ kind: "times_per_day", count: 1 });
  return found;
}

function samePattern(a: FrequencyPattern, b: FrequencyPattern): boolean {
  if (a.kind === "times_per_day" && b.kind === "times_per_day") return a.count === b.count;
  if (a.kind === "every_n_hours" && b.kind === "every_n_hours") return a.hours === b.hours;
  // "every 24 hours" ≡ once a day; "every 12 hours" is NOT treated as ≡ twice a day (spacing differs).
  const [t, e] = a.kind === "times_per_day" ? [a, b as Extract<FrequencyPattern, { kind: "every_n_hours" }>] : [b as Extract<FrequencyPattern, { kind: "times_per_day" }>, a];
  return t.count === 1 && e.hours === 24;
}

const SUPPORTED_HOURS = new Set([4, 6, 8, 12, 24]);

export function parseFrequency(frequencyText: string, timingText?: string | null): FrequencyPattern | ParseFailure {
  const combined = [frequencyText, timingText ?? ""].join(" \n ");
  const nonRoutine = detectNonRoutine(frequencyText);
  if (nonRoutine) return { kind: "unsupported", reason: nonRoutine };

  const fromFrequency = collectFrequencies(frequencyText, true);
  const fromTiming = timingText ? collectFrequencies(timingText, false) : [];
  const all = [...fromFrequency, ...fromTiming];

  if (fromFrequency.length === 0) {
    if (PER_DAY_LIST_RE.test(combined)) {
      return { kind: "unsupported", reason: "The frequency isn't stated as a number of times per day or an hourly interval. Please confirm the exact frequency with your pharmacist." };
    }
    return { kind: "unsupported", reason: "MediGuide couldn't find an explicit frequency such as “twice a day” or “every 8 hours”." };
  }
  const first = all[0];
  if (all.some((p) => !samePattern(p, first))) {
    return { kind: "unsupported", reason: "The instructions mention more than one frequency, which is contradictory. Please check with your pharmacist or prescriber." };
  }
  if (first.kind === "every_n_hours" && !SUPPORTED_HOURS.has(first.hours)) {
    return { kind: "unsupported", reason: `An interval of every ${first.hours} hours isn't a pattern MediGuide schedules automatically.` };
  }
  if (first.kind === "every_n_hours" && first.hours === 24) return { kind: "times_per_day", count: 1 };
  return first;
}

export type DurationResult = { kind: "days"; days: number } | { kind: "ongoing" } | ParseFailure;

const DURATION_RE = /\bfor\s+(\d{1,3}|one|two|three|four|five|six|seven|ten|fourteen)\s+(day|days|week|weeks)\b/gi;
const DURATION_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14 };
const ONGOING_RE = /\b(?:long[\s-]?term|ongoing|continue\s+(?:to\s+take\s+)?(?:daily|every\s+day)|regular(?:ly)?\s+every\s+day|until\s+told\s+to\s+stop)\b/i;
const VAGUE_DURATION_RE = /\buntil\s+(?:finished|gone|all\s+taken|better|symptoms)|\bcomplete\s+the\s+course\b|\bas\s+(?:needed|directed)\b/i;

export const MAX_COURSE_DAYS = 90;

export function parseDuration(durationText: string): DurationResult {
  const vague = VAGUE_DURATION_RE.test(durationText);
  const matches = [...durationText.matchAll(DURATION_RE)];
  if (matches.length > 1) {
    const distinct = new Set(matches.map((m) => m[0].toLowerCase()));
    if (distinct.size > 1) return { kind: "unsupported", reason: "The duration is stated more than once with different values." };
  }
  if (matches.length >= 1) {
    const m = matches[0];
    const n = DURATION_WORDS[m[1].toLowerCase()] ?? Number.parseInt(m[1], 10);
    const days = m[2].toLowerCase().startsWith("week") ? n * 7 : n;
    if (!Number.isFinite(days) || days < 1) return { kind: "unsupported", reason: "The duration couldn't be read as a number of days." };
    if (days > MAX_COURSE_DAYS) return { kind: "unsupported", reason: `Courses longer than ${MAX_COURSE_DAYS} days aren't scheduled automatically in this version.` };
    return { kind: "days", days };
  }
  if (ONGOING_RE.test(durationText)) return { kind: "ongoing" };
  if (vague) {
    return { kind: "unsupported", reason: "The duration depends on something not written as a number of days (for example “until finished”). Please confirm the exact length of the course." };
  }
  return { kind: "unsupported", reason: "MediGuide couldn't find an explicit duration such as “for 7 days”." };
}

export function describeFrequency(p: FrequencyPattern): string {
  if (p.kind === "every_n_hours") return `Every ${p.hours} hours`;
  return ["", "Once a day", "Twice a day", "Three times a day", "Four times a day"][p.count];
}

export function remindersPerDay(p: FrequencyPattern): number {
  return p.kind === "times_per_day" ? p.count : 24 / p.hours;
}
