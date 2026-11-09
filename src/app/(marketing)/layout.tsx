import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { MedicalDisclaimer } from "@/components/shared/notice";
import { buttonVariants } from "@/components/ui/button";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />
          <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
            <Link href="/prevention" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">
              Prevention tips
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign in
            </Link>
            <Link href="/login" className={buttonVariants()}>
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="bg-secondary">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>MediGuide, built for LaunchPad Hacks 2026</span>
            <Link href="/prevention" className="hover:text-foreground">Prevention tips</Link>
          </div>
          <MedicalDisclaimer />
        </div>
      </footer>
    </div>
  );
}
