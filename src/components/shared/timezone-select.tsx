"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

function allZones(current: string): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return Array.from(new Set([current, browser, "UTC", ...supported])).filter(Boolean);
}

/** Native select (accessible, mobile-friendly) of IANA time zones. */
export function TimezoneSelect({ id, value, onChange, className }: { id?: string; value: string; onChange: (tz: string) => void; className?: string }) {
  const zones = useMemo(() => allZones(value), [value]);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm",
        className,
      )}
    >
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
