import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileText,
  Link2,
  QrCode,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import type { WhiteLabelTenant } from "@/lib/white-label-tenants";

interface TenantHomeProps {
  tenant: WhiteLabelTenant;
}

const workflowItems = [
  {
    title: "Create Pages",
    description:
      "Build Pages for your admissions team, for guest tours, create family resources, don't miss referrals, and improve team collaboration.",
    icon: FileText,
  },
  {
    title: "Send direct links and QR codes",
    description:
      "Give each audience the exact page they need. No more stale, generic information.",
    icon: QrCode,
  },
  {
    title: "Review engagement and follow-up",
    description:
      "See which pages are viewed, which actions people take, and where your team should focus follow-up.",
    icon: BarChart3,
  },
];

const audienceItems = [
  {
    title: "Staff workspace",
    description:
      "Authorized team members create, update, publish, and manage the resources used across the organization.",
    icon: UsersRound,
  },
  {
    title: "Direct page delivery",
    description:
      "Families, residents, partners, and prospects open specific shared pages rather than a generic homepage.",
    icon: Link2,
  },
  {
    title: "Branded presentation",
    description:
      "Published your content and your brand, the way you want it.",
    icon: ShieldCheck,
  },
];

export function TenantHome({ tenant }: TenantHomeProps) {
  return (
    <main className="tenant-home min-h-screen">
      <nav className="tenant-nav tenant-border-bronze border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {tenant.logoUrl ? (
              <Image
                src={tenant.logoUrl}
                alt={`${tenant.publicName} logo`}
                width={72}
                height={72}
                className="h-12 w-12 object-contain"
                priority
              />
            ) : (
              <Building2 className="tenant-bronze h-8 w-8" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {tenant.shortName}
              </span>
              <span className="tenant-silver block truncate text-xs">
                Hub
              </span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="tenant-nav-sign-in inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition-colors"
                >
                  Staff sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="tenant-primary-button hidden h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors sm:inline-flex"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="tenant-hero">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="space-y-8">
            <div className="tenant-pill tenant-border-bronze tenant-bronze-soft inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
              Private Workspace
            </div>
            <div className="space-y-5">
              <h1
                className="max-w-4xl font-bold leading-tight"
                style={{
                  fontSize: "clamp(2.5rem, 5vw, 4.75rem)",
                  whiteSpace: "nowrap",
                }}
              >
                {tenant.shortName} Hub
              </h1>
              <p className="tenant-hero-copy max-w-3xl text-lg leading-8 md:text-xl">
                A professional workspace for staff to create, manage, and share
                resource pages for {tenant.shortName}. Customers can receive
                direct links to the pages they need.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/protected/pages"
                className="tenant-primary-button inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors"
              >
                Open Builder
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="tenant-secondary-button inline-flex h-12 items-center justify-center rounded-md border px-5 text-sm font-semibold transition-colors"
              >
                Staff Sign In
              </Link>
            </div>
            <div className="grid max-w-2xl grid-cols-3 gap-3 pt-2">
              {["Build", "Share", "Measure"].map((label) => (
                <div
                  key={label}
                  className="tenant-soft-panel border-l border-[var(--tenant-bronze)] px-4 py-3"
                >
                  <p className="tenant-hero-stat-title text-sm font-semibold">{label}</p>
                  <p className="tenant-silver mt-1 text-xs">
                    Pages
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-md">
              <div className="flex aspect-square items-center justify-center">
                {tenant.logoUrl ? (
                  <Image
                    src={tenant.logoUrl}
                    alt={`${tenant.publicName} logo`}
                    width={560}
                    height={560}
                    className="h-full w-full object-contain"
                    priority
                  />
                ) : (
                  <Building2 className="tenant-bronze h-20 w-20" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tenant-surface tenant-border tenant-section-accent border-y py-16">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="tenant-bronze text-sm font-semibold uppercase tracking-[0.18em]">
                Team Hub
              </p>
              <h2 className="tenant-text mt-3 text-3xl font-bold leading-tight md:text-4xl">
                Controlled resource publishing hub.
              </h2>
              <p className="tenant-muted mt-4 text-base leading-7">
                Build with your team and the publish pages your staff can share
                by link, QR code, text message, or email.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {audienceItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="tenant-feature-card tenant-border border p-5"
                  >
                    <div className="tenant-icon-box flex h-10 w-10 items-center justify-center rounded-md">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="tenant-text mt-4 text-lg font-semibold">
                      {item.title}
                    </h3>
                    <p className="tenant-subtle mt-2 text-sm leading-6">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="tenant-workflow-section py-16">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6">
          <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="tenant-bronze text-sm font-semibold uppercase tracking-[0.18em]">
                Publishing workflow
              </p>
              <h2 className="tenant-text mt-3 text-3xl font-bold">
                Internal resource to public page
              </h2>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {workflowItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="tenant-card-shadow tenant-workflow-card tenant-border border p-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="tenant-icon-box tenant-icon-box-large flex h-12 w-12 items-center justify-center rounded-md">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="tenant-text mt-5 text-xl font-semibold">
                    {item.title}
                  </h3>
                  <p className="tenant-subtle mt-3 text-sm leading-6">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6">
        <div className="tenant-cta-shadow tenant-dark-panel tenant-border-bronze grid gap-8 border p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="tenant-bronze-soft mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                Workspace access
              </span>
            </div>
            <h2 className="text-2xl font-bold md:text-3xl">
              Ready to manage {tenant.shortName} pages?
            </h2>
            <p className="tenant-silver mt-3 max-w-2xl text-sm leading-6">
              Sign in to update published resources, review leads, and keep
              shared content current across the organization.
            </p>
          </div>
          <Link
            href="/auth/login"
            className="tenant-primary-button inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors"
          >
            Staff Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="tenant-surface tenant-border border-t">
        <div className="tenant-subtle mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="tenant-text font-medium">{tenant.publicName}</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy-policy" className="tenant-footer-link">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="tenant-footer-link">
              Terms of Service
            </Link>
            <Link href="/sms-consent" className="tenant-footer-link">
              SMS Consent
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
