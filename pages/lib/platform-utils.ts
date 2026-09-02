/**
 * Platform detection utilities for Crown Pages deep linking
 */

export interface PlatformInfo {
    isIOS: boolean;
    isAndroid: boolean;
    isMobile: boolean;
    isDesktop: boolean;
    userAgent: string;
    canInstallApp: boolean;
    appStoreUrl?: string;
    // New properties for app installation detection
    isInApp: boolean;
    isAppInstalled: boolean;
    hasTestedInstallation: boolean;
}

// Cache for app installation status
let appInstallationCache: {
    isInstalled: boolean;
    lastChecked: number;
    hasBeenTested: boolean;
} | null = null;

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Detects the user's platform and capabilities
 */
export function detectPlatform(): PlatformInfo {
    // Default values for server-side rendering
    if (typeof window === 'undefined') {
        return {
            isIOS: false,
            isAndroid: false,
            isMobile: false,
            isDesktop: true,
            userAgent: '',
            canInstallApp: false,
            isInApp: false,
            isAppInstalled: false,
            hasTestedInstallation: false,
        };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
    const isDesktop = !isMobile;

    // Check if the user agent suggests the app is already installed/running
    const hasReactNativeWebView =
        typeof (window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView !== 'undefined';

    const isInApp = /crown.?pages/i.test(userAgent) ||
        /pagesmobile/i.test(userAgent) ||
        // Check for custom user agent set by your app
        /crownpages-app/i.test(userAgent) ||
        hasReactNativeWebView;

    // Get cached app installation status
    const cachedStatus = getCachedAppInstallationStatus();

    // If we're in the app, we know it's installed
    const isAppInstalled = isInApp || cachedStatus.isInstalled;

    return {
        isIOS,
        isAndroid,
        isMobile,
        isDesktop,
        userAgent: navigator.userAgent,
        canInstallApp: (isIOS || isAndroid) && !isInApp,
        appStoreUrl: isIOS
            ? 'https://apps.apple.com/app/crown-pages/id123456789' // Replace with actual App Store URL
            : isAndroid
                ? 'https://play.google.com/store/apps/details?id=com.phnteam.pagesmobile' // Replace with actual Play Store URL
                : undefined,
        isInApp,
        isAppInstalled,
        hasTestedInstallation: cachedStatus.hasBeenTested,
    };
}

/**
 * Gets cached app installation status from localStorage
 */
function getCachedAppInstallationStatus() {
    if (typeof window === 'undefined') {
        return { isInstalled: false, hasBeenTested: false };
    }

    try {
        const cached = localStorage.getItem('crownpages-app-status');
        if (cached) {
            const parsed = JSON.parse(cached);
            const now = Date.now();

            // Return cached result if not expired
            if (parsed.lastChecked && (now - parsed.lastChecked < CACHE_DURATION)) {
                return {
                    isInstalled: parsed.isInstalled || false,
                    hasBeenTested: parsed.hasBeenTested || false
                };
            }
        }
    } catch (error) {
        console.warn('Error reading app installation cache:', error);
    }

    return { isInstalled: false, hasBeenTested: false };
}

/**
 * Caches app installation status in localStorage
 */
function setCachedAppInstallationStatus(isInstalled: boolean, hasBeenTested: boolean = true) {
    if (typeof window === 'undefined') return;

    try {
        const status = {
            isInstalled,
            hasBeenTested,
            lastChecked: Date.now()
        };
        localStorage.setItem('crownpages-app-status', JSON.stringify(status));

        // Update in-memory cache
        appInstallationCache = status;
    } catch (error) {
        console.warn('Error caching app installation status:', error);
    }
}

/**
 * Tests if the Crown Pages app is actually installed by attempting to open it
 */
export function testAppInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
        const platform = detectPlatform();

        // If we're already in the app, it's definitely installed
        if (platform.isInApp) {
            setCachedAppInstallationStatus(true);
            resolve(true);
            return;
        }

        // If we're not on a mobile platform, app can't be installed
        if (!platform.isMobile) {
            setCachedAppInstallationStatus(false);
            resolve(false);
            return;
        }

        const startTime = Date.now();
        let hasResolved = false;

        // Create a test URL for the app
        const testUrl = 'crownpages://test-installation';

        // Set up page visibility change listener
        const handleVisibilityChange = () => {
            if (document.hidden && !hasResolved) {
                // Page became hidden, likely because app opened
                hasResolved = true;
                setCachedAppInstallationStatus(true);
                resolve(true);
                cleanup();
            }
        };

        // Set up page focus listener  
        const handleFocus = () => {
            // If we get focus back quickly, app probably didn't open
            if (!hasResolved && Date.now() - startTime < 1500) {
                hasResolved = true;
                setCachedAppInstallationStatus(false);
                resolve(false);
                cleanup();
            }
        };

        // Cleanup function
        const cleanup = () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };

        // Set up listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        // Try to open the app
        try {
            // Create invisible iframe to test custom scheme
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = testUrl;
            document.body.appendChild(iframe);

            // Clean up iframe
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }, 100);

        } catch (error) {
            // If there's an error, assume app is not installed
            if (!hasResolved) {
                hasResolved = true;
                setCachedAppInstallationStatus(false);
                resolve(false);
                cleanup();
            }
        }

        // Timeout after 2 seconds
        setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                setCachedAppInstallationStatus(false);
                resolve(false);
                cleanup();
            }
        }, 2000);
    });
}

