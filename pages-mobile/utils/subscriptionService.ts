import { LicenseService } from './licenseService';
import { RevenueCatService } from './revenuecat';
import { supabase } from './supabase';

export type SubscriptionSource = 'individual' | 'license' | 'trial' | 'none';

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'expired' | 'cancelled' | 'no_plan';

export interface TrialInfo {
    hasActiveTrial: boolean;
    trialId?: string;
    trialEndsAt?: string;
    daysRemaining?: number;
    trialDurationDays?: number;
    trialType?: string;
}

export interface SubscriptionInfo {
    hasProAccess: boolean;
    source: SubscriptionSource;
    status: SubscriptionStatus;
    expiresAt?: string;
    willRenew?: boolean;
    // Trial details
    trialInfo?: TrialInfo;
    // Individual subscription details
    revenueCatDetails?: {
        planType: string;
        expirationDate: string | null;
        willRenew: boolean;
    };
    // License details
    licenseDetails?: {
        licenseCode: string;
        maxSeats: number;
        currentSeats: number;
        expiryDate: string | null;
    };
}

export class SubscriptionService {
    private static listeners: Set<(info: SubscriptionInfo) => void> = new Set();
    private static currentInfo: SubscriptionInfo | null = null;

    /**
     * Add a listener for subscription status changes
     */
    static addListener(callback: (info: SubscriptionInfo) => void) {
        this.listeners.add(callback);

        // Immediately call with current info if available
        if (this.currentInfo) {
            callback(this.currentInfo);
        }
    }

    /**
     * Remove a listener
     */
    static removeListener(callback: (info: SubscriptionInfo) => void) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of subscription changes
     */
    private static notifyListeners(info: SubscriptionInfo) {
        this.currentInfo = info;
        this.listeners.forEach(callback => callback(info));
    }

