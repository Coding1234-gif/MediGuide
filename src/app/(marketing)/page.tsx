import Link from "next/link";
import { CheckCircle2, Lock, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Scan", text: "Photograph the instructions from your pharmacist, or upload a PDF." },
  { title: "Read", text: "MediGuide copies what's written into clear fields and links each one to the words on the page." },
  { title: "Check", text: "You compare every detail with the original and fix anything that's wrong." },
  { title: "Get reminders", text: "Your checked instructions become a reminder schedule you approve." },
];

const CHECKS = [
  ["Every detail shows its source", "Each field appears next to the exact words it came from in your document."],
  ["Unclear directions are stopped", "“As needed”, “as directed”, and missing or contradictory directions never become a schedule. MediGuide asks you to speak to your pharmacist instead."],
  ["Health information has named sources", "Symptom information comes from referenced NHS pages. Fixed rules check for urgent warning signs first."],
];

const LIMITS: [boolean, string][] = [
  [true, "Helps you read, check and remember written instructions"],
  [true, "Links to reputable health information"],
  [false, "Doesn't diagnose conditions"],
  [false, "Doesn't recommend medicines or doses"],
  [false, "Doesn't replace your pharmacist, doctor or emergency services"],
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Turn confusing medicine instructions into reminders you can trust.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            MediGuide reads your instructions, shows you where each detail came from, and only schedules what you&apos;ve confirmed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
              Scan your instructions
            </Link>
            <Link href="/login?next=/symptoms" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-5 text-base")}>
              Explore symptoms
            </Link>
          </div>
        </div>
        <HeroExample />
      </section>

      <section aria-labelledby="how-title" className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t border-primary-foreground/30 pt-4">
                <span className="text-3xl font-semibold tabular-nums" aria-hidden="true">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-primary-foreground/85">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="checks-title" className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <h2 id="checks-title" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">How MediGuide checks your instructions</h2>
        <dl className="divide-y border-y">
          {CHECKS.map(([title, text]) => (
            <div key={title} className="grid gap-1 py-5 sm:grid-cols-[1fr_1.5fr] sm:gap-6">
              <dt className="font-semibold">{title}</dt>
              <dd className="text-muted-foreground">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="limits-title" className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-3">
          <h2 id="limits-title" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">What MediGuide can and can&apos;t do</h2>
          <p className="text-muted-foreground">MediGuide is a hackathon prototype and hasn&apos;t been clinically validated.</p>
        </div>
        <div className="space-y-5">
          <ul className="space-y-3">
            {LIMITS.map(([ok, text]) => (
              <li key={text} className="flex items-start gap-3">
                {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-3 border-t pt-5 text-muted-foreground">
            <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /> Your documents are stored privately and you can delete them at any time.
          </p>
        </div>
      </section>
    </>
  );
}

/** Static, decorative example: a label and the details read from it. */
function HeroExample() {
  const highlight = "rounded-sm bg-accent px-0.5 text-foreground";
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-md rounded-lg bg-secondary p-5 sm:p-6">
      <div className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">Fictional sample label</p>
        <p className="mt-1 font-semibold">Corvanex 250 mg capsules</p>
        <p className="mt-2 text-sm leading-relaxed">
          Take <mark className={highlight}>one capsule</mark> by mouth <mark className={highlight}>three times a day</mark> with food{" "}
          <mark className={highlight}>for 7 days</mark>.
        </p>
      </div>
      <dl className="mt-4 divide-y divide-primary/15 text-sm">
        {[
          ["Amount per dose", "One capsule"],
          ["How often", "Three times a day"],
          ["How long", "For 7 days"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-secondary-foreground">{k}</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              {v} <CheckCircle2 className="size-4 text-success" />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground">
        21 reminders at 08:00, 14:00 and 20:00
      </p>
    </div>
  );
}
