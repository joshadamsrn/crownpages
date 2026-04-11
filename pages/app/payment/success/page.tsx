"use client"
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const licenseCode = searchParams.get('license_code');
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleSuccess = async () => {
      // Verify user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // If we have a license code, verify it exists in the database
      if (licenseCode) {
        console.log('Verifying license code:', licenseCode);

        // Add retry logic with exponential backoff for webhook processing time
        let attempts = 0;
        const maxAttempts = 10; // Try for up to ~30 seconds

        while (attempts < maxAttempts) {
          try {
            const { data: license, error } = await supabase
              .from('license')
              .select('id, code, purchased_by')
              .eq('code', licenseCode)
              .eq('purchased_by', user.id)
              .single();

            if (license) {
              console.log('License verified successfully:', license);
              setVerificationStatus('success');
              // Small delay to show success state, then redirect
              setTimeout(() => {
                router.replace(`/protected/licenses?success=true&license_code=${licenseCode}`);
              }, 1500);
              return;
            } else if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
              console.error('Database error while verifying license:', error);
              throw error;
            }

            // License not found yet, wait and retry
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`License not found yet, retrying in ${Math.min(1000 * Math.pow(1.5, attempts), 5000)}ms (attempt ${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(1.5, attempts), 5000)));
            }
          } catch (error) {
            console.error('Error verifying license:', error);
            setVerificationStatus('error');
            setErrorMessage('Failed to verify your license. Please contact support with your license code: ' + licenseCode);
            return;
          }
        }

        // If we get here, we exhausted all attempts
        console.error('License verification failed after all attempts');
        setVerificationStatus('error');
        setErrorMessage(`We're still processing your payment. Please wait a few minutes and check your licenses page, or contact support with license code: ${licenseCode}`);
      } else {
        // No license code, redirect immediately
        router.replace('/protected/licenses?success=true');
      }
    };

    handleSuccess();
  }, [licenseCode, router]);

  if (verificationStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold">Payment Processing</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/protected/licenses')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors w-full"
            >
              Go to Licenses Dashboard
            </button>
            <button
              onClick={() => window.location.href = 'mailto:support@yoursite.com?subject=License Issue&body=' + encodeURIComponent(`License Code: ${licenseCode}\nIssue: Payment successful but license not created`)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors w-full"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-6xl mb-4">
          {verificationStatus === 'success' ? '🎉' : '⏳'}
        </div>
        <h1 className="text-2xl font-bold">
          {verificationStatus === 'success' ? 'Payment Successful!' : 'Verifying Payment...'}
        </h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-sm text-muted-foreground">
          {verificationStatus === 'success'
            ? 'Redirecting to your management dashboard...'
            : 'Please wait while we confirm your license creation...'}
        </p>

        {/* Fallback button in case automatic redirect fails */}
        {verificationStatus === 'success' && (
          <div className="mt-8">
            <button
              onClick={() => {
                if (licenseCode) {
                  router.replace(`/protected/licenses?success=true&license_code=${licenseCode}`);
                } else {
                  router.replace('/protected/licenses?success=true');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Go to Management Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold">Processing your purchase...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
} 