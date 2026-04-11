import Purchases, { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { OrganizationService } from './organizationService';
import { supabase } from './supabase';

export class RevenueCatService {

    /**
     * NOTE: All entitlement checking in this service is case-insensitive.
     * You can use 'pro', 'Pro', 'PRO', etc. - they will all match.
     */

    /**
     * Check if RevenueCat is properly configured
     */
    static async isConfigured(): Promise<boolean> {
        try {
            // Try to check if RevenueCat is configured
            const customerInfo = await Purchases.getCustomerInfo();
            return true;
        } catch (error) {
            console.log('RevenueCat not configured or available:', error);
            return false;
        }
    }

    /**
     * Identify the user with RevenueCat
     * Call this when user logs in
     */
    static async identifyUser(userId: string): Promise<void> {
        try {
            // Check if RevenueCat is configured first
            const configured = await this.isConfigured();
            if (!configured) {
                console.log('RevenueCat not configured, skipping user identification');
                return;
            }

            // Log current user state before identification
            try {
                const currentInfo = await Purchases.getCustomerInfo();
                console.log(`🔄 RevenueCat before identification: ${currentInfo.originalAppUserId}`);
            } catch (e) {
                console.log('🔄 Could not get current RevenueCat user info before identification');
            }

            await Purchases.logIn(userId);
            console.log('✅ User identified with RevenueCat:', userId);
        } catch (error) {
            console.error('❌ Error identifying user with RevenueCat:', error);
            // Don't throw error to prevent app crash - just log it
        }
    }

    /**
 * Log out the current user
 * Call this when user logs out
 */
    static async logOutUser(): Promise<void> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                console.log('RevenueCat not configured, skipping user logout');
                return;
            }

            // Log current user state before logout attempt
            try {
                const currentInfo = await Purchases.getCustomerInfo();
                console.log(`🔄 RevenueCat before logout: ${currentInfo.originalAppUserId}`);
            } catch (e) {
                console.log('🔄 Could not get current RevenueCat user info before logout');
            }

            try {
                await Purchases.logOut();
                console.log('✅ User logged out from RevenueCat successfully');
            } catch (logoutError: any) {
                // Handle the specific "user is anonymous" error gracefully
                if (logoutError?.message?.includes('current user is anonymous') ||
                    logoutError?.toString()?.includes('current user is anonymous')) {
                    console.log('ℹ️ User is already anonymous in RevenueCat, logout not needed');
                    return;
                }
                // Re-throw other errors
                throw logoutError;
            }
        } catch (error) {
            console.error('❌ Error logging out user from RevenueCat:', error);
            // Don't throw error to prevent app crash
        }
    }

    /**
     * Get current customer info and subscription status
     */
    static async getCustomerInfo(): Promise<CustomerInfo> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                throw new Error('RevenueCat not configured');
            }

            // Get customer info normally (will use cache if available)
            const customerInfo = await Purchases.getCustomerInfo();
            return customerInfo;
        } catch (error) {
            console.error('Error fetching customer info:', error);
            throw error;
        }
    }

    /**
     * Force refresh customer info from network (bypasses cache)
     * Use this after manually granting/removing entitlements in RevenueCat dashboard
     */
    static async refreshCustomerInfo(): Promise<CustomerInfo> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                throw new Error('RevenueCat not configured');
            }

            console.log('🔄 Invalidating CustomerInfo cache and fetching fresh data...');

            // First, invalidate the cache to ensure we get fresh data
            await Purchases.invalidateCustomerInfoCache();

            // Then get fresh customer info - after cache invalidation, getCustomerInfo will fetch from network
            const customerInfo = await Purchases.getCustomerInfo();

            console.log('✅ Customer info refreshed from network (cache invalidated)');
            return customerInfo;
        } catch (error) {
            console.error('Error refreshing customer info:', error);
            throw error;
        }
    }

    /**
     * Aggressively clear all RevenueCat caches
     * Use this when you've made changes in RevenueCat dashboard and need fresh data
     */
    static async clearAllCaches(): Promise<void> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                console.log('RevenueCat not configured, skipping cache clear');
                return;
            }

            console.log('🧹 Clearing all RevenueCat caches...');

            // Invalidate customer info cache first
            await Purchases.invalidateCustomerInfoCache();

            // Force fresh customer info - after cache invalidation, this will fetch from network
            await Purchases.getCustomerInfo();

            // Get fresh offerings (no specific cache invalidation method for offerings)
            await Purchases.getOfferings();

            console.log('✅ Cache clearing completed');
        } catch (error) {
            console.error('❌ Error clearing caches:', error);
        }
    }

    /**
 * Check if user has active subscription for specific entitlement (case-insensitive)
 */
    static async hasActiveSubscription(entitlementId: string = 'pro', forceFresh: boolean = false): Promise<boolean> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                console.log('RevenueCat not configured, returning false for subscription check');
                return false;
            }

            // Get customer info - force fresh if requested using proper cache invalidation
            let customerInfo: CustomerInfo;
            if (forceFresh) {
                console.log('🔄 Force fresh requested - invalidating cache and fetching from network...');
                await Purchases.invalidateCustomerInfoCache();
                customerInfo = await Purchases.getCustomerInfo();
            } else {
                customerInfo = await Purchases.getCustomerInfo();
            }

            // Case-insensitive entitlement check
            const activeEntitlements = Object.keys(customerInfo.entitlements.active);
            const hasEntitlement = activeEntitlements.some(key =>
                key.toLowerCase() === entitlementId.toLowerCase()
            );

            // Find the actual entitlement key for logging
            const actualEntitlementKey = activeEntitlements.find(key =>
                key.toLowerCase() === entitlementId.toLowerCase()
            );

            console.log(`Checking subscription for entitlement "${entitlementId}" (case-insensitive, ${forceFresh ? 'FRESH' : 'cached'}):`, {
                hasEntitlement,
                searchedFor: entitlementId,
                actualEntitlementKey: actualEntitlementKey || 'not found',
                activeEntitlements: activeEntitlements,
                allEntitlements: Object.keys(customerInfo.entitlements.all || {}),
                customerInfo: {
                    originalAppUserId: customerInfo.originalAppUserId,
                    managementURL: customerInfo.managementURL,
                    firstSeen: customerInfo.firstSeen
                }
            });

            return hasEntitlement;
        } catch (error) {
            console.error('Error checking subscription status:', error);
            return false;
        }
    }

    /**
 * Get available offerings (subscription plans)
 * Forces fresh data from network instead of using cache
 */
    static async getOfferings(): Promise<PurchasesOffering[]> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                console.log('RevenueCat not configured, returning empty offerings');
                return [];
            }

            // Force offerings refresh - RevenueCat doesn't have a direct method,
            // but calling restorePurchases should invalidate most caches
            try {
                await Purchases.restorePurchases();
                console.log('Force refreshed RevenueCat caches');
            } catch (refreshError) {
                console.warn('Cache refresh attempt failed, continuing with potentially cached data:', refreshError);
            }

            const offerings = await Purchases.getOfferings();
            console.log('Retrieved offerings, total count:', Object.keys(offerings.all).length);

            return Object.values(offerings.all);
        } catch (error) {
            console.error('Error fetching offerings:', error);
            return []; // Return empty array instead of throwing
        }
    }

    /**
     * Purchase a subscription package
     */
    static async purchasePackage(packageIdentifier: string): Promise<CustomerInfo> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                throw new Error('RevenueCat not configured. Please restart the app and try again.');
            }

            const offerings = await Purchases.getOfferings();
            const currentOffering = offerings.current;

            if (!currentOffering) {
                throw new Error('No current offering available');
            }

            // Find the package by identifier
            const targetPackage = Object.values(currentOffering.availablePackages).find(
                pkg => pkg.identifier === packageIdentifier
            );

            if (!targetPackage) {
                throw new Error(`Package ${packageIdentifier} not found`);
            }

            const { customerInfo } = await Purchases.purchasePackage(targetPackage);

            // Sync with your backend
            await this.syncSubscriptionWithBackend(customerInfo);

            return customerInfo;
        } catch (error) {
            console.error('Purchase error:', error);
            if (error instanceof Error) {
                throw new Error(error.message);
            }
            throw new Error('Failed to purchase subscription');
        }
    }

    /**
     * Get available subscription packages with pricing info
     */
    static async getAvailablePackages(): Promise<Array<{
        identifier: string;
        productId: string;
        price: string;
        duration: string;
        title: string;
        description: string;
        isRecommended?: boolean;
        savings?: string;
        metadata?: Record<string, any>;
    }>> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                return [];
            }

            const offerings = await Purchases.getOfferings();
            const currentOffering = offerings.current;

            if (!currentOffering) {
                return [];
            }

            return currentOffering.availablePackages.map(pkg => {
                // Extract metadata from RevenueCat (you can set these in RevenueCat dashboard)
                const packageType = pkg.packageType;
                const offeringMetadata = currentOffering.metadata || {};

                // Debug: Log what metadata we're getting
                console.log(`📦 Package ${pkg.identifier} metadata check:`, {
                    packageType,
                    offeringMetadata,
                    metadataKeys: Object.keys(offeringMetadata),
                    recommended_package: offeringMetadata['recommended_package'],
                    recommended_packages: offeringMetadata['recommended_packages'],
                    auto_recommend_annual: offeringMetadata['auto_recommend_annual']
                });

                // Check if this package is recommended via metadata only (no auto-recommendations)
                const isRecommended =
                    offeringMetadata['recommended_package'] === pkg.identifier ||  // Direct package recommendation
                    (Array.isArray(offeringMetadata['recommended_packages']) &&
                        offeringMetadata['recommended_packages'].includes(pkg.identifier)) || // Array of recommended packages
                    (offeringMetadata['auto_recommend_annual'] === true && packageType === 'ANNUAL'); // Only auto-recommend if explicitly enabled

                console.log(`📦 Package ${pkg.identifier} recommendation result:`, { isRecommended });

                // Calculate savings for annual plans vs monthly equivalent
                let savings = '';
                if (packageType === 'ANNUAL' && pkg.product.price && currentOffering.monthly?.product.price) {
                    const annualPrice = pkg.product.price;
                    const monthlyPrice = currentOffering.monthly.product.price;
                    const annualSavings = (monthlyPrice * 12) - annualPrice;
                    if (annualSavings > 0) {
                        savings = `Save $${annualSavings.toFixed(0)}/year vs monthly`;
                    }
                }

                return {
                    identifier: pkg.identifier,
                    productId: pkg.product.identifier,
                    price: pkg.product.priceString,
                    duration: this.getDurationFromPackage(pkg),
                    title: pkg.product.title,
                    description: pkg.product.description || '',
                    isRecommended,
                    savings,
                    metadata: currentOffering.metadata || {}
                };
            });
        } catch (error) {
            console.error('Error getting available packages:', error);
            return [];
        }
    }

    /**
     * Helper to get duration from package type and product info
     */
    private static getDurationFromPackage(pkg: any): string {
        const packageType = pkg.packageType;
        const product = pkg.product;

        // Use package type for standard durations
        switch (packageType) {
            case 'ANNUAL':
                return 'Annual';
            case 'SIX_MONTH':
                return 'Biannual';
            case 'THREE_MONTH':
                return 'Quarterly';
            case 'MONTHLY':
                return 'Monthly';
            case 'WEEKLY':
                return 'Weekly';
            default:
                // Fallback: try to extract from product identifier or title
                const identifier = product.identifier.toLowerCase();
                if (identifier.includes('year')) return 'Annual';
                if (identifier.includes('month')) return 'Monthly';
                if (identifier.includes('week')) return 'Weekly';
                return 'Subscription';
        }
    }

    /**
     * Restore purchases for the current user
     */
    static async restorePurchases(): Promise<CustomerInfo> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                throw new Error('RevenueCat not configured. Please restart the app and try again.');
            }

            const customerInfo = await Purchases.restorePurchases();

            // Sync with your backend
            await this.syncSubscriptionWithBackend(customerInfo);

            return customerInfo;
        } catch (error) {
            console.error('Error restoring purchases:', error);
            throw error;
        }
    }

    /**
     * Sync RevenueCat subscription status with Supabase backend
     * Note: We no longer update public.users columns for subscription status
     * as this is now determined dynamically through organization/license checks
     */
    static async syncSubscriptionWithBackend(customerInfo: CustomerInfo): Promise<void> {
        try {
            const userId = customerInfo.originalAppUserId;
            const hasActiveSubscription = Object.keys(customerInfo.entitlements.active).length > 0;

            console.log(`RevenueCat sync for user ${userId}:`, {
                hasActiveSubscription,
                entitlementsActive: customerInfo.entitlements.active,
                entitlementsAll: Object.keys(customerInfo.entitlements.all || {}),
                note: 'Subscription status now determined dynamically via organization/license checks'
            });

            // We no longer update the public.users table for subscription status
            // The subscription system now works dynamically by checking:
            // 1. RevenueCat entitlements for individual subscriptions
            // 2. Organization membership and license status for team subscriptions
            // 3. Trial status for trial users

            console.log('✅ RevenueCat sync completed - subscription status determined dynamically');
        } catch (error) {
            console.error('Error during RevenueCat sync:', error);
            // Don't re-throw the error to prevent it from breaking the app flow
        }
    }

    /**
     * Check if user has Pro access (either individual subscription or license membership)
     */
    static async hasProAccess(): Promise<{
        hasAccess: boolean;
        source: 'individual' | 'license' | 'none';
        expiresAt?: string;
    }> {
        try {
            // First check RevenueCat subscription
            const configured = await this.isConfigured();
            if (configured) {
                const hasActiveSubscription = await this.hasActiveSubscription('pro');
                if (hasActiveSubscription) {
                    const details = await this.getSubscriptionDetails();
                    return {
                        hasAccess: true,
                        source: 'individual',
                        expiresAt: details.expirationDate || undefined
                    };
                }
            }

            // Check license membership using new organization system
            const teamAccess = await OrganizationService.hasProAccessViaTeamMembership();

            if (teamAccess.hasAccess) {
                return {
                    hasAccess: true,
                    source: 'license',
                    expiresAt: teamAccess.expiresAt
                };
            }

            return { hasAccess: false, source: 'none' };
        } catch (error) {
            console.error('Error checking Pro access:', error);
            return { hasAccess: false, source: 'none' };
        }
    }

    /**
     * Debug version of hasProAccess with detailed logging
     * Use this to troubleshoot access issues
     */
    static async debugProAccess(): Promise<{
        hasAccess: boolean;
        source: 'individual' | 'license' | 'none';
        expiresAt?: string;
        debug: {
            revenueCatConfigured: boolean;
            revenueCatSubscription: boolean;
            supabaseUserId: string | null;
            organizationStatus: any;
            teamAccess: any;
        };
    }> {
        const debug = {
            revenueCatConfigured: false,
            revenueCatSubscription: false,
            supabaseUserId: null as string | null,
            organizationStatus: null as any,
            teamAccess: null as any
        };

        try {
            console.log('🔍 DEBUG: Starting Pro access check...');

            // First check RevenueCat subscription
            debug.revenueCatConfigured = await this.isConfigured();
            console.log('🔍 DEBUG: RevenueCat configured:', debug.revenueCatConfigured);

            if (debug.revenueCatConfigured) {
                debug.revenueCatSubscription = await this.hasActiveSubscription('pro');
                console.log('🔍 DEBUG: RevenueCat subscription active:', debug.revenueCatSubscription);

                if (debug.revenueCatSubscription) {
                    const details = await this.getSubscriptionDetails();
                    console.log('🔍 DEBUG: RevenueCat subscription details:', details);
                    return {
                        hasAccess: true,
                        source: 'individual',
                        expiresAt: details.expirationDate || undefined,
                        debug
                    };
                }
            }

            // Check organization/team membership using new system
            const { data: user } = await supabase.auth.getUser();
            debug.supabaseUserId = user?.user?.id || null;
            console.log('🔍 DEBUG: Supabase user ID:', debug.supabaseUserId);

            if (!debug.supabaseUserId) {
                console.log('🔍 DEBUG: No Supabase user ID found');
                return { hasAccess: false, source: 'none', debug };
            }

            console.log('🔍 DEBUG: Checking organization status...');
            debug.organizationStatus = await OrganizationService.getCurrentUserOrganizationStatus();
            console.log('🔍 DEBUG: Organization status result:', debug.organizationStatus);

            console.log('🔍 DEBUG: Checking team access...');
            debug.teamAccess = await OrganizationService.hasProAccessViaTeamMembership();
            console.log('🔍 DEBUG: Team access result:', debug.teamAccess);

            if (debug.teamAccess.hasAccess) {
                console.log('🔍 DEBUG: Active team membership found');
                return {
                    hasAccess: true,
                    source: 'license',
                    expiresAt: debug.teamAccess.expiresAt,
                    debug
                };
            }

            console.log('🔍 DEBUG: No active access found');
            return { hasAccess: false, source: 'none', debug };
        } catch (error) {
            console.error('🔍 DEBUG: Error during Pro access check:', error);
            return { hasAccess: false, source: 'none', debug };
        }
    }

    /**
     * Debug method: Force refresh customer info and log detailed results
     * Use this to test cache invalidation after making changes in RevenueCat dashboard
     */
    static async debugForceRefresh(entitlementId: string = 'pro'): Promise<{
        beforeCache: any;
        afterInvalidation: any;
        cacheCleared: boolean;
    }> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                throw new Error('RevenueCat not configured');
            }

            console.log('🔍 DEBUG: Starting force refresh test...');

            // 1. Get current cached data
            const beforeCache = await Purchases.getCustomerInfo();
            const beforeEntitlements = Object.keys(beforeCache.entitlements.active);
            console.log('📋 BEFORE cache invalidation:', {
                activeEntitlements: beforeEntitlements,
                hasTargetEntitlement: beforeEntitlements.some(key => key.toLowerCase() === entitlementId.toLowerCase())
            });

            // 2. Invalidate cache
            console.log('🧹 Invalidating cache...');
            await Purchases.invalidateCustomerInfoCache();

            // 3. Get fresh data
            const afterInvalidation = await Purchases.getCustomerInfo();
            const afterEntitlements = Object.keys(afterInvalidation.entitlements.active);
            console.log('📋 AFTER cache invalidation:', {
                activeEntitlements: afterEntitlements,
                hasTargetEntitlement: afterEntitlements.some(key => key.toLowerCase() === entitlementId.toLowerCase())
            });

            const cacheCleared = JSON.stringify(beforeEntitlements) !== JSON.stringify(afterEntitlements);
            console.log(`✅ Cache invalidation ${cacheCleared ? 'SUCCESSFUL' : 'NO CHANGE'}`);

            return {
                beforeCache: {
                    activeEntitlements: beforeEntitlements,
                    originalAppUserId: beforeCache.originalAppUserId
                },
                afterInvalidation: {
                    activeEntitlements: afterEntitlements,
                    originalAppUserId: afterInvalidation.originalAppUserId
                },
                cacheCleared
            };
        } catch (error) {
            console.error('❌ Debug force refresh failed:', error);
            throw error;
        }
    }

    /**
     * Helper method to get entitlement object by name (case-insensitive)
     */
    private static getEntitlementByName(customerInfo: CustomerInfo, entitlementName: string): any | null {
        const activeEntitlements = customerInfo.entitlements.active;
        const entitlementKey = Object.keys(activeEntitlements).find(key =>
            key.toLowerCase() === entitlementName.toLowerCase()
        );
        return entitlementKey ? activeEntitlements[entitlementKey] : null;
    }

    /**
     * Get subscription details for display
     */
    static async getSubscriptionDetails(): Promise<{
        isActive: boolean;
        planType: string;
        expirationDate: string | null;
        willRenew: boolean;
    }> {
        try {
            const configured = await this.isConfigured();
            if (!configured) {
                return {
                    isActive: false,
                    planType: 'free',
                    expirationDate: null,
                    willRenew: false
                };
            }

            const customerInfo = await this.getCustomerInfo();

            // Try to find pro entitlement (case-insensitive)
            const proEntitlement = this.getEntitlementByName(customerInfo, 'pro');

            if (!proEntitlement) {
                return {
                    isActive: false,
                    planType: 'free',
                    expirationDate: null,
                    willRenew: false
                };
            }

            return {
                isActive: true,
                planType: proEntitlement.identifier,
                expirationDate: proEntitlement.expirationDate,
                willRenew: proEntitlement.willRenew
            };
        } catch (error) {
            console.error('Error getting subscription details:', error);
            return {
                isActive: false,
                planType: 'free',
                expirationDate: null,
                willRenew: false
            };
        }
    }

    /**
 * Test function to debug entitlement issues
 * Call this to troubleshoot manually granted entitlements
 */
    static async testEntitlementDebug(): Promise<void> {
        console.log('🚀 Starting entitlement debug test...');

        try {
            // 1. Clear all caches aggressively
            console.log('🧹 Clearing all caches...');
            await this.clearAllCaches();

            // 2. Test case-insensitive entitlement checking
            console.log('🔤 Testing case-insensitive entitlement checking...');
            const testCases = ['pro', 'Pro', 'PRO', 'pRo'];
            for (const testCase of testCases) {
                const result = await this.hasActiveSubscription(testCase);
                console.log(`  - "${testCase}": ${result ? '✅ Found' : '❌ Not found'}`);
            }

            // 3. Check offerings metadata (this will show debug logs from getAvailablePackages)
            console.log('📦 Checking current offerings metadata...');
            const packages = await this.getAvailablePackages();
            console.log('📦 Package count:', packages.length);

            // 4. Run debug access check
            console.log('🔍 Running detailed access check...');
            const debugResult = await this.debugProAccess();
            console.log('🔍 Debug result:', debugResult);

            // 5. Check regular access
            console.log('✅ Running regular access check...');
            const regularResult = await this.hasProAccess();
            console.log('✅ Regular result:', regularResult);

        } catch (error) {
            console.error('❌ Error during entitlement debug test:', error);
        }
    }
} 