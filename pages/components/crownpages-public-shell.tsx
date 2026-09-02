import { AuthButton } from "@/components/auth-button";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function CrownPagesPublicShell({
  children,
  showAccountActions = true,
}: {
  children: ReactNode;
  showAccountActions?: boolean;
}) {
  return (
    <main className="crownpages-public-shell relative flex min-h-screen flex-col overflow-hidden bg-[#030303] text-white selection:bg-[#eda900] selection:text-black">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:56px_56px]" />

      <nav className="relative z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="shrink-0" aria-label="CrownPages home">
            <Image
              src="/lightlogo.png"
              alt="CrownPages"
              width={2205}
              height={372}
              className="h-auto w-[178px] object-contain sm:w-[210px]"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-zinc-300 lg:flex">
            <Link href="/#platform" className="transition-colors hover:text-[#eda900]">
              Platform
            </Link>
            <Link href="/#solutions" className="transition-colors hover:text-[#eda900]">
              Solutions
            </Link>
            <Link href="/#analytics" className="transition-colors hover:text-[#eda900]">
              Resources
            </Link>
            <Link href="/#company" className="transition-colors hover:text-[#eda900]">
              Company
            </Link>
          </div>

          {showAccountActions ? (
            <div className="[&>div]:gap-2 [&>div]:!text-white [&_a]:!h-10 [&_a]:!rounded-lg [&_a]:!px-4 [&_a]:!text-xs [&_a]:!font-black [&_a]:!uppercase [&_a]:!tracking-[0.08em] [&_a:first-child]:!border-[#eda900]/60 [&_a:first-child]:!bg-transparent [&_a:first-child]:!text-white [&_a:first-child:hover]:!border-[#eda900] [&_a:first-child:hover]:!bg-[#eda900] [&_a:first-child:hover]:!text-black [&_a:last-child]:!border-[#eda900] [&_a:last-child]:!bg-[#eda900] [&_a:last-child]:!text-black [&_a:last-child:hover]:!bg-[#ffc12b] [&_button]:!border-[#eda900]/60 [&_button]:!bg-transparent [&_button]:!text-white [&_button:hover]:!bg-[#eda900] [&_button:hover]:!text-black">
              <AuthButton signInLabel="Login" signUpLabel="Start free" />
            </div>
          ) : (
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#eda900]/60 px-4 text-xs font-black uppercase tracking-[0.08em] text-white transition-colors hover:border-[#eda900] hover:bg-[#eda900] hover:text-black"
            >
              Back home
            </Link>
          )}
        </div>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>

      <footer className="relative z-10 border-t border-white/10 bg-black/80">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-5 py-8 text-sm text-zinc-400 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p>© {new Date().getFullYear()} CrownPages. Pages made modern.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/privacy-policy" className="transition-colors hover:text-[#eda900]">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-[#eda900]">
              Terms
            </Link>
            <Link href="/sms-consent" className="transition-colors hover:text-[#eda900]">
              SMS Consent
            </Link>
            <a
              href="mailto:support@crownpages.com"
              className="transition-colors hover:text-[#eda900]"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
