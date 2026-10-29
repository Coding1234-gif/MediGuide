"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const FLAG = "mg_tz_synced";

/** New profiles default to UTC; adopt the device's time zone once. Users can change it in Settings. */
export function TimezoneSync({ profileTimezone }: { profileTimezone: string }) {
  const router = useRouter();
  useEffect(() => {
    if (profileTimezone !== "UTC") return;
    let done = false;
    try {
      done = localStorage.getItem(FLAG) === "1";
    } catch {
      // storage unavailable; fall through and sync once per page load
    }
    if (done) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === "UTC") return;
    void fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone: tz }) }).then((res) => {
      try {
        localStorage.setItem(FLAG, "1");
      } catch {}
      if (res.ok) router.refresh();
    });
  }, [profileTimezone, router]);
  return null;
}
