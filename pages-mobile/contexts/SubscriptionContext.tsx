import React, { createContext, useContext, useEffect, useState } from 'react';
import { SubscriptionInfo, SubscriptionService, SubscriptionSource, SubscriptionStatus, TrialInfo } from '../utils/subscriptionService';
import { useAuth } from './AuthContext';

type SubscriptionContextType = {
    subscriptionInfo: SubscriptionInfo | null;
    isLoading: boolean;
    hasProAccess: boolean;
    // Convenience getters
    source: SubscriptionSource;
    status: SubscriptionStatus;
    isIndividualSubscription: boolean;
    isLicenseSubscription: boolean;
    isOnTrial: boolean;
    isFree: boolean;
    hasNoPlan: boolean; // Legacy users without trial records
    hasExpiredTrial: boolean; // Users who had trial but it expired
    // Trial specific info
    trialInfo: TrialInfo | null;
    daysRemainingInTrial: number | null;
    // Actions
    refreshSubscription: () => Promise<void>;
    forceRefreshSubscription: () => Promise<void>; // New method to force clear cache and refresh
    redeemLicenseCode: (code: string) => Promise<{
        success: boolean;
        message: string;
    }>;
    purchaseSubscription: (packageIdentifier: string) => Promise<{
        success: boolean;
        message: string;
    }>;
    restorePurchases: () => Promise<{
        success: boolean;
        message: string;
    }>;
    leaveLicense: () => Promise<{
        success: boolean;
        message: string;
    }>;
    getAvailablePackages: () => Promise<any[]>;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { session } = useAuth();
    const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load subscription info when user logs in - force fresh data
    useEffect(() => {
        if (session?.user?.id) {
            // Use forceRefreshSubscriptionStatus for more reliable fresh data
            forceRefreshSubscription(); // Force refresh with cache clearing on initial load
        } else {
            // User logged out - reset state
            setSubscriptionInfo(null);
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    // Set up listener for subscription changes
    useEffect(() => {
        const handleSubscriptionChange = (info: SubscriptionInfo) => {
            setSubscriptionInfo(info);
            setIsLoading(false);
        };

        SubscriptionService.addListener(handleSubscriptionChange);

        return () => {
            SubscriptionService.removeListener(handleSubscriptionChange);
        };
    }, []);

    const loadSubscriptionInfo = async (forceRefresh: boolean = false) => {
        try {
            setIsLoading(true);
            if (forceRefresh) {
                // Force clear RevenueCat cache and get fresh data
                await SubscriptionService.getSubscriptionInfoWithFreshData();
            } else {
                await SubscriptionService.getSubscriptionInfo();
            }
            // Info will be set via the listener
        } catch (error) {
            console.error('Error loading subscription info:', error);
            setIsLoading(false);
        }
    };

    const refreshSubscription = async () => {
        try {
            setIsLoading(true);
            await SubscriptionService.refreshSubscriptionStatus();
            // Info will be updated via the listener
        } catch (error) {
            console.error('Error refreshing subscription:', error);
            setIsLoading(false);
        }
    };

    // New method to force clear all caches and get fresh data
    const forceRefreshSubscription = async () => {
        try {
            setIsLoading(true);
            await SubscriptionService.forceRefreshSubscriptionStatus();
            // Info will be updated via the listener
        } catch (error) {
            console.error('Error force refreshing subscription:', error);
            setIsLoading(false);
        }
    };

    const redeemLicenseCode = async (code: string) => {
        try {
            const result = await SubscriptionService.redeemLicenseCode(code);
            // Subscription info will be updated via the listener if successful
            return {
                success: result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error redeeming license code:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    };

    const purchaseSubscription = async (packageIdentifier: string) => {
        try {
            const result = await SubscriptionService.purchaseSubscription(packageIdentifier);
            // Subscription info will be updated via the listener if successful
            return {
                success: result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error purchasing subscription:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    };

    const restorePurchases = async () => {
        try {
            const result = await SubscriptionService.restorePurchases();
            // Subscription info will be updated via the listener if successful
            return {
                success: result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error restoring purchases:', error);
            return {
                success: false,
                message: 'Failed to restore purchases'
            };
        }
    };

    const leaveLicense = async () => {
        try {
            const result = await SubscriptionService.leaveLicense();
            // Subscription info will be updated via the listener if successful
            return {
                success: result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error leaving license:', error);
            return {
                success: false,
                message: 'An unexpected error occurred'
            };
        }
    };

    const getAvailablePackages = async () => {
        try {
            return await SubscriptionService.getAvailablePackages();
        } catch (error) {
            console.error('Error getting available packages:', error);
            return [];
        }
    };

    // Convenience getters
    const hasProAccess = subscriptionInfo?.hasProAccess ?? false;
    const source = subscriptionInfo?.source ?? 'none';
    const status = subscriptionInfo?.status ?? 'free';
    const isIndividualSubscription = source === 'individual';
    const isLicenseSubscription = source === 'license';
    const isOnTrial = source === 'trial' && status === 'trial';
    const isFree = status === 'free';
    const hasNoPlan = status === 'no_plan'; // Legacy users without trial records
    const hasExpiredTrial = status === 'free' && !hasNoPlan; // Users who had trial but it expired
    const trialInfo = subscriptionInfo?.trialInfo ?? null;
    const daysRemainingInTrial = trialInfo?.daysRemaining ?? null;

    const value: SubscriptionContextType = {
        subscriptionInfo,
        isLoading,
        hasProAccess,
        source,
        status,
        isIndividualSubscription,
        isLicenseSubscription,
        isOnTrial,
        isFree,
        hasNoPlan,
        hasExpiredTrial,
        trialInfo,
        daysRemainingInTrial,
        refreshSubscription,
        forceRefreshSubscription, // Add the new method
        redeemLicenseCode,
        purchaseSubscription,
        restorePurchases,
        leaveLicense,
        getAvailablePackages,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}

// Convenience hooks for common use cases
export function useHasProAccess(): boolean {
    const { hasProAccess } = useSubscription();
    return hasProAccess;
}

export function useSubscriptionSource(): SubscriptionSource {
    const { source } = useSubscription();
    return source;
}

export function useIsProLoading(): boolean {
    const { isLoading } = useSubscription();
    return isLoading;
}

export function useIsOnTrial(): boolean {
    const { isOnTrial } = useSubscription();
    return isOnTrial;
}

export function useHasNoPlan(): boolean {
    const { hasNoPlan } = useSubscription();
    return hasNoPlan;
}

export function useHasExpiredTrial(): boolean {
    const { hasExpiredTrial } = useSubscription();
    return hasExpiredTrial;
}

export function useTrialInfo(): TrialInfo | null {
    const { trialInfo } = useSubscription();
    return trialInfo;
} 