import { Metadata } from 'next';
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountForm } from "@/components/delete-account-form";

export const metadata: Metadata = {
    title: 'Delete Account | CrownPages',
    description: 'Request deletion of your CrownPages account and associated data.',
    openGraph: {
        title: 'Delete Account | CrownPages',
        description: 'Request deletion of your CrownPages account and associated data.',
        type: 'website',
    },
};

export default async function DeleteAccountPage() {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Delete Your CrownPages Account</h1>
                        <p className="text-lg text-gray-600">
                            We&apos;re sorry to see you go. Please review the information below before proceeding.
                        </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Warning: This action cannot be undone
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>
                                        Once you delete your account, all your data will be permanently removed from our servers.
                                        This action is irreversible.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What will be deleted</h2>
                            <p className="mb-4">
                                When you delete your CrownPages account, the following data will be permanently removed:
                            </p>
                            <ul className="list-disc list-inside space-y-2 bg-gray-50 p-4 rounded-lg">
                                <li><strong>Your profile information:</strong> Name, email, phone number, bio, and avatar</li>
                                <li><strong>Business accounts:</strong> All businesses you own, including business information and settings</li>
                                <li><strong>Digital pages:</strong> All pages and business cards you&apos;ve created</li>
                                <li><strong>Media files:</strong> All images, videos, and documents you&apos;ve uploaded</li>
                                <li><strong>Analytics data:</strong> All performance metrics and visitor analytics for your pages</li>
                                <li><strong>Saved pages:</strong> Your digital wallet with saved business cards from other users</li>
                                <li><strong>Share links:</strong> All custom sharing links you&apos;ve created</li>
                                <li><strong>Organization data:</strong> Any organizations you own (if applicable)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data retention policy</h2>
                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Immediate deletion</h3>
                                <p className="text-blue-800">
                                    Most of your personal data will be deleted immediately upon account deletion, including
                                    your profile, pages, and uploaded content.
                                </p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Temporary retention (30 days)</h3>
                                <p className="text-yellow-800 mb-2">
                                    Some data may be retained for up to 30 days for the following purposes:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                                    <li>Backup systems and disaster recovery</li>
                                    <li>Legal compliance and fraud prevention</li>
                                    <li>System security and integrity</li>
                                </ul>
                                <p className="text-yellow-800 mt-2">
                                    This data is inaccessible and will be automatically purged after 30 days.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Impact on other users</h2>
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <p className="text-orange-800">
                                    <strong>Important:</strong> If other users have saved your business cards to their digital wallets,
                                    those saved cards will become inaccessible after your account is deleted. We recommend
                                    notifying your contacts before deleting your account.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Before you delete your account</h2>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded" disabled />
                                    <span>Download any important data you want to keep</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded" disabled />
                                    <span>Inform your contacts about the account deletion</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded" disabled />
                                    <span>Cancel any active subscriptions</span>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <input type="checkbox" className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded" disabled />
                                    <span>Transfer ownership of businesses to other members (if applicable)</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Delete your account</h2>
                            <p className="mb-6 text-gray-600">
                                To proceed with deleting your CrownPages account, please confirm below. You must be signed in
                                to complete this action.
                            </p>

                            <DeleteAccountForm userEmail={data.user.email!} />
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need help?</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                If you&apos;re having issues with your account or have questions about deletion, please contact our support team:
                            </p>
                            <p className="text-sm text-gray-800">
                                <strong>Email:</strong> support@crownpages.com
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 