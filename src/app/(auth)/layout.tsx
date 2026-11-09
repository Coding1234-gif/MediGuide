import { Logo } from "@/components/shared/logo";
import { MedicalDisclaimer } from "@/components/shared/notice";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-md space-y-6">
          {children}
          <MedicalDisclaimer className="text-center" />
        </div>
      </main>
    </div>
  );
}
