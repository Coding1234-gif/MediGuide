"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TimezoneSelect } from "@/components/shared/timezone-select";
import { Notice } from "@/components/shared/notice";
import { apiFetch, ClientApiError } from "@/lib/api-client";

const noopSubscribe = () => () => {};

export function TimezoneForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [tz, setTz] = useState(initial);
  const [saving, setSaving] = useState(false);
  const browserTz = useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/api/settings", { method: "PATCH", json: { timezone: tz } });
      toast.success("Time zone saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="settings-tz">Your time zone</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <TimezoneSelect id="settings-tz" value={tz} onChange={setTz} className="sm:max-w-sm" />
        <Button onClick={save} disabled={saving || tz === initial} className="h-10">
          {saving ? <Loader2 className="animate-spin" /> : <Save aria-hidden="true" />} Save
        </Button>
      </div>
      {browserTz && browserTz !== initial ? (
        <p className="text-sm text-muted-foreground">
          Your device is set to <strong>{browserTz.replace(/_/g, " ")}</strong>.{" "}
          <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setTz(browserTz)}>
            Use this
          </button>
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Used for displaying times and for new schedules. Existing schedules keep the time zone they were created in.
      </p>
    </div>
  );
}

export function NotificationForm({ initial, emailAvailable }: { initial: { email: boolean; browser: boolean }; emailAvailable: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const initialPermission = useSyncExternalStore<NotificationPermission | "unsupported">(
    noopSubscribe,
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "default",
  );
  const [requested, setPermission] = useState<NotificationPermission | null>(null);
  const permission = requested ?? initialPermission;

  async function update(next: { email: boolean; browser: boolean }) {
    const prev = prefs;
    setPrefs(next);
    try {
      await apiFetch("/api/notifications/preferences", { method: "PUT", json: next });
      toast.success("Notification preferences saved.");
    } catch (err) {
      setPrefs(prev);
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't save.");
    }
  }

  async function enableBrowser(on: boolean) {
    if (on && permission !== "granted" && permission !== "unsupported") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast.error("Notifications were blocked in your browser settings.");
        return;
      }
    }
    await update({ ...prefs, browser: on });
  }

  function sendTest() {
    if (permission !== "granted") return;
    // Fictional content only — never real medication details.
    new Notification("MediGuide test reminder", {
      body: "This is a test. Real reminders show the details from your verified instructions.",
      tag: "mediguide-test",
    });
    toast.success("Test notification sent.");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="pref-browser">Browser notifications</Label>
          <p className="text-sm text-muted-foreground">Show reminders on this device while MediGuide is open.</p>
        </div>
        <Switch id="pref-browser" checked={prefs.browser} onCheckedChange={(c) => enableBrowser(c)} disabled={permission === "unsupported"} />
      </div>
      {permission === "unsupported" ? (
        <Notice tone="info">This browser doesn&apos;t support notifications. You can add schedules to your calendar (.ics) instead.</Notice>
      ) : null}
      {permission === "denied" ? (
        <Notice tone="warning">Notifications are blocked for this site in your browser settings.</Notice>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor="pref-email">Email reminders</Label>
          <p className="text-sm text-muted-foreground">
            {emailAvailable
              ? "A short, generic email at reminder time. Medicine names are never included."
              : "Email delivery isn't configured on this server yet."}
          </p>
        </div>
        <Switch id="pref-email" checked={prefs.email} onCheckedChange={(c) => update({ ...prefs, email: c })} disabled={!emailAvailable} />
      </div>
      <Button variant="outline" onClick={sendTest} disabled={permission !== "granted"}>
        <BellRing aria-hidden="true" /> Send a test notification
      </Button>
      <p className="text-xs text-muted-foreground">
        Notifications can be delayed or missed (for example if your device is off or in focus mode). Always keep your original instructions to hand.
      </p>
    </div>
  );
}

export function DeleteDocumentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      toast.success("Document deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Couldn't delete.");
      setBusy(false);
    }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} aria-label={`Delete ${name}`} />}>
        {busy ? <Loader2 className="animate-spin" /> : <Trash2 aria-hidden="true" />} Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The file is permanently removed. Any schedule made from it keeps working, using the details you verified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
