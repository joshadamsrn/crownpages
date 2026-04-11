"use client";

import { useState } from "react";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Copy, Check, Users, Key } from "lucide-react";
import toast from "react-hot-toast";

interface LicenseSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    licenseCode: string;
}

export function LicenseSuccessModal({ isOpen, onClose, licenseCode }: LicenseSuccessModalProps) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(licenseCode);
            setCopied(true);
            toast.success("License code copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy to clipboard");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🎉 Payment Successful!"
            maxWidth="max-w-lg"
        >
            <div className="space-y-6">
                {/* Success Message */}
                <div className="text-center">
                    <div className="text-6xl mb-2">🎉</div>
                    <p className="text-lg font-medium text-green-700 dark:text-green-400">
                        Your license has been created successfully!
                    </p>
                </div>

                {/* License Code Display */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Key className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800 dark:text-green-300">License Code</span>
                    </div>
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border rounded-md px-3 py-2">
                        <code className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
                            {licenseCode}
                        </code>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyToClipboard}
                            className="ml-2"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-600" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800 dark:text-blue-300">How Team Members Join</span>
                    </div>
                    <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>Share this license code with your team members. They can join by:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Going to <strong>&quot;Manage Plan&quot;</strong> in the app sidebar</li>
                            <li>Clicking <strong>&quot;I have a key&quot;</strong></li>
                            <li>Entering the license code: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{licenseCode}</code></li>
                        </ol>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button onClick={onClose} className="flex-1">
                        Got it!
                    </Button>
                    <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        Copy Code
                    </Button>
                </div>
            </div>
        </Modal>
    );
} 