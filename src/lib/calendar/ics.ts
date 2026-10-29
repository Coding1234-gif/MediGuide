/** Minimal RFC 5545 calendar export for confirmed reminder events (fallback when push isn't available). */

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets as required by RFC 5545. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

export type IcsEvent = { id: string; start: Date; title: string; description: string };

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MediGuide//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@mediguide`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(new Date(e.start.getTime() + 15 * 60 * 1000))}`,
      fold(`SUMMARY:${escape(e.title)}`),
      fold(`DESCRIPTION:${escape(e.description)}`),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Medicine reminder",
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