/**
 * Generates the appropriate deep link URL for the current platform
 */
export function generateDeepLink(path: string): string {
    const platform = detectPlatform();

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    if (platform.isIOS) {
        // iOS Universal Link
        return `https://crownpages.com/${cleanPath}`;
    } else if (platform.isAndroid) {
        // Android App Link
        return `https://crownpages.com/${cleanPath}`;
    }

    // Fallback to web URL
    return `https://crownpages.com/${cleanPath}`;
}

/**
 * Attempts to open the app or fallback to store
 */
export function openInApp(path: string, fallbackToStore: boolean = true): void {
    const platform = detectPlatform();
    const deepLink = generateDeepLink(path);

    if (!platform.isAppInstalled && !platform.canInstallApp) {
        // App not installed and can't be installed
        return;
    }

    // Try to open the app
    const startTime = Date.now();

    // Create a hidden iframe or use window.location
    if (platform.isIOS) {
        // For iOS, try the universal link first
        window.location.href = deepLink;

        // If the app doesn't open within 2 seconds and we should fallback, redirect to App Store
        if (fallbackToStore && platform.appStoreUrl && !platform.isAppInstalled) {
            setTimeout(() => {
                if (Date.now() - startTime < 2500 && document.hidden === false) {
                    window.location.href = platform.appStoreUrl!;
                }
            }, 2000);
        }
    } else if (platform.isAndroid) {
        // For Android, try the app link
        window.location.href = deepLink;

        // Fallback to Play Store if needed
        if (fallbackToStore && platform.appStoreUrl && !platform.isAppInstalled) {
            setTimeout(() => {
                if (Date.now() - startTime < 2500 && document.hidden === false) {
                    window.location.href = platform.appStoreUrl!;
                }
            }, 2000);
        }
    }
}

/**
 * Generates a save-to-wallet deep link
 */
export function generateSaveToWalletLink(pageId: string, businessSlug?: string, pageSlug?: string): string {
    const baseUrl = 'pagesmobile://save';
    const params = new URLSearchParams({
        pageId,
        ...(businessSlug && { businessSlug }),
        ...(pageSlug && { pageSlug }),
        source: 'web'
    });

    return `${baseUrl}?${params.toString()}`;
}

/**
 * Opens the save-to-wallet flow in the app
 */
export function saveToWallet(pageId: string, businessSlug?: string, pageSlug?: string): void {
    const platform = detectPlatform();
    const saveLink = generateSaveToWalletLink(pageId, businessSlug, pageSlug);

    // If we're already inside the app, go straight to the native save route.
    if (platform.isInApp) {
        window.location.href = saveLink;
        return;
    }

    // On mobile, try the deep link first even if install detection is uncertain.
    // Do not show a second install prompt here; iOS/Android already handle
    // deep-link confirmation natively and duplicate prompts create confusion.
    if (platform.isIOS || platform.isAndroid) {
        window.location.href = saveLink;
        return;
    }

    console.warn('Cannot save to wallet: mobile wallet flow unavailable on this platform');
}

/**
 * Checks if we should show app-related prompts based on installation status
 */
export function shouldShowAppPrompts(): boolean {
    const platform = detectPlatform();

    // Don't show if we're already in the app
    if (platform.isInApp) {
        return false;
    }

    // Don't show on desktop
    if (platform.isDesktop) {
        return false;
    }

    // Only show if we haven't tested installation yet, or if we know the app is installed
    return !platform.hasTestedInstallation || platform.isAppInstalled;
} 
