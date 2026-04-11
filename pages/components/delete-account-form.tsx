"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DeleteAccountFormProps {
    userEmail: string;
}

export function DeleteAccountForm({ userEmail }: DeleteAccountFormProps) {
    const [confirmationText, setConfirmationText] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [confirmationChecked, setConfirmationChecked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'confirmation' | 'password' | 'processing'>('confirmation');

    const router = useRouter();
    const requiredText = "DELETE MY ACCOUNT";

    const handleInitialConfirmation = () => {
        if (confirmationText === requiredText && confirmationChecked) {
            setStep('password');
            setError(null);
        } else {
            setError("Please type the confirmation text exactly and check the confirmation box.");
        }
    };

    const handlePasswordConfirmation = async () => {
        if (!currentPassword) {
            setError("Please enter your current password to confirm deletion.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setStep('processing');

        try {
            const supabase = createClient();

            // First, verify the user's password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail,
                password: currentPassword,
            });

            if (signInError) {
                throw new Error("Incorrect password. Please try again.");
            }

            // Call the delete account API with additional security verification
            const response = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    confirmAction: 'DELETE_ACCOUNT'
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete account');
            }

            // Sign out the user
            await supabase.auth.signOut();

            // Redirect to confirmation page
            router.push('/auth/account-deleted');

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred while deleting your account");
            setStep('password');
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'processing') {
        return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-blue-800 font-medium">Processing account deletion...</span>
                </div>
                <p className="text-blue-700 text-sm mt-2 text-center">
                    This may take a few moments. Please do not close this page.
                </p>
            </div>
        );
    }

    if (step === 'password') {
        return (
            <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-semibold mb-2">Final confirmation required</h3>
                    <p className="text-red-700 text-sm">
                        Please enter your current password to confirm the deletion of your account.
                    </p>
                    <p className="text-red-600 text-xs mt-2">
                        Account: {userEmail}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div>
                    <Label htmlFor="current-password" className="text-sm font-medium text-gray-700">
                        Current Password
                    </Label>
                    <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="mt-1"
                        disabled={isLoading}
                    />
                </div>

                <div className="flex space-x-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep('confirmation')}
                        disabled={isLoading}
                    >
                        Go Back
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handlePasswordConfirmation}
                        disabled={isLoading || !currentPassword}
                    >
                        {isLoading ? "Deleting Account..." : "Delete My Account"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                    <strong>This action is permanent and cannot be undone.</strong> All your data will be deleted immediately.
                </p>
            </div>

            <div>
                <Label htmlFor="confirmation-text" className="text-sm font-medium text-gray-700">
                    Type <span className="font-bold text-red-600">{requiredText}</span> to confirm
                </Label>
                <Input
                    id="confirmation-text"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={requiredText}
                    className="mt-1"
                    disabled={isLoading}
                />
            </div>

            <div className="flex items-start space-x-3">
                <Checkbox
                    id="final-confirmation"
                    checked={confirmationChecked}
                    onCheckedChange={(checked) => setConfirmationChecked(checked as boolean)}
                    disabled={isLoading}
                />
                <Label htmlFor="final-confirmation" className="text-sm text-gray-700 leading-relaxed">
                    I understand that deleting my account will permanently remove all my data, including my business pages,
                    uploaded media, analytics, and saved content. This action cannot be undone.
                </Label>
            </div>

            <div>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={handleInitialConfirmation}
                    disabled={isLoading || confirmationText !== requiredText || !confirmationChecked}
                    className="w-full"
                >
                    Continue to Delete Account
                </Button>
            </div>

            <div className="text-center">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="text-gray-600 hover:text-gray-800"
                >
                    Cancel and Go Back
                </Button>
            </div>
        </div>
    );
} 