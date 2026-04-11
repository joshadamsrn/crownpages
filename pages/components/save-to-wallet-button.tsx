"use client";

import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Plus, X, Heart } from 'lucide-react';
import {
    detectPlatform,
    saveToWallet,
    testAppInstallation,
    shouldShowAppPrompts,
    type PlatformInfo
} from '@/lib/platform-utils';

interface SaveToWalletButtonProps {
    /** Page ID for the current page */
    pageId: string;
    /** Business slug for deep linking */
    businessSlug: string;
    /** Optional page slug for deep linking */
    pageSlug?: string;
    /** Page title for display */
    pageTitle?: string;
    /** Business name for display */
    businessName?: string;
    /** Custom styling className */
    className?: string;
    /** Whether this is a business page (vs individual page) */
    isBusinessPage?: boolean;
}

export function SaveToWalletButton({
    pageId,
    businessSlug,
    pageSlug,
    pageTitle,
    businessName,
    className = '',
    isBusinessPage = false
}: SaveToWalletButtonProps) {
    const [platform, setPlatform] = useState<PlatformInfo | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingInstallation, setIsTestingInstallation] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const detectedPlatform = detectPlatform();
            setPlatform(detectedPlatform);

            // Test app installation if we haven't tested before and should show prompts
            const shouldShow = shouldShowAppPrompts();
            if (shouldShow && !detectedPlatform.hasTestedInstallation && !detectedPlatform.isInApp) {
                setIsTestingInstallation(true);
                testAppInstallation().then((isInstalled) => {
                    setIsTestingInstallation(false);
                    // Update platform info with test results
                    const updatedPlatform = detectPlatform();
                    setPlatform(updatedPlatform);

                    // Show button only if app is installed
                    setIsVisible(isInstalled);
                });
            } else {
                // Show button if we already know the app is installed
                setIsVisible(detectedPlatform.isAppInstalled && shouldShow);
            }
        }
    }, []);

    const handleSaveToWallet = async () => {
        if (!platform || isSaving || !platform.isAppInstalled) return;

        setIsSaving(true);

        try {
            // Track the save attempt
            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'save_to_wallet_attempt', {
                    event_category: 'Wallet',
                    event_label: pageId,
                    page_type: isBusinessPage ? 'business' : 'page',
                    business_slug: businessSlug,
                    page_slug: pageSlug || '',
                    app_installed: true,
                });
            }

            // Attempt to save to wallet via deep link
            saveToWallet(pageId, businessSlug, pageSlug);

            // Show success state briefly
            setTimeout(() => {
                setIsSaving(false);
            }, 2000);

        } catch (error) {
            console.error('Error saving to wallet:', error);
            setIsSaving(false);
        }
    };

    const handleMouseEnter = () => {
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    // Don't render if testing installation, not on a compatible platform, or app not installed
    if (!platform || isTestingInstallation || !isVisible) {
        return null;
    }

    const buttonContent = isSaving ? (
        <>
            <BookmarkCheck size={20} className="text-green-500" />
            <span className="text-sm font-medium text-green-600">Saving...</span>
        </>
    ) : (
        <>
            <Bookmark size={20} />
            <Plus size={12} className="absolute -top-1 -right-1 bg-white rounded-full" />
        </>
    );

    const displayTitle = pageTitle || (isBusinessPage ? `${businessName} Business Page` : 'Page');

    return (
        <div className={`relative ${className}`}>
            {/* Main Save Button */}
            <button
                onClick={handleSaveToWallet}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                disabled={isSaving}
                className={`
          relative flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200
          ${isSaving
                        ? 'bg-green-50 border border-green-200 cursor-default'
                        : 'bg-white border border-gray-200 hover:bg-gray-50 hover:scale-105 active:scale-95'
                    }
          ${className}
        `}
                aria-label={`Save ${displayTitle} to Crown Pages wallet`}
            >
                {buttonContent}
            </button>

            {/* Tooltip */}
            {showTooltip && !isSaving && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-50">
                    <div className="font-medium mb-1">Save to Crown Pages</div>
                    <div className="opacity-90">
                        Add &quot;{displayTitle}&quot; to your wallet for quick access later
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    );
}

/**
 * A floating action button version for better mobile UX
 */
export function SaveToWalletFAB({
    pageId,
    businessSlug,
    pageSlug,
    pageTitle,
    businessName,
    isBusinessPage = false
}: SaveToWalletButtonProps) {
    const [platform, setPlatform] = useState<PlatformInfo | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isTestingInstallation, setIsTestingInstallation] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const detectedPlatform = detectPlatform();
            setPlatform(detectedPlatform);

            // Test app installation if we haven't tested before and should show prompts
            const shouldShow = shouldShowAppPrompts();
            if (shouldShow && !detectedPlatform.hasTestedInstallation && !detectedPlatform.isInApp) {
                setIsTestingInstallation(true);
                testAppInstallation().then((isInstalled) => {
                    setIsTestingInstallation(false);
                    // Update platform info with test results
                    const updatedPlatform = detectPlatform();
                    setPlatform(updatedPlatform);

                    // Show FAB only if app is installed
                    setIsVisible(isInstalled);
                });
            } else {
                // Show FAB if we already know the app is installed
                setIsVisible(detectedPlatform.isAppInstalled && shouldShow);
            }
        }
    }, []);

    const handleSaveToWallet = async () => {
        if (!platform || isSaving || !platform.isAppInstalled) return;

        setIsSaving(true);
        setIsExpanded(false);

        try {
            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'save_to_wallet_fab', {
                    event_category: 'Wallet',
                    event_label: pageId,
                    page_type: isBusinessPage ? 'business' : 'page',
                    app_installed: true,
                });
            }

            saveToWallet(pageId, businessSlug, pageSlug);

            setTimeout(() => {
                setIsSaving(false);
            }, 2000);

        } catch (error) {
            console.error('Error saving to wallet:', error);
            setIsSaving(false);
        }
    };

    if (!platform || isTestingInstallation || !isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* Expanded state */}
            {isExpanded && !isSaving && (
                <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-64 mb-2">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-semibold text-gray-900 text-sm">Save to Wallet</h4>
                            <p className="text-xs text-gray-600 mt-1">
                                Add this {isBusinessPage ? 'business page' : 'page'} to your Crown Pages wallet for quick access
                            </p>
                        </div>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <button
                        onClick={handleSaveToWallet}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                        Save to Wallet
                    </button>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={isSaving ? undefined : isExpanded ? handleSaveToWallet : () => setIsExpanded(true)}
                className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
          ${isSaving
                        ? 'bg-green-500 cursor-default'
                        : isExpanded
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-white hover:bg-gray-50 border border-gray-200 hover:scale-110'
                    }
        `}
                aria-label="Save to Crown Pages wallet"
            >
                {isSaving ? (
                    <BookmarkCheck size={24} className="text-white" />
                ) : isExpanded ? (
                    <Heart size={24} className="text-white" />
                ) : (
                    <div className="relative">
                        <Bookmark size={24} className="text-gray-700" />
                        <Plus size={12} className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full" />
                    </div>
                )}
            </button>
        </div>
    );
}

// Extend the Window interface to include gtag
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
} 