import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">It may have been deleted, or it belongs to a different account.</p>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to MediGuide
      </Link>
    </main>
  );
}