    /**
     * Check if a subscription is expiring within the specified number of days
     */
    private static isExpiringWithinDays(expirationDate: string | null | undefined, days: number = 30): boolean {
        if (!expirationDate) return false;

        const expiry = new Date(expirationDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return daysUntilExpiry <= days && daysUntilExpiry > 0;
    }

    /**
     * Get subscription status display info with proper expiration logic
     */
    static getSubscriptionDisplayStatus(subscriptionInfo: SubscriptionInfo): {
        isActive: boolean;
        isExpiringSoon: boolean;
        willRenew: boolean;
        showWarning: boolean;
        statusText: string;
        colorScheme: 'green' | 'orange' | 'gray';
    } {
        if (!subscriptionInfo) {
            return {
                isActive: false,
                isExpiringSoon: false,
                willRenew: false,
                showWarning: false,
                statusText: 'No Plan',
                colorScheme: 'gray'
            };
        }

        const { hasProAccess, source, expiresAt } = subscriptionInfo;
        const willRenew = subscriptionInfo.revenueCatDetails?.willRenew ?? false;
        const isExpiringWithin30Days = this.isExpiringWithinDays(expiresAt, 30);

        if (hasProAccess) {
            if (source === 'individual') {
                // Individual subscription logic
                if (isExpiringWithin30Days) {
                    return {
                        isActive: true,
                        isExpiringSoon: true,
                        willRenew,
                        showWarning: true,
                        statusText: willRenew ? 'Renews Soon' : 'Expires Soon',
                        colorScheme: 'orange'
                    };
                } else {
                    return {
                        isActive: true,
                        isExpiringSoon: false,
                        willRenew,
                        showWarning: false,
                        statusText: willRenew ? 'Active (Auto-renewing)' : 'Active',
                        colorScheme: 'green'
                    };
                }
            } else if (source === 'license') {
                // License subscription logic
                if (isExpiringWithin30Days) {
                    return {
                        isActive: true,
                        isExpiringSoon: true,
                        willRenew: false,
                        showWarning: true,
                        statusText: 'License Expires Soon',
                        colorScheme: 'orange'
                    };
                } else {
                    return {
                        isActive: true,
                        isExpiringSoon: false,
                        willRenew: false,
                        showWarning: false,
                        statusText: 'Team License Active',
                        colorScheme: 'green'
                    };
                }
            } else if (source === 'trial') {
                // Trial logic - always show as expiring since trials are short
                return {
                    isActive: true,
                    isExpiringSoon: true,
                    willRenew: false,
                    showWarning: true,
                    statusText: 'Trial Active',
                    colorScheme: 'orange'
                };
            }
        }

        return {
            isActive: false,
            isExpiringSoon: false,
            willRenew: false,
            showWarning: false,
            statusText: 'Inactive',
            colorScheme: 'gray'
        };
    }

    /**
     * Get user trial information
     */
    private static async getTrialInfo(): Promise<TrialInfo> {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user?.id) {
                return { hasActiveTrial: false };
            }

            const { data: trialData, error } = await supabase
                .rpc('get_user_trial_info', { p_user_id: user.user.id });

            if (error) {
                console.error('Error getting trial info:', error);
                return { hasActiveTrial: false };
            }

            const trial = trialData?.[0];
            if (!trial || !trial.has_active_trial) {
                return { hasActiveTrial: false };
            }

            return {
                hasActiveTrial: true,
                trialId: trial.trial_id,
                trialEndsAt: trial.trial_ends_at,
                daysRemaining: trial.days_remaining,
                trialDurationDays: trial.trial_duration_days,
                trialType: trial.trial_type
            };
        } catch (error) {
            console.error('Error getting trial info:', error);
            return { hasActiveTrial: false };
        }
    }

    /**
     * Check if user has any trial record (active or expired)
     */
    private static async hasTrialRecord(): Promise<boolean> {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user?.id) {
                return false;
            }

            const { data: trials, error } = await supabase
                .from('free_trials')
                .select('id')
                .eq('user_id', user.user.id)
                .limit(1);

            if (error) {
                console.error('Error checking trial record:', error);
                return false;
            }

            return trials && trials.length > 0;
        } catch (error) {
            console.error('Error checking trial record:', error);
            return false;
        }
    }

    /**
     * Get comprehensive subscription information
     */
    static async getSubscriptionInfo(forceFresh: boolean = false): Promise<SubscriptionInfo> {
        try {
            // Check all sources in parallel
            const [revenueCatAccess, licenseInfo, trialInfo, hasTrialRecord] = await Promise.all([
                this.checkRevenueCatAccess(forceFresh),
                LicenseService.getUserLicenseInfo(),
                this.getTrialInfo(),
                this.hasTrialRecord()
            ]);

            let subscriptionInfo: SubscriptionInfo;

            // Priority: Individual subscription first, then license, then trial
            if (revenueCatAccess.hasAccess) {
                subscriptionInfo = {
                    hasProAccess: true,
                    source: 'individual',
                    status: 'active',
                    expiresAt: revenueCatAccess.expiresAt,
                    willRenew: revenueCatAccess.willRenew,
                    revenueCatDetails: revenueCatAccess.details,
                    trialInfo
                };

                // Convert trial if user has active subscription
                if (trialInfo.hasActiveTrial && trialInfo.trialId) {
                    await this.convertTrial(trialInfo.trialId, 'individual');
                }
            } else if (licenseInfo.hasLicense && licenseInfo.isActive) {
                const isExpired = licenseInfo.expiryDate && new Date(licenseInfo.expiryDate) < new Date();

                subscriptionInfo = {
                    hasProAccess: !isExpired,
                    source: 'license',
                    status: isExpired ? 'expired' : 'active',
                    expiresAt: licenseInfo.expiryDate || undefined,
                    licenseDetails: {
                        licenseCode: licenseInfo.licenseCode || '',
                        maxSeats: licenseInfo.maxSeats || 0,
                        currentSeats: licenseInfo.currentSeats || 0,
                        expiryDate: licenseInfo.expiryDate || null
                    },
                    trialInfo
                };

                // Convert trial if user has active license
                if (trialInfo.hasActiveTrial && trialInfo.trialId) {
                    await this.convertTrial(trialInfo.trialId, 'license');
                }
            } else if (trialInfo.hasActiveTrial) {
                // User is on trial
                subscriptionInfo = {
                    hasProAccess: true,
                    source: 'trial',
                    status: 'trial',
                    expiresAt: trialInfo.trialEndsAt,
                    trialInfo
                };
            } else {
                // Determine status for users without paid subscriptions or active trials
                if (!hasTrialRecord) {
                    // Legacy user who signed up before trial system - they get "No Plan" status
                    subscriptionInfo = {
                        hasProAccess: false,
                        source: 'none',
                        status: 'no_plan',
                        trialInfo
                    };
                } else {
                    // User had trial but it expired - they're on free plan
                    subscriptionInfo = {
                        hasProAccess: false,
                        source: 'none',
                        status: 'free',
                        trialInfo
                    };
                }
            }

            // Note: We no longer sync to public.users table since subscription status 
            // is now determined dynamically through organization/license checks

            // Notify listeners
            this.notifyListeners(subscriptionInfo);

            return subscriptionInfo;
        } catch (error) {
            console.error('Error getting subscription info:', error);

            const fallbackInfo: SubscriptionInfo = {
                hasProAccess: false,
                source: 'none',
                status: 'free',
                trialInfo: { hasActiveTrial: false }
            };

            this.notifyListeners(fallbackInfo);
            return fallbackInfo;
        }
    }

    /**
     * Convert trial to paid subscription
     */
    private static async convertTrial(trialId: string, source: 'individual' | 'license'): Promise<void> {
        try {
            const { error } = await supabase
                .rpc('convert_trial', {
                    p_trial_id: trialId,
                    p_conversion_source: source
                });

            if (error) {
                console.error('Error converting trial:', error);
            }
        } catch (error) {
            console.error('Error converting trial:', error);
        }
    }

    /**
     * Check RevenueCat subscription status
     */
    private static async checkRevenueCatAccess(forceFresh: boolean = false): Promise<{
        hasAccess: boolean;
        expiresAt?: string;
        willRenew?: boolean;
        details?: any;
    }> {
        try {
            const configured = await RevenueCatService.isConfigured();
            if (!configured) {
                return { hasAccess: false };
            }

            const hasActiveSubscription = await RevenueCatService.hasActiveSubscription('pro', forceFresh);
            if (!hasActiveSubscription) {
                return { hasAccess: false };
            }

            const details = await RevenueCatService.getSubscriptionDetails();

            return {
                hasAccess: true,
                expiresAt: details.expirationDate || undefined,
                willRenew: details.willRenew,
                details
            };
        } catch (error) {
            console.error('Error checking RevenueCat access:', error);
            return { hasAccess: false };
        }
    }

    /**
     * Refresh subscription status (call after purchases, redemptions, etc.)
     */
    static async refreshSubscriptionStatus(): Promise<SubscriptionInfo> {
        return await this.getSubscriptionInfo();
    }

    /**
     * Handle license changes (joining or leaving a license)
     * This method refreshes subscription status and notifies listeners
     */
    static async handleLicenseChange(action: 'joined' | 'left'): Promise<SubscriptionInfo> {
        try {
            console.log(`🔄 License ${action} - refreshing subscription status...`);

            // Clear any cached subscription info
            this.currentInfo = null;

            // Small delay to ensure database consistency
            await new Promise(resolve => setTimeout(resolve, 500));

            // Force refresh subscription status
            const subscriptionInfo = await this.getSubscriptionInfo(true);

            console.log(`✅ Subscription status refreshed after license ${action}:`, subscriptionInfo);

            return subscriptionInfo;
        } catch (error) {
            console.error(`Error handling license ${action}:`, error);
            // Return fallback info rather than throwing
            return {
                hasProAccess: false,
                source: 'none',
                status: 'free',
                trialInfo: { hasActiveTrial: false }
            };
        }
    }

    /**
     * Refresh subscription status after license changes
     * Use this when external components need to trigger a refresh after license operations
     * @param action - Whether the user joined or left a license
     */
    static async refreshAfterLicenseChange(action: 'joined' | 'left'): Promise<SubscriptionInfo> {
        return this.handleLicenseChange(action);
    }

    /**
     * Leave license and handle UI updates
     * This method coordinates leaving a license with appropriate UI refreshes
     */
    static async leaveLicenseAndRefresh(): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: SubscriptionInfo;
        shouldNavigateToPlans?: boolean;
    }> {
        try {
            // Leave the license (this will delete the membership record)
            const result = await LicenseService.leaveLicense();

            if (result.success) {
                // Get the updated subscription info and force UI refresh
                const subscriptionInfo = await this.handleLicenseChange('left');

                // Force notify all listeners to refresh immediately
                this.notifyListeners(subscriptionInfo);

                return {
                    success: true,
                    message: result.message,
                    subscriptionInfo,
                    shouldNavigateToPlans: true // Signal to UI components to navigate to plans
                };
            }

            return result;
        } catch (error) {
            console.error('Error leaving license and refreshing:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Force refresh all subscription-related UI components
     * Call this when you need to ensure all listeners get updated data
     */
    static async forceRefreshUI(): Promise<SubscriptionInfo> {
        // Clear cache and get fresh data
        this.currentInfo = null;
        const subscriptionInfo = await this.getSubscriptionInfo(true);

        // Force notify all listeners
        this.notifyListeners(subscriptionInfo);

        return subscriptionInfo;
    }

    /**
     * Handle license code redemption
     */
    static async redeemLicenseCode(code: string): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: SubscriptionInfo;
    }> {
        try {
            const result = await LicenseService.redeemLicenseCode(code);

            if (result.success) {
                // Refresh subscription status using the convenient method
                const subscriptionInfo = await this.handleLicenseChange('joined');

                return {
                    success: true,
                    message: result.message,
                    subscriptionInfo
                };
            }

            return result;
        } catch (error) {
            console.error('Error redeeming license code:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Purchase a subscription package
     */
    static async purchaseSubscription(packageIdentifier: string): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: SubscriptionInfo;
    }> {
        try {
            await RevenueCatService.purchasePackage(packageIdentifier);

            // Refresh subscription status after successful purchase
            const subscriptionInfo = await this.refreshSubscriptionStatus();

            return {
                success: true,
                message: 'Subscription purchased successfully!',
                subscriptionInfo
            };
        } catch (error) {
            console.error('Error purchasing subscription:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Purchase failed'
            };
        }
    }

    /**
     * Restore purchases
     */
    static async restorePurchases(): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: SubscriptionInfo;
    }> {
        try {
            await RevenueCatService.restorePurchases();

            // Refresh subscription status after restore
            const subscriptionInfo = await this.refreshSubscriptionStatus();

            return {
                success: true,
                message: 'Purchases restored successfully!',
                subscriptionInfo
            };
        } catch (error) {
            console.error('Error restoring purchases:', error);
            return {
                success: false,
                message: 'Failed to restore purchases'
            };
        }
    }

    /**
     * Leave current license (switch to individual or free)
     */
    static async leaveLicense(): Promise<{
        success: boolean;
        message: string;
        subscriptionInfo?: SubscriptionInfo;
    }> {
        try {
            const result = await LicenseService.leaveLicense();

            if (result.success) {
                // Refresh subscription status after leaving license
                const subscriptionInfo = await this.refreshSubscriptionStatus();

                return {
                    success: true,
                    message: result.message,
                    subscriptionInfo
                };
            }

            return result;
        } catch (error) {
            console.error('Error leaving license:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    }

    /**
     * Get available packages for purchase
     */
    static async getAvailablePackages() {
        return await RevenueCatService.getAvailablePackages();
    }

    /**
     * Simple convenience method to check if user has Pro access
     */
    static async hasProAccess(): Promise<boolean> {
        const info = await this.getSubscriptionInfo();
        return info.hasProAccess;
    }

    /**
     * Debug license seats usage
     */
    static async debugLicenseSeats(): Promise<void> {
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user?.user?.id) {
                console.log('No authenticated user');
                return;
            }

            const { data: licenseMemberships, error } = await supabase
                .from('license_membership')
                .select(`
                    *,
                    license:license_id (
                        *,
                        owner:owner_id (email),
                        memberships:license_membership!license_id (
                            user:user_id (email),
                            is_active
                        )
                    )
                `)
                .eq('user_id', user.user.id);

            console.log('License memberships debug:', {
                userId: user.user.id,
                userEmail: user.user.email,
                memberships: licenseMemberships,
                error
            });
        } catch (error) {
            console.error('Debug license seats error:', error);
        }
    }

    /**
     * Get subscription info with fresh RevenueCat data (bypasses all caches)
     */
    static async getSubscriptionInfoWithFreshData(): Promise<SubscriptionInfo> {
        try {
            // Force clear all RevenueCat caches first
            await RevenueCatService.clearAllCaches();

            // Then get fresh subscription info
            const info = await this.getSubscriptionInfo(true); // Pass true to force fresh data

            // Emit the updated info
            this.currentInfo = info;
            this.notifyListeners(info);

            return info;
        } catch (error) {
            console.error('Error getting subscription info with fresh data:', error);
            throw error;
        }
    }

    /**
     * Force refresh subscription status with fresh RevenueCat data (bypasses all caches)
     */
    static async forceRefreshSubscriptionStatus(): Promise<SubscriptionInfo> {
        try {
            // Force clear all RevenueCat caches
            await RevenueCatService.clearAllCaches();

            // Force refresh customer info from network
            await RevenueCatService.refreshCustomerInfo();

            // Then get updated subscription info
            const info = await this.getSubscriptionInfo(true); // Pass true to force fresh data

            // Emit the updated info
            this.currentInfo = info;
            this.notifyListeners(info);

            return info;
        } catch (error) {
            console.error('Error force refreshing subscription status:', error);
            throw error;
        }
    }

    /**
     * Get current cached subscription info (useful for synchronous checks)
     */
    static getCurrentInfo(): SubscriptionInfo | null {
        return this.currentInfo;
    }

    /**
     * Debug method: Test cache invalidation and force refresh
     * Use this to verify cache invalidation is working after making changes in RevenueCat dashboard
     */
    static async debugCacheInvalidation(): Promise<{
        revenueCatDebug: any;
        subscriptionBefore: SubscriptionInfo;
        subscriptionAfter: SubscriptionInfo;
        cacheCleared: boolean;
    }> {
        try {
            console.log('🔍 DEBUG: Testing cache invalidation...');

            // 1. Get current subscription state (may be cached)
            const subscriptionBefore = await this.getSubscriptionInfo();
            console.log('📋 Subscription BEFORE cache clear:', subscriptionBefore);

            // 2. Test RevenueCat cache invalidation
            const revenueCatDebug = await RevenueCatService.debugForceRefresh();

            // 3. Clear our own cache and get fresh subscription info
            this.currentInfo = null;
            const subscriptionAfter = await this.getSubscriptionInfo(true);
            console.log('📋 Subscription AFTER cache clear:', subscriptionAfter);

            const cacheCleared =
                subscriptionBefore.hasProAccess !== subscriptionAfter.hasProAccess ||
                subscriptionBefore.source !== subscriptionAfter.source ||
                subscriptionBefore.status !== subscriptionAfter.status;

            console.log(`✅ Subscription cache invalidation ${cacheCleared ? 'DETECTED CHANGES' : 'NO CHANGES'}`);

            // Force notify listeners with fresh data
            this.notifyListeners(subscriptionAfter);

            return {
                revenueCatDebug,
                subscriptionBefore,
                subscriptionAfter,
                cacheCleared
            };
        } catch (error) {
            console.error('❌ Debug cache invalidation failed:', error);
            throw error;
        }
    }
} 