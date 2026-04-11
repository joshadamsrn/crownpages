import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | CrownPages',
    description: 'Learn how CrownPages collects, uses, and protects your personal information.',
    openGraph: {
        title: 'Privacy Policy | CrownPages',
        description: 'Learn how CrownPages collects, uses, and protects your personal information.',
        type: 'website',
    },
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

                    <div className="text-sm text-gray-600 mb-8">
                        <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="space-y-8 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                            <p>
                                Welcome to CrownPages (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). This Privacy Policy explains how we collect,
                                use, disclose, and safeguard your information when you visit our website and use our services.
                                CrownPages is a platform that enables businesses and individuals to create and share digital
                                business cards and pages.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

                            <h3 className="text-lg font-semibold mb-3">2.1 Personal Information</h3>
                            <p className="mb-4">We may collect personal information that you voluntarily provide to us when:</p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li>Creating an account</li>
                                <li>Building your business page or digital card</li>
                                <li>Contacting us for support</li>
                                <li>Subscribing to our newsletter</li>
                            </ul>
                            <p>This information may include:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Name and contact information (email, phone number)</li>
                                <li>Business information (business name, description, address)</li>
                                <li>Profile photos and business logos</li>
                                <li>Social media links and website URLs</li>
                                <li>Payment information (processed securely through third-party providers)</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3 mt-6">2.2 Automatically Collected Information</h3>
                            <p>When you visit our website or use our services, we automatically collect:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Device information (browser type, operating system)</li>
                                <li>Usage data (pages visited, time spent, features used)</li>
                                <li>IP address and general location information</li>
                                <li>Cookies and similar tracking technologies</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3 mt-6">2.3 Analytics and Performance Data</h3>
                            <p>We collect analytics data to improve our services, including:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Page views and user interactions</li>
                                <li>Click-through rates on buttons and links</li>
                                <li>Time spent on pages</li>
                                <li>Error logs and performance metrics</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                            <p className="mb-4">We use the information we collect to:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Provide, operate, and maintain our services</li>
                                <li>Create and manage your digital business cards and pages</li>
                                <li>Process transactions and send transaction-related emails</li>
                                <li>Respond to your comments, questions, and requests</li>
                                <li>Send you technical notices, updates, and support messages</li>
                                <li>Improve our website and services</li>
                                <li>Monitor usage and detect technical issues</li>
                                <li>Prevent fraud and ensure security</li>
                                <li>Comply with legal obligations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. How We Share Your Information</h2>
                            <p className="mb-4">We may share your information in the following situations:</p>

                            <h3 className="text-lg font-semibold mb-3">4.1 Public Information</h3>
                            <p className="mb-4">
                                Information you choose to include on your public business pages (such as business name,
                                contact information, photos, and links) will be visible to anyone who visits your page.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">4.2 Service Providers</h3>
                            <p className="mb-4">We may share your information with third-party service providers who:</p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li>Help us operate our platform (hosting, databases, analytics)</li>
                                <li>Process payments</li>
                                <li>Provide customer support</li>
                                <li>Send emails on our behalf</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">4.3 Legal Requirements</h3>
                            <p>We may disclose your information when required by law or to:</p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Comply with legal processes</li>
                                <li>Protect our rights and property</li>
                                <li>Prevent fraud or security issues</li>
                                <li>Protect the safety of our users</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
                            <p className="mb-4">
                                We implement appropriate technical and organizational security measures to protect your
                                personal information against unauthorized access, alteration, disclosure, or destruction.
                                These measures include:
                            </p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Encryption of data in transit and at rest</li>
                                <li>Regular security assessments and updates</li>
                                <li>Access controls and authentication</li>
                                <li>Secure data centers and infrastructure</li>
                                <li>Employee training on data protection</li>
                            </ul>
                            <p className="mt-4">
                                However, no method of transmission over the internet or electronic storage is 100% secure.
                                While we strive to protect your personal information, we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
                            <p>
                                We retain your personal information for as long as necessary to provide our services and
                                fulfill the purposes outlined in this Privacy Policy. We may also retain information to
                                comply with legal obligations, resolve disputes, and enforce our agreements. When we no
                                longer need your information, we will securely delete or anonymize it.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
                            <p className="mb-4">Depending on your location, you may have the following rights:</p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li><strong>Access:</strong> Request access to your personal information</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                                <li><strong>Restriction:</strong> Request restriction of processing</li>
                            </ul>
                            <p>
                                To exercise these rights, please contact us using the information provided below.
                                We will respond to your request within a reasonable timeframe and in accordance with applicable law.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
                            <p className="mb-4">
                                We use cookies and similar tracking technologies to enhance your experience on our website.
                                Cookies are small data files stored on your device. We use:
                            </p>
                            <ul className="list-disc list-inside space-y-2 mb-4">
                                <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how you use our website</li>
                                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                            </ul>
                            <p>
                                You can control cookies through your browser settings. However, disabling certain cookies
                                may affect website functionality.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Links</h2>
                            <p>
                                Our services may contain links to third-party websites or services. We are not responsible
                                for the privacy practices or content of these third parties. We encourage you to review
                                the privacy policies of any third-party sites you visit.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children&apos;s Privacy</h2>
                            <p>
                                Our services are not intended for children under 13 years of age. We do not knowingly
                                collect personal information from children under 13. If we become aware that we have
                                collected personal information from a child under 13, we will take steps to delete
                                such information promptly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
                            <p>
                                Your information may be transferred to and processed in countries other than your country
                                of residence. We ensure that such transfers comply with applicable data protection laws
                                and that appropriate safeguards are in place to protect your information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
                            <p>
                                We may update this Privacy Policy from time to time. We will notify you of any material
                                changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot;
                                date. We encourage you to review this Privacy Policy periodically for any changes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
                            <p className="mb-4">
                                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p><strong>Support:</strong> support@crownpages.com</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Specific Provisions for Different Jurisdictions</h2>

                            <h3 className="text-lg font-semibold mb-3">14.1 European Union (GDPR)</h3>
                            <p className="mb-4">
                                If you are located in the European Union, you have additional rights under the General
                                Data Protection Regulation (GDPR), including the right to lodge a complaint with a
                                supervisory authority.
                            </p>

                            <h3 className="text-lg font-semibold mb-3">14.2 California (CCPA)</h3>
                            <p>
                                If you are a California resident, you have additional rights under the California Consumer
                                Privacy Act (CCPA), including the right to request information about the sale of your
                                personal information and to opt-out of such sales.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <p className="text-sm text-gray-600 text-center">
                            By using CrownPages, you acknowledge that you have read and understood this Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 