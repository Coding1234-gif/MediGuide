import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" className="fill-primary-foreground" opacity="0.95" />
      <circle cx="24" cy="24" r="4.5" className="fill-success stroke-card" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-lg font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-lg">MediGuide</span>
    </Link>
  );
}
