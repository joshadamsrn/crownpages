import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Account Deleted | CrownPages',
    description: 'Your CrownPages account has been successfully deleted.',
    openGraph: {
        title: 'Account Deleted | CrownPages',
        description: 'Your CrownPages account has been successfully deleted.',
        type: 'website',
    },
};

export default function AccountDeletedPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="mb-8">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Account Successfully Deleted</h1>
                        <p className="text-lg text-gray-600">
                            Your CrownPages account and all associated data have been permanently removed.
                        </p>
                    </div>

                    <div className="space-y-6 text-left">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="text-blue-900 font-semibold mb-2">What happens next?</h3>
                            <ul className="text-blue-800 text-sm space-y-1">
                                <li>• All your personal data has been immediately deleted</li>
                                <li>• Your business pages and content are no longer accessible</li>
                                <li>• Other users can no longer access your shared content</li>
                                <li>• Your email address is now available for new registrations</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="text-yellow-900 font-semibold mb-2">Backup data retention</h3>
                            <p className="text-yellow-800 text-sm">
                                Some backup data may remain in our systems for up to 30 days for security and
                                legal compliance purposes. This data is inaccessible and will be automatically
                                purged after this period.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h3 className="text-gray-900 font-semibold mb-2">Want to come back?</h3>
                            <p className="text-gray-700 text-sm mb-3">
                                You&apos;re always welcome to create a new CrownPages account. However, your previous
                                data cannot be recovered.
                            </p>
                            <Link
                                href="/auth/sign-up"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
                            >
                                Create New Account
                            </Link>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h3 className="text-gray-900 font-semibold mb-2">Need assistance?</h3>
                            <p className="text-gray-700 text-sm mb-2">
                                If you have any questions or concerns about the account deletion process:
                            </p>
                            <p className="text-gray-800 text-sm">
                                <strong>Email:</strong> support@crownpages.com
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Thank you for using CrownPages. We hope to see you again in the future.
                        </p>
                        <div className="mt-4">
                            <Link
                                href="/"
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Return to Homepage
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 