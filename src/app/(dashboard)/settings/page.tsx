import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteDocumentButton, NotificationForm, TimezoneForm } from "@/components/settings/settings-forms";
import { integrationStatus } from "@/config/env";
import { listDocuments } from "@/features/document-extraction/service";
import { getProfile } from "@/features/profile/service";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { formatLocal } from "@/lib/scheduler/timezone";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const [profile, docs] = await Promise.all([getProfile(user.id), listDocuments(user.id)]);
  const tz = profile?.timezone ?? "UTC";
  const status = integrationStatus();

  return (
    <>
      <PageHeader title="Settings" description="Manage your time zone, notifications and data." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Signed in as {user.email ?? user.displayName}
              {user.authMode === "demo" ? " (fictional demo account)" : ""}.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time zone</CardTitle>
          </CardHeader>
          <CardContent>
            <TimezoneForm initial={tz} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose how you&apos;d like to be reminded. You can turn these off at any time.</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationForm initial={profile?.notificationPreferences ?? { email: false, browser: false }} emailAvailable={status.email === "resend"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your documents</CardTitle>
            <CardDescription>Uploaded instruction files are stored privately. Delete any you no longer need.</CardDescription>
          </CardHeader>
          <CardContent>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents stored.</p>
            ) : (
              <ul className="divide-y">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <Link href={`/scan/${d.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {d.originalName}
                    </Link>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{formatLocal(d.createdAt, tz, "d MMM yyyy")}</span>
                    <DeleteDocumentButton id={d.id} name={d.originalName} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Documents and details are only visible to you. We don&apos;t log the contents of documents or symptoms.</p>
            <p>
              {status.ai === "openai"
                ? "Uploaded documents are sent to our AI provider (OpenAI) only to read the text, then the result is stored in your account."
                : "Live AI isn't enabled on this server; documents are not sent to any AI provider."}
            </p>
            <p>MediGuide is a hackathon prototype. It isn&apos;t a certified medical device and hasn&apos;t been clinically validated.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
