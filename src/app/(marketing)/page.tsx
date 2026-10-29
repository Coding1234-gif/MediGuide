import Link from "next/link";
import { ArrowRight, BellRing, BookOpenCheck, CheckCircle2, FileSearch, HeartPulse, Lock, ScanLine, ShieldCheck, XCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: ScanLine, title: "Scan", text: "Photograph the instructions from your pharmacist, or upload a PDF." },
  { icon: FileSearch, title: "Understand", text: "AI transcribes what's written into clear fields — each linked to the exact words on the page." },
  { icon: CheckCircle2, title: "Verify", text: "You compare every detail with the original and fix anything wrong. Nothing is assumed." },
  { icon: BellRing, title: "Stay on track", text: "Clear, verified instructions become a reminder schedule you approve." },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--secondary),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" /> Verification before every reminder
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Turn confusing medicine instructions into reminders you can trust.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Understand your health. Simplify your medicine. Stay on track. MediGuide reads your instructions, shows you exactly where
              each detail came from, and only schedules what you&apos;ve confirmed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
                Scan your instructions <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/login?next=/symptoms" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-5")}>
                <HeartPulse aria-hidden="true" /> Explore symptoms
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section aria-labelledby="how-title" className="border-y bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary" aria-hidden="true">
                    <s.icon className="size-5" />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="features-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Built around safety, not guesswork</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Feature icon={<FileSearch />} title="Evidence for every field">
            Each extracted detail shows the exact words it came from, side by side with your original document.
          </Feature>
          <Feature icon={<ShieldCheck />} title="Ambiguity is blocked">
            “As needed”, “as directed”, missing or contradictory directions never become an automatic schedule. We point you to your pharmacist instead.
          </Feature>
          <Feature icon={<BookOpenCheck />} title="Sourced health information">
            Symptom information comes from referenced NHS pages, with urgent warning signs checked by fixed rules first.
          </Feature>
        </div>
      </section>

      <section aria-labelledby="limits-title" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-2 md:p-8">
          <div className="space-y-2">
            <h2 id="limits-title" className="text-xl font-semibold">What MediGuide is — and isn&apos;t</h2>
            <p className="text-sm text-muted-foreground">
              We think being clear about limits is part of being trustworthy. MediGuide is a hackathon prototype and hasn&apos;t been clinically validated.
            </p>
            <p className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Lock className="size-4 text-primary" aria-hidden="true" /> Your documents are stored privately and can be deleted at any time.
            </p>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              [true, "Helps you read, check and remember written instructions"],
              [true, "Links to reputable health information"],
              [false, "Doesn't diagnose conditions"],
              [false, "Doesn't recommend medicines or doses"],
              [false, "Doesn't replace your pharmacist, doctor or emergency services"],
            ].map(([ok, text]) => (
              <li key={String(text)} className="flex items-start gap-2">
                {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary [&_svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** Static product illustration (decorative): a label on the left, verified fields on the right. */
function HeroIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 to-success/10 blur-2xl" />
      <div className="rotate-[-3deg] rounded-2xl border bg-card p-5 shadow-sm">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground">FICTIONAL SAMPLE</p>
        <p className="mt-1 font-mono text-sm font-semibold">CORVANEX 250 mg capsules</p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
          Take <mark className="rounded bg-warning-soft px-0.5 text-foreground">ONE capsule</mark> by mouth{" "}
          <mark className="rounded bg-warning-soft px-0.5 text-foreground">THREE times a day</mark> with food{" "}
          <mark className="rounded bg-warning-soft px-0.5 text-foreground">for 7 days</mark>.
        </p>
      </div>
      <div className="relative -mt-4 ml-8 space-y-2 rounded-2xl border bg-card p-4 shadow-lg">
        {[
          ["Amount per dose", "One capsule"],
          ["How often", "Three times a day"],
          ["How long", "For 7 days"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="flex items-center gap-1.5 font-medium">
              {v} <CheckCircle2 className="size-4 text-success" />
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <BellRing className="size-4" /> 21 reminders · 08:00, 14:00, 20:00
        </div>
      </div>
    </div>
  );
}
