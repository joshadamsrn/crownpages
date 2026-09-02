import type { Metadata } from 'next';
import Image from 'next/image';
import { CrownPagesPublicShell } from '@/components/crownpages-public-shell';
import { getCurrentWhiteLabelTenant } from '@/lib/white-label-tenants';

export async function generateMetadata(): Promise<Metadata> {
    const tenant = await getCurrentWhiteLabelTenant();
    const description = `Read the Terms of Service for ${tenant.publicName}.`;

    return {
        title: `Terms of Service | ${tenant.publicName}`,
        description,
        openGraph: {
            title: `Terms of Service | ${tenant.publicName}`,
            description,
            type: 'website',
        },
    };
}

export default async function TermsOfServicePage() {
    const tenant = await getCurrentWhiteLabelTenant();
    const serviceName = tenant.publicName;

    const content = (
        <div className="crownpages-legal-page min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {tenant.logoUrl && (
                        <Image
                            src={tenant.logoUrl}
                            alt={`${serviceName} logo`}
                            width={240}
                            height={120}
                            className="mb-8 h-20 w-auto object-contain"
                        />
                    )}
                    <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>

                    <div className="text-sm text-gray-600 mb-8">
                        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-8 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                            <p>
                                By accessing and using {serviceName} (&quot;the Service&quot;), you accept and agree to be bound by the
                                terms and provision of this agreement. If you do not agree to abide by the above, please
                                do not use this service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                            <p className="mb-4">
                                {serviceName} is a platform that allows users to create and share digital business cards and
                                pages. Our services include:
                            </p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Digital business card creation and hosting</li>
                                <li>Business page creation and customization</li>
                                <li>Analytics and performance tracking</li>
                                <li>Mobile app integration</li>
                                <li>Sharing and distribution tools</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
                            <h3 className="text-lg font-semibold mb-3">3.1 Account Creation</h3>
                            <p className="mb-4">
                                To use certain features of the Service, you must register for an account. You agree to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li>Provide accurate, current, and complete information</li>
                                <li>Maintain and update your information</li>
                                <li>Keep your password secure and confidential</li>
                                <li>Notify us immediately of any unauthorized use</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3 mt-6">3.2 Account Responsibility</h3>
                            <p>
                                You are responsible for all activities that occur under your account. We reserve the right
                                to suspend or terminate accounts that violate these terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
                            <h3 className="text-lg font-semibold mb-3">4.1 Permitted Uses</h3>
                            <p className="mb-4">You may use the Service for lawful business and personal purposes.</p>

                            <h3 className="text-lg font-semibold mb-3">4.2 Prohibited Uses</h3>
                            <p className="mb-4">You agree not to use the Service to:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Upload, post, or transmit any unlawful, harmful, or offensive content</li>
                                <li>Impersonate any person or entity</li>
                                <li>Spam, harass, or abuse other users</li>
                                <li>Distribute viruses, malware, or other harmful code</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Use the Service for any illegal or unauthorized purpose</li>
                                <li>Violate any applicable laws or regulations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Content and Intellectual Property</h2>
                            <h3 className="text-lg font-semibold mb-3">5.1 Your Content</h3>
                            <p className="mb-4">
                                You retain ownership of any content you submit to the Service (&quot;User Content&quot;). By
                                submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license
                                to use, copy, modify, and display your content solely for the purpose of providing the Service.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">5.2 Our Content</h3>
                            <p className="mb-4">
                                The Service and its original content, features, and functionality are and will remain
                                the exclusive property of {serviceName} and its licensors. The Service is protected by
                                copyright, trademark, and other laws.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">5.3 DMCA Policy</h3>
                            <p>
                                We respond to notices of alleged copyright infringement in accordance with the Digital
                                Millennium Copyright Act (DMCA). If you believe your copyrighted work has been infringed,
                                please contact us with a detailed notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Privacy</h2>
                            <p>
                                Your privacy is important to us. Please review our Privacy Policy, which also governs
                                your use of the Service, to understand our practices regarding the collection and use
                                of your information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. SMS Messaging Consent</h2>
                            <p className="mb-4">
                                {serviceName} may facilitate SMS messages on behalf of businesses using our platform when a
                                consumer submits a Connect or Visit request form and explicitly agrees to receive text
                                messages at the phone number provided.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">7.1 Consent to Receive Messages</h3>
                            <p className="mb-4">
                                By checking the separate SMS consent box on a {serviceName} form, you agree to receive
                                customer care SMS messages related to your request, including confirmations and
                                scheduling updates. Consent is not a condition of purchase or use of the service, and
                                consumers may submit their request without opting in to SMS.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">7.2 Message Frequency and Charges</h3>
                            <p className="mb-4">
                                Message frequency varies based on your interaction with the business you contacted.
                                Message and data rates may apply according to your mobile carrier plan.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">7.3 Opt-Out Instructions</h3>
                            <p className="mb-4">
                                You may opt out of SMS messages at any time by replying STOP to any message you receive.
                                After you opt out, you will no longer receive SMS messages for that request unless you
                                opt back in.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">7.4 Help Instructions</h3>
                            <p className="mb-4">
                                For help, reply HELP to any message you receive or contact us at {tenant.supportEmail}.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">7.5 Carrier Disclaimer</h3>
                            <p>
                                Carriers are not liable for delayed or undelivered messages.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Payments and Subscriptions</h2>
                            <h3 className="text-lg font-semibold mb-3">8.1 Paid Services</h3>
                            <p className="mb-4">
                                Some features of the Service may require payment. By purchasing a paid service, you agree to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li>Pay all applicable fees and taxes</li>
                                <li>Provide accurate billing information</li>
                                <li>Authorize recurring charges for subscription services</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">8.2 Refunds</h3>
                            <p>
                                Refunds may be available for certain circumstances as outlined in our refund policy.
                                Contact our support team for assistance with refund requests.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Service Availability</h2>
                            <p>
                                We strive to maintain high availability but do not guarantee uninterrupted access to the
                                Service. We may modify, suspend, or discontinue any part of the Service at any time with
                                or without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Disclaimers</h2>
                            <p className="mb-4">
                                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.
                                WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
                            </p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Warranties of merchantability and fitness for a particular purpose</li>
                                <li>Warranties regarding the accuracy, reliability, or completeness of content</li>
                                <li>Warranties that the Service will be error-free or uninterrupted</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Limitation of Liability</h2>
                            <p>
                                TO THE MAXIMUM EXTENT PERMITTED BY LAW, CROWNPAGES SHALL NOT BE LIABLE FOR ANY INDIRECT,
                                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
                                LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
                            <p>
                                You agree to defend, indemnify, and hold harmless {serviceName} and its affiliates from
                                any claims, damages, costs, and expenses (including attorneys&apos; fees) arising from your
                                use of the Service or violation of these Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Termination</h2>
                            <p className="mb-4">
                                We may terminate or suspend your account and access to the Service immediately, without
                                prior notice, for any reason, including if you breach these Terms.
                            </p>
                            <p>
                                Upon termination, your right to use the Service will cease immediately. Provisions that
                                should survive termination will remain in effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
                            <p>
                                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
                                without regard to its conflict of law provisions. Any disputes shall be resolved in the
                                courts of [Your Jurisdiction].
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Changes to Terms</h2>
                            <p>
                                We reserve the right to modify these Terms at any time. We will notify users of material
                                changes by posting the updated Terms on our website. Your continued use of the Service
                                after changes become effective constitutes acceptance of the new Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Severability</h2>
                            <p>
                                If any provision of these Terms is found to be unenforceable, the remaining provisions
                                will remain in full force and effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Contact Information</h2>
                            <p className="mb-4">
                                If you have any questions about these Terms of Service, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p><strong>Support:</strong> {tenant.supportEmail}</p>
                            </div>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <p className="text-sm text-gray-600 text-center">
                            By using {serviceName}, you acknowledge that you have read and understood these Terms of Service.
                        </p>
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
