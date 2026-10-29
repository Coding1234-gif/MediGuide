"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        We couldn&apos;t load this page. Your data is safe. Please try again — if it keeps happening, come back a little later.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RefreshCw aria-hidden="true" /> Try again
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
    </main>
  );
}
