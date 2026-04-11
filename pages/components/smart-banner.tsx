"use client";

import { useState, useEffect } from 'react';
import { X, Smartphone, ExternalLink } from 'lucide-react';
import {
    detectPlatform,
    openInApp,
    testAppInstallation,
    shouldShowAppPrompts,
    type PlatformInfo
} from '@/lib/platform-utils';

// Extend the Window interface to include gtag
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

interface SmartBannerProps {
    /** Current page path for deep linking */
    currentPath: string;
    /** Whether to show the banner (can be controlled externally) */
    show?: boolean;
    /** Callback when banner is dismissed */
    onDismiss?: () => void;
    /** Custom app name override */
    appName?: string;
}

export function SmartBanner({
    currentPath,
    show = true,
    onDismiss,
    appName = "Crown Pages"
}: SmartBannerProps) {
    const [platform, setPlatform] = useState<PlatformInfo | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isTestingInstallation, setIsTestingInstallation] = useState(false);

    useEffect(() => {
        // Only run on client side
        if (typeof window !== 'undefined') {
            const detectedPlatform = detectPlatform();
            setPlatform(detectedPlatform);

            // Check if user has previously dismissed
            const dismissedKey = `crownpages-banner-dismissed-${detectedPlatform.isIOS ? 'ios' : 'android'}`;
            const wasDismissed = localStorage.getItem(dismissedKey) === 'true';
            setIsDismissed(wasDismissed);

            // Test app installation if we haven't tested before and should show prompts
            const shouldShow = shouldShowAppPrompts();
            if (shouldShow && !detectedPlatform.hasTestedInstallation && !detectedPlatform.isInApp) {
                setIsTestingInstallation(true);
                testAppInstallation().then((isInstalled) => {
                    setIsTestingInstallation(false);
                    // Update platform info with test results
                    const updatedPlatform = detectPlatform();
                    setPlatform(updatedPlatform);

                    // Show banner only if app is installed and not dismissed
                    setIsVisible(show && isInstalled && !wasDismissed);
                });
            } else {
                // Show banner if we already know the app is installed and not dismissed
                setIsVisible(show && detectedPlatform.isAppInstalled && !wasDismissed && shouldShow);
            }
        }
    }, [show]);

    const handleOpenInApp = () => {
        if (platform) {
            openInApp(currentPath, false); // Don't fallback to store since we know app is installed
            // Track the interaction
            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'smart_banner_open_app', {
                    event_category: 'Deep Link',
                    event_label: currentPath,
                    platform: platform.isIOS ? 'ios' : 'android',
                    app_installed: true
                });
            }
        }
    };

    const handleContinueInBrowser = () => {
        setIsVisible(false);
        if (onDismiss) {
            onDismiss();
        }
        // Track the interaction
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'smart_banner_continue_browser', {
                event_category: 'Deep Link',
                event_label: currentPath,
                platform: platform?.isIOS ? 'ios' : 'android',
                app_installed: true
            });
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);

        // Remember dismissal in localStorage
        if (platform && typeof window !== 'undefined') {
            const dismissedKey = `crownpages-banner-dismissed-${platform.isIOS ? 'ios' : 'android'}`;
            localStorage.setItem(dismissedKey, 'true');
        }

        if (onDismiss) {
            onDismiss();
        }

        // Track the dismissal
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'smart_banner_dismissed', {
                event_category: 'Deep Link',
                event_label: currentPath,
                platform: platform?.isIOS ? 'ios' : 'android',
                app_installed: true
            });
        }
    };

    // Don't render on server side, if testing installation, or if not visible
    if (!platform || isTestingInstallation || !isVisible) {
        return null;
    }

    const storeName = platform.isIOS ? 'App Store' : 'Google Play';
    const deviceType = platform.isIOS ? 'iPhone/iPad' : 'Android';

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white relative">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                            aria-label="Dismiss banner"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{appName}</h3>
                                <p className="text-sm opacity-90">App detected on {deviceType}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-6">
                        <h4 className="font-semibold text-gray-900 mb-2">
                            Open in {appName} app?
                        </h4>
                        <p className="text-gray-600 text-sm mb-6">
                            You have the {appName} app installed! Open this page in the app for the full experience with offline access and wallet features.
                        </p>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleOpenInApp}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                            >
                                <ExternalLink size={18} />
                                <span>Open in {appName}</span>
                            </button>

                            <button
                                onClick={handleContinueInBrowser}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                            >
                                Continue in Browser
                            </button>
                        </div>

                        {/* Note */}
                        <p className="text-xs text-gray-500 text-center mt-4">
                            This will open the page directly in your installed {appName} app.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

/**
 * A simpler, less intrusive banner that appears at the top
 */
export function SmartBannerMinimal({
    currentPath,
    show = true,
    onDismiss,
    appName = "Crown Pages"
}: SmartBannerProps) {
    const [platform, setPlatform] = useState<PlatformInfo | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isTestingInstallation, setIsTestingInstallation] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const detectedPlatform = detectPlatform();
            setPlatform(detectedPlatform);

            // Test app installation if needed
            const shouldShow = shouldShowAppPrompts();
            if (shouldShow && !detectedPlatform.hasTestedInstallation && !detectedPlatform.isInApp) {
                setIsTestingInstallation(true);
                testAppInstallation().then((isInstalled) => {
                    setIsTestingInstallation(false);
                    const updatedPlatform = detectPlatform();
                    setPlatform(updatedPlatform);
                    setIsVisible(show && isInstalled && shouldShow);
                });
            } else {
                setIsVisible(show && detectedPlatform.isAppInstalled && shouldShow);
            }
        }
    }, [show]);

    const handleOpenInApp = () => {
        if (platform) {
            openInApp(currentPath, false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        if (onDismiss) {
            onDismiss();
        }
    };

    if (!platform || isTestingInstallation || !isVisible) {
        return null;
    }

    return (
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
                <Smartphone size={18} />
                <span>
                    <strong>{appName}</strong> app detected! Open for the best experience.
                </span>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={handleOpenInApp}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-xs font-medium transition-colors"
                >
                    Open
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                    aria-label="Dismiss"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
} 