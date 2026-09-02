import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CrownPagesPublicShell } from '@/components/crownpages-public-shell';
import { getCurrentWhiteLabelTenant } from '@/lib/white-label-tenants';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentWhiteLabelTenant();
  const description = `Public proof of ${tenant.publicName} SMS consent collection for inquiry and visit request forms.`;

  return {
    title: `SMS Consent | ${tenant.publicName}`,
    description,
    openGraph: {
      title: `SMS Consent | ${tenant.publicName}`,
      description,
      type: 'website',
    },
  };
}

export default async function SmsConsentPage() {
  const tenant = await getCurrentWhiteLabelTenant();
  const serviceName = tenant.publicName;
  const baseUrl = `https://${tenant.domains[0]}`;
  const consentText =
    `I agree to receive SMS text messages from ${serviceName} about my inquiry and scheduling updates at the phone number provided. Consent is not a condition of purchase or use of the service. Message frequency varies. Message & data rates may apply. Reply STOP to opt out and HELP for help.`;

  const content = (
    <div className="crownpages-consent-page min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="max-w-3xl">
            {tenant.logoUrl && (
              <Image
                src={tenant.logoUrl}
                alt={`${serviceName} logo`}
                width={240}
                height={120}
                className="mb-8 h-20 w-auto object-contain"
              />
            )}
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4f91]">
              {serviceName}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">
              SMS Consent Proof
            </h1>
            <p className="mt-4 text-base leading-7 text-[#4b5563]">
              {serviceName} collects optional SMS consent through its inquiry and scheduling forms.
              Consumers may submit their request without agreeing to receive text messages. Consent
              is collected through a separate unchecked checkbox displayed directly on the form.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[28px] border border-[#dbe4f0] bg-[#fbfcfe] p-6">
              <div className="mx-auto max-w-md rounded-[30px] border border-[#d7dbe4] bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d4f91]">
                      {serviceName}
                    </div>
                    <h2 className="mt-1 text-2xl font-semibold text-[#111827]">
                      Preview Form
                    </h2>
                  </div>
                  <div className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-medium text-[#6b7280]">
                    Public Proof
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4">
                  <input
                    aria-label="First Name"
                    disabled
                    value="First Name"
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#9ca3af]"
                  />
                  <input
                    aria-label="Last Name"
                    disabled
                    value="Last Name"
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#9ca3af]"
                  />
                  <input
                    aria-label="Phone Number"
                    disabled
                    value="Phone Number"
                    readOnly
                    className="h-12 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#9ca3af]"
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-[#d7dbe4] bg-[#fbfcfe] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-md border border-[#9ca3af] bg-white" />
                    <div className="text-sm leading-7 text-[#374151]">
                      <p>{consentText}</p>
                      <p className="mt-3">
                        View our{' '}
                        <Link
                          href="/privacy-policy"
                          className="font-semibold text-[#1d4f91] underline underline-offset-2"
                        >
                          Privacy Policy
                        </Link>{' '}
                        and{' '}
                        <Link
                          href="/terms-of-service"
                          className="font-semibold text-[#1d4f91] underline underline-offset-2"
                        >
                          Terms & Conditions
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-5 h-12 w-full rounded-xl bg-[#1d4f91] text-base font-semibold text-white opacity-90"
                >
                  Submit Request
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-[#dbe4f0] bg-white p-6">
              <h2 className="text-2xl font-semibold text-[#111827]">Consent Details</h2>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-[#4b5563]">
                <li>
                  SMS consent is optional and is not required to use {serviceName}.
                </li>
                <li>
                  The checkbox is displayed unchecked by default.
                </li>
                <li>
                  Consent language is shown directly on the form, not only inside legal
                  documents.
                </li>
                <li>
                  {serviceName} uses this consent for customer care messages related to inquiries,
                  requested tours, and scheduling updates.
                </li>
                <li>
                  Consumers can opt out at any time by replying <span className="font-semibold">STOP</span>{' '}
                  and request assistance by replying <span className="font-semibold">HELP</span>.
                </li>
              </ul>

              <div className="mt-8 rounded-2xl bg-[#f8fbff] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1d4f91]">
                  Public URLs
                </p>
                <div className="mt-3 space-y-2 text-sm text-[#111827]">
                  <p>
                    Proof of consent:{' '}
                    <span className="font-medium">{baseUrl}/sms-consent</span>
                  </p>
                  <p>
                    Privacy Policy:{' '}
                    <span className="font-medium">{baseUrl}/privacy-policy</span>
                  </p>
                  <p>
                    Terms & Conditions:{' '}
                    <span className="font-medium">{baseUrl}/terms-of-service</span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  if (tenant.id !== 'crownpages') {
    return content;
  }

  return (
    <CrownPagesPublicShell>
      {content}
    </CrownPagesPublicShell>
  );
}
