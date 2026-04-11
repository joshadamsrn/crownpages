import Loader from '@/components/common/Loader';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { getLicenseSeatCount } from '../../utils/licenseService';
import { RevenueCatService } from '../../utils/revenuecat';
import { SubscriptionService } from '../../utils/subscriptionService';
import { supabase } from '../../utils/supabase';

const PLAN_FEATURES = [
    {
        icon: 'create-outline',
        text: 'Dynamically create and update pages for your business',
    },
    {
        icon: 'layers-outline',
        text: 'Multiple pages for each business',
    },
    {
        icon: 'share-social-outline',
        text: 'Share pages and observe analytics of visits',
    },
    {
        icon: 'images-outline',
        text: 'Dynamically add testimonials, gallery, and more',
    },
    {
        icon: 'color-palette-outline',
        text: 'Update section-specific styles easily',
    },
];

// Custom header title component with crown icon
const HeaderTitleWithCrown = ({ title }: { title: string }) => (
    <View style={styles.headerTitleContainer}>
        <Image
            source={require('../../assets/images/logo/crown only.png')}
            style={styles.crownIcon}
            resizeMode="contain"
        />
        <Text style={styles.headerTitle}>{title}</Text>
    </View>
);

const PlansScreen = () => {
    const { session } = useAuth();
    const {
        subscriptionInfo,
        isLoading: subscriptionLoading,
        hasProAccess,
        isIndividualSubscription,
        isLicenseSubscription,
        isOnTrial,
        hasNoPlan,
        hasExpiredTrial,
        trialInfo,
        daysRemainingInTrial,
        purchaseSubscription,
        restorePurchases,
        getAvailablePackages,
        refreshSubscription,
        leaveLicense
    } = useSubscription();

    const [availablePackages, setAvailablePackages] = useState<Array<{
        identifier: string;
        productId: string;
        price: string;
        duration: string;
        title: string;
        description: string;
        isRecommended?: boolean;
        savings?: string;
        metadata?: Record<string, any>;
    }>>([]);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isManualRefresh, setIsManualRefresh] = useState(false);
    const [checkingSubscription, setCheckingSubscription] = useState(false);
    const [showRefreshInfo, setShowRefreshInfo] = useState(false);
    const [directLicenseInfo, setDirectLicenseInfo] = useState<{
        code: string;
        maxSeats: number;
        currentSeats: number;
        expiryDate: string | null;
    } | null>(null);

    // Get license info using the reusable function
    const getDirectLicenseInfo = async () => {
        if (!session?.user?.id || !isLicenseSubscription) return;

        try {
            // Get user's license ID first
            const { data, error } = await supabase
                .from('license_membership')
                .select('license_id')
                .eq('user_id', session.user.id)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                console.log('Error fetching license membership:', error);
                return;
            }

            // Use the reusable function
            const seatInfo = await getLicenseSeatCount(data.license_id);

            setDirectLicenseInfo({
                code: seatInfo.code,
                maxSeats: seatInfo.maxSeats,
                currentSeats: seatInfo.currentSeats,
                expiryDate: seatInfo.expiryDate
            });

        } catch (error) {
            console.error('Direct license query error:', error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setError(null);

            try {
                // Fetch available packages
                const packages = await getAvailablePackages();
                setAvailablePackages(packages);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load plans');
            }
        };

        if (session?.user?.id) {
            fetchData();
        }
    }, [session?.user?.id, getAvailablePackages]);

    // Fetch direct license info when subscription is license type
    useEffect(() => {
        if (isLicenseSubscription && session?.user?.id) {
            getDirectLicenseInfo();
        }
    }, [isLicenseSubscription, session?.user?.id]);

    const handleManualRefresh = async () => {
        setRefreshing(true);
        setIsManualRefresh(true);

        try {
            // Full subscription refresh but prevent black screen by tracking manual refresh
            await refreshSubscription();
            if (isLicenseSubscription) {
                await getDirectLicenseInfo();
            }
        } catch (error) {
            console.error('Manual refresh error:', error);
        } finally {
            setRefreshing(false);
            setIsManualRefresh(false);
        }
    };

    const handleCheckActiveSubscription = async () => {
        setCheckingSubscription(true);

        try {
            console.log('🔄 Checking for active subscriptions...');

            // Use the new cache invalidation methods to force refresh subscription status
            const freshSubscriptionInfo = await SubscriptionService.forceRefreshSubscriptionStatus();

            console.log('✅ Subscription check complete:', freshSubscriptionInfo);

            // Show a brief success message if we found an active subscription
            if (freshSubscriptionInfo.hasProAccess) {
                Alert.alert(
                    'Active Subscription Found! 🎉',
                    'Your subscription status has been updated. You now have Pro access!',
                    [{ text: 'Great!', style: 'default' }]
                );
            } else {
                // No active subscription found - show neutral message
                Alert.alert(
                    'Subscription Check Complete',
                    'No active subscription found. If you recently purchased or redeemed a subscription, please wait a few minutes and try again.',
                    [{ text: 'OK', style: 'default' }]
                );
            }
        } catch (error) {
            console.error('Error checking active subscription:', error);
            Alert.alert(
                'Check Failed',
                'Unable to check for active subscriptions. Please check your internet connection and try again.',
                [{ text: 'OK', style: 'default' }]
            );
        } finally {
            setCheckingSubscription(false);
        }
    };

    const handlePurchase = async (packageIdentifier: string) => {
        if (purchasing) return;

        setPurchasing(packageIdentifier);
        try {
            const result = await purchaseSubscription(packageIdentifier);

            if (result.success) {
                Alert.alert(
                    'Success! 🎉',
                    result.message,
                    [
                        {
                            text: 'Continue',
                            onPress: () => router.replace('/(app)/(tabs)'),
                        },
                    ]
                );
            } else {
                Alert.alert('Purchase Failed', result.message);
            }
        } catch (error) {
            console.error('Purchase error:', error);
            Alert.alert('Purchase Failed', 'An unexpected error occurred. Please try again.');
        } finally {
            setPurchasing(null);
        }
    };

    const handleRestorePurchases = async () => {
        try {
            const result = await restorePurchases();

            if (result.success) {
                Alert.alert('Success', result.message);
            } else {
                // If restore fails, direct to support
                Alert.alert(
                    'Restore Failed',
                    result.message + '\n\nIf you continue to have issues, please contact support.',
                    [
                        {
                            text: 'Contact Support',
                            onPress: () => {
                                Alert.alert(
                                    'Contact Support',
                                    'Please email support@crownpages.com with your purchase details.',
                                    [{ text: 'OK' }]
                                );
                            }
                        },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
            }
        } catch (error) {
            console.error('Restore error:', error);
            Alert.alert(
                'Restore Failed',
                'Failed to restore purchases. Please contact support@crownpages.com if you have made a purchase.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleReleaseLicenseSeat = async () => {
        Alert.alert(
            'Release License Seat',
            'Are you sure you want to release your seat from this team license? You will lose Pro access immediately and return to the free trial.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Release Seat',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await leaveLicense();
                            if (result.success) {
                                Alert.alert('Success', result.message);
                            } else {
                                Alert.alert('Error', result.message);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to release license seat');
                        }
                    }
                }
            ]
        );
    };

    const handleUnsubscribe = async () => {
        try {
            // First try to get RevenueCat's management URL (best practice)
            let managementUrl = null;
            try {
                const customerInfo = await RevenueCatService.getCustomerInfo();
                managementUrl = customerInfo.managementURL;
                console.log('RevenueCat management URL:', managementUrl);
            } catch (error) {
                console.log('Could not get RevenueCat management URL:', error);
            }

            if (managementUrl) {
                // Use RevenueCat's platform-specific management URL
                Alert.alert(
                    'Manage Your Subscription',
                    'You can cancel anytime and your Pro access will continue until the end of your current billing period.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Manage Subscription',
                            onPress: async () => {
                                try {
                                    const canOpen = await Linking.canOpenURL(managementUrl);
                                    if (canOpen) {
                                        await Linking.openURL(managementUrl);
                                    } else {
                                        throw new Error('Cannot open management URL');
                                    }
                                } catch (error) {
                                    console.error('Error opening management URL:', error);
                                    Alert.alert('Error', 'Unable to open subscription management. Please check your app store manually.');
                                }
                            }
                        }
                    ]
                );
            } else {
                // Fallback to platform-specific deep links
                const isIOS = Platform.OS === 'ios';

                Alert.alert(
                    'Manage Your Subscription',
                    'You can cancel anytime and your Pro access will continue until the end of your current billing period.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: isIOS ? 'Open App Store' : 'Open Play Store',
                            onPress: async () => {
                                try {
                                    let storeUrl;
                                    if (isIOS) {
                                        // Try App Store subscriptions page first
                                        storeUrl = 'itms-apps://apps.apple.com/account/subscriptions';
                                    } else {
                                        // Android Play Store subscriptions
                                        storeUrl = 'https://play.google.com/store/account/subscriptions';
                                    }

                                    const canOpen = await Linking.canOpenURL(storeUrl);
                                    if (canOpen) {
                                        await Linking.openURL(storeUrl);
                                    } else {
                                        // Fallback URLs
                                        const fallbackUrl = isIOS
                                            ? 'https://apps.apple.com/account/subscriptions'
                                            : `https://play.google.com/store/apps/details?id=com.phnteam.pagesmobile`;
                                        await Linking.openURL(fallbackUrl);
                                    }
                                } catch (error) {
                                    console.error('Error opening store:', error);
                                    // Final fallback with instructions
                                    Alert.alert(
                                        'Manual Instructions',
                                        isIOS
                                            ? 'Please go to: Settings → Apple ID → Subscriptions → Crown Pages'
                                            : 'Please go to: Play Store → Menu → Subscriptions → Crown Pages',
                                        [{ text: 'Got it' }]
                                    );
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Error in handleUnsubscribe:', error);
            Alert.alert('Error', 'Unable to open subscription management. Please check your device settings.');
        }
    };

    // Show subscription status information
    const getSubscriptionStatusInfo = () => {
        if (!subscriptionInfo) return null;

        const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(subscriptionInfo);

        if (hasProAccess) {
            if (isIndividualSubscription) {
                const expiryDate = subscriptionInfo.expiresAt;

                return {
                    title: 'Individual Pro Subscription',
                    subtitle: displayStatus.showWarning
                        ? '⚠️ Expires soon'
                        : (displayStatus.willRenew ? '✅ Active - Auto-renewing' : '✅ Active'),
                    expiryDate: expiryDate,
                    color: displayStatus.colorScheme === 'green' ? '#34C759' : '#ff9500',
                    showManagement: true
                };
            } else if (isLicenseSubscription) {
                // Use direct license info for accurate seat count
                let code = 'Unknown';
                let currentSeats = 0;
                let maxSeats = 0;
                let expiryDate = subscriptionInfo.expiresAt;

                if (directLicenseInfo) {
                    // Direct query result
                    code = directLicenseInfo.code;
                    currentSeats = directLicenseInfo.currentSeats;
                    maxSeats = directLicenseInfo.maxSeats;
                    expiryDate = expiryDate || directLicenseInfo.expiryDate || undefined;
                } else if (subscriptionInfo.licenseDetails) {
                    // Fallback to context data
                    code = subscriptionInfo.licenseDetails.licenseCode;
                    currentSeats = subscriptionInfo.licenseDetails.currentSeats;
                    maxSeats = subscriptionInfo.licenseDetails.maxSeats;
                }

                return {
                    title: displayStatus.showWarning ? 'Team License (Expires Soon)' : 'Team License Active',
                    subtitle: `Code: ${code}`,
                    expiryDate: expiryDate,
                    seats: `${currentSeats}/${maxSeats} seats used`,
                    color: displayStatus.colorScheme === 'green' ? '#007AFF' : '#ff9500'
                };
            } else if (isOnTrial) {
                const daysText = daysRemainingInTrial === 1 ? '1 day left' : `${daysRemainingInTrial || 0} days left`;
                return {
                    title: 'Pro Trial Active',
                    subtitle: `⏱️ ${daysText}`,
                    expiryDate: trialInfo?.trialEndsAt,
                    color: '#FF9500'
                };
            }
        }

        if (hasNoPlan) {
            return {
                title: 'No Active Plan',
                subtitle: 'Start your free trial to begin building and publishing pages',
                color: '#8E8E93'
            };
        }

        if (hasExpiredTrial) {
            return {
                title: 'Inactive',
                subtitle: 'Your data remains safe, but pages are unpublished and you cannot publish new pages',
                color: '#ff4444'
            };
        }

        return {
            title: 'Free Trial',
            subtitle: 'Limited features - Upgrade to unlock publishing',
            color: '#666'
        };
    };

    // Show loading screen only for initial load, not manual refresh
    if (subscriptionLoading && !isManualRefresh) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.loadingContainer}>
                        <Loader />
                        <Text style={styles.loadingText}>Loading subscription info...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <HeaderTitleWithCrown title="Plans & Billing" />
                        <View style={styles.headerSpacer} />
                    </View>

                    <View style={styles.contentContainer}>
                        <View style={styles.errorContainer}>
                            <Ionicons name="warning-outline" size={48} color="#ff6b6b" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const statusInfo = getSubscriptionStatusInfo();

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header with Crown Logo */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <HeaderTitleWithCrown title="Plans & Billing" />
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.contentContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Current Subscription Status */}
                        {statusInfo && (
                            <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
                                <View style={styles.statusHeader}>
                                    <Ionicons
                                        name={hasProAccess ? "checkmark-circle" : hasNoPlan ? "help-circle" : "information-circle"}
                                        size={24}
                                        color={statusInfo.color}
                                    />
                                    <Text style={styles.statusTitle}>{statusInfo.title}</Text>

                                    {/* Manual refresh for troubleshooting */}
                                    {isLicenseSubscription && (
                                        <TouchableOpacity
                                            onPress={handleManualRefresh}
                                            style={styles.refreshButton}
                                            disabled={refreshing}
                                        >
                                            <Ionicons
                                                name="refresh"
                                                size={16}
                                                color="#007AFF"
                                                style={refreshing ? { opacity: 0.5 } : {}}
                                            />
                                        </TouchableOpacity>
                                    )}

                                    {/* Check for active subscription button - only for inactive users */}
                                    {hasExpiredTrial && (
                                        <View style={styles.inactiveActionsContainer}>
                                            <TouchableOpacity
                                                onPress={() => setShowRefreshInfo(!showRefreshInfo)}
                                                style={styles.infoButton}
                                            >
                                                <Ionicons
                                                    name="information-circle-outline"
                                                    size={16}
                                                    color="#666"
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleCheckActiveSubscription}
                                                style={styles.checkSubscriptionButton}
                                                disabled={checkingSubscription}
                                            >
                                                <Ionicons
                                                    name="refresh"
                                                    size={16}
                                                    color="#007AFF"
                                                    style={checkingSubscription ? { opacity: 0.5 } : {}}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Info tooltip for refresh button */}
                                {showRefreshInfo && hasExpiredTrial && (
                                    <View style={styles.refreshInfoTooltip}>
                                        <Ionicons name="information-circle" size={16} color="#007AFF" />
                                        <Text style={styles.refreshInfoText}>
                                            Tap the refresh icon to check for recently activated subscriptions or redeemed licenses
                                        </Text>
                                    </View>
                                )}

                                <Text style={styles.statusSubtitle}>{statusInfo.subtitle}</Text>
                                {statusInfo.expiryDate && (
                                    <Text style={styles.statusExpiry}>
                                        {isLicenseSubscription ? 'License expires' : isOnTrial ? 'Trial expires' : 'Renews'}: {' '}
                                        {new Date(statusInfo.expiryDate).toLocaleDateString()}
                                    </Text>
                                )}
                                {statusInfo.seats && (
                                    <Text style={styles.statusSeats}>{statusInfo.seats}</Text>
                                )}

                                {/* Remove the Start Trial Button - trials are automatic only */}
                            </View>
                        )}

                        {/* Show Pro Features Unlocked when user has access */}
                        {(hasProAccess || isOnTrial) && (
                            <View style={styles.proFeaturesSection}>
                                <Text style={styles.proFeaturesTitle}>
                                    {isOnTrial ? '🚀 Trial Access Active' : '✨ Pro Access Active'}
                                </Text>
                                <Text style={styles.proFeaturesSubtitle}>
                                    {isOnTrial
                                        ? 'Try all Pro features during your trial period!'
                                        : 'You can now publish pages and share them with the world!'
                                    }
                                </Text>
                                {isOnTrial && (
                                    <View style={styles.trialTimingInfo}>
                                        <View style={styles.trialCountdown}>
                                            <Ionicons name="time-outline" size={20} color="#FF9500" />
                                            <Text style={styles.trialDaysText}>
                                                {daysRemainingInTrial === 1
                                                    ? '1 day remaining'
                                                    : `${daysRemainingInTrial || 0} days remaining`
                                                }
                                            </Text>
                                        </View>
                                        {trialInfo?.trialEndsAt && (
                                            <Text style={styles.trialEndDate}>
                                                Trial ends: {new Date(trialInfo.trialEndsAt).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                        )}
                                        <Text style={styles.trialUpgradeNote}>
                                            💡 Upgrade before your trial ends to keep your Pro access
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}



                        {/* Team License Management - appears under Pro features */}
                        {isLicenseSubscription && (
                            <View style={styles.licenseManagementSection}>
                                <Text style={styles.sectionTitle}>Team License Management</Text>

                                <View style={styles.licenseCard}>
                                    <View style={styles.licenseHeader}>
                                        <Ionicons name="people" size={24} color="#007AFF" />
                                        <Text style={styles.licenseTitle}>Team Access</Text>
                                    </View>

                                    <Text style={styles.licenseDescription}>
                                        You're part of a team license. This gives you Pro access as long as you remain part of the team.
                                    </Text>

                                    <TouchableOpacity
                                        style={styles.releaseSeatButton}
                                        onPress={handleReleaseLicenseSeat}
                                    >
                                        <Ionicons name="exit-outline" size={16} color="#ff4444" />
                                        <Text style={styles.releaseSeatButtonText}>Release My Seat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Individual Subscription Management */}
                        {isIndividualSubscription && (
                            <View style={styles.subscriptionManagementSection}>
                                <Text style={styles.sectionTitle}>Subscription Management</Text>

                                <View style={styles.subscriptionCard}>
                                    <View style={styles.subscriptionHeader}>
                                        <Ionicons name="person" size={24} color="#34C759" />
                                        <Text style={styles.subscriptionTitle}>Individual Pro</Text>
                                    </View>

                                    <View style={styles.subscriptionDetails}>
                                        <Text style={styles.subscriptionDescription}>
                                            You have an active individual Pro subscription managed through your device's app store.
                                        </Text>

                                        {(() => {
                                            const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(subscriptionInfo!);

                                            if (displayStatus.showWarning) {
                                                return (
                                                    <View style={styles.renewalInfo}>
                                                        <Ionicons name="warning" size={16} color="#ff9500" />
                                                        <Text style={[styles.renewalText, { color: '#ff9500' }]}>
                                                            {displayStatus.willRenew ? 'Renewal due soon' : 'Expires soon'}
                                                        </Text>
                                                    </View>
                                                );
                                            } else {
                                                return (
                                                    <View style={styles.renewalInfo}>
                                                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                                                        <Text style={styles.renewalText}>
                                                            {displayStatus.willRenew ? 'Auto-renewal is ON' : 'Active subscription'}
                                                        </Text>
                                                    </View>
                                                );
                                            }
                                        })()}

                                        {subscriptionInfo?.expiresAt && (
                                            <Text style={styles.expiryInfo}>
                                                {(() => {
                                                    const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(subscriptionInfo!);

                                                    if (displayStatus.showWarning) {
                                                        return displayStatus.willRenew ? 'Renews' : 'Expires';
                                                    } else {
                                                        return displayStatus.willRenew ? 'Next billing' : 'Expires';
                                                    }
                                                })()}: {' '}
                                                {new Date(subscriptionInfo.expiresAt).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.manageSubscriptionButton}
                                        onPress={handleUnsubscribe}
                                    >
                                        <Ionicons name="settings-outline" size={16} color="#007AFF" />
                                        <Text style={styles.manageSubscriptionButtonText}>Manage Subscription</Text>
                                    </TouchableOpacity>

                                    <Text style={styles.managementNote}>
                                        💡 You can cancel anytime. Your Pro access continues until the end of your billing period.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Always show subscription plans for App Store compliance */}
                        <View style={styles.upgradeSection}>
                            <Text style={styles.headerText}>
                                {hasProAccess && !isOnTrial ? 'Subscription Plans' : 'Unlock Pro Features'}
                            </Text>
                            <Text style={styles.subheader}>
                                {hasProAccess && !isOnTrial
                                    ? 'Manage your subscription and explore other options'
                                    : 'Publish your pages and share them with the world'
                                }
                            </Text>

                            {/* Features List - only show for non-Pro users */}
                            {(!hasProAccess || isOnTrial) && (
                                <View style={styles.featuresList}>
                                    {PLAN_FEATURES.map((feature, index) => (
                                        <View key={index} style={styles.featureItem}>
                                            <Ionicons
                                                name={feature.icon as any}
                                                size={20}
                                                color="#007AFF"
                                                style={styles.featureIcon}
                                            />
                                            <Text style={styles.featureText}>{feature.text}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Available Packages - Show based on subscription status */}
                            <View style={styles.packagesSection}>
                                {isIndividualSubscription && hasProAccess ? (
                                    // For active individual subscribers: Show only current plan with manage button
                                    <View style={[styles.planCard, styles.currentPlanCard]}>
                                        <View style={styles.planContent}>
                                            <View style={styles.badgeContainer}>
                                                <View style={styles.currentPlanBadge}>
                                                    <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                                    <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
                                                </View>
                                            </View>

                                            <View style={styles.planHeader}>
                                                <Text style={styles.planTitle}>Individual Pro</Text>
                                                <Text style={styles.planPrice}>
                                                    {subscriptionInfo?.revenueCatDetails?.planType || 'Active'}
                                                </Text>
                                            </View>

                                            <Text style={styles.planDuration}>
                                                {subscriptionInfo?.expiresAt
                                                    ? `Renews ${new Date(subscriptionInfo.expiresAt).toLocaleDateString()}`
                                                    : 'Active Subscription'
                                                }
                                            </Text>

                                            <TouchableOpacity
                                                style={styles.currentPlanButton}
                                                onPress={handleUnsubscribe}
                                            >
                                                <Text style={styles.currentPlanButtonText}>
                                                    Manage Subscription
                                                </Text>
                                                <Ionicons
                                                    name="settings-outline"
                                                    size={16}
                                                    color="#fff"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    // For everyone else: Show all available plans with purchase buttons
                                    availablePackages.map((pkg, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.planCard,
                                                pkg.isRecommended && styles.recommendedPlan,
                                                isLicenseSubscription && styles.disabledPlanCard
                                            ]}
                                            onPress={() => {
                                                if (isLicenseSubscription) {
                                                    Alert.alert(
                                                        'Team License Active',
                                                        'You\'re currently on a team license. To subscribe individually, you\'ll need to leave your team first.',
                                                        [{ text: 'OK' }]
                                                    );
                                                } else {
                                                    handlePurchase(pkg.identifier);
                                                }
                                            }}
                                            disabled={purchasing === pkg.identifier}
                                        >
                                            <View style={styles.planContent}>
                                                {pkg.isRecommended && !isLicenseSubscription && (
                                                    <View style={styles.badgeContainer}>
                                                        <View style={styles.recommendedBadge}>
                                                            <Ionicons name="star" size={12} color="#fff" />
                                                            <Text style={styles.recommendedText}>BEST VALUE</Text>
                                                        </View>
                                                    </View>
                                                )}

                                                <View style={styles.planHeader}>
                                                    <Text style={[
                                                        styles.planTitle,
                                                        isLicenseSubscription && styles.disabledText
                                                    ]}>
                                                        {pkg.title}
                                                    </Text>
                                                    <Text style={[
                                                        styles.planPrice,
                                                        isLicenseSubscription && styles.disabledText
                                                    ]}>
                                                        {pkg.price}
                                                    </Text>
                                                </View>

                                                <Text style={[
                                                    styles.planDuration,
                                                    isLicenseSubscription && styles.disabledText
                                                ]}>
                                                    {pkg.duration}
                                                </Text>

                                                {pkg.description && (
                                                    <Text style={[
                                                        styles.planDescription,
                                                        isLicenseSubscription && styles.disabledText
                                                    ]}>
                                                        {pkg.description}
                                                    </Text>
                                                )}

                                                {pkg.savings && !isLicenseSubscription && (
                                                    <View style={styles.savingsHighlight}>
                                                        <Ionicons name="trending-down" size={16} color="#34C759" />
                                                        <Text style={styles.savingsText}>{pkg.savings}</Text>
                                                    </View>
                                                )}

                                                {purchasing === pkg.identifier ? (
                                                    <View style={[styles.purchaseButton, styles.purchaseButtonLoading]}>
                                                        <Loader />
                                                        <Text style={styles.purchaseButtonText}>Processing...</Text>
                                                    </View>
                                                ) : (
                                                    <View style={[
                                                        styles.purchaseButton,
                                                        pkg.isRecommended && !isLicenseSubscription && styles.purchaseButtonRecommended,
                                                        isLicenseSubscription && styles.disabledPlanButton
                                                    ]}>
                                                        <Text style={[
                                                            styles.purchaseButtonText,
                                                            pkg.isRecommended && !isLicenseSubscription && styles.purchaseButtonTextRecommended,
                                                            isLicenseSubscription && styles.disabledPlanButtonText
                                                        ]}>
                                                            {isLicenseSubscription
                                                                ? 'Unavailable (Team License)'
                                                                : 'Subscribe'
                                                            }
                                                        </Text>
                                                        {!isLicenseSubscription && (
                                                            <Ionicons
                                                                name="arrow-forward"
                                                                size={16}
                                                                color="#fff"
                                                            />
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>

                            {/* License Option - only show if not on license */}
                            {!isLicenseSubscription && (
                                <View style={styles.licenseSection}>
                                    <TouchableOpacity
                                        style={styles.subtleRedeemButton}
                                        onPress={() => router.push('/(app)/redeem-license')}
                                    >
                                        <Ionicons name="key-outline" size={16} color="#666" />
                                        <Text style={styles.subtleRedeemText}>Have a team code?</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Restore Purchases Section - always show */}
                            <View style={styles.restoreSection}>
                                <Text style={styles.restorePrompt}>
                                    {hasProAccess && !isOnTrial
                                        ? 'Having issues with your subscription? '
                                        : 'Already purchased Pro? '
                                    }
                                    <Text
                                        style={styles.restoreLink}
                                        onPress={handleRestorePurchases}
                                    >
                                        {hasProAccess && !isOnTrial
                                            ? 'refresh your subscription status'
                                            : 'restore your purchase by clicking here'
                                        }
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#888',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
        minHeight: 60,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 8,
        marginHorizontal: 8,
    },
    crownIcon: {
        width: 24,
        height: 24,
        tintColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
        flexGrow: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 16,
    },
    retryButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Status Card
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 12,
        flex: 1,
    },
    statusSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
        marginLeft: 36,
    },
    statusExpiry: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
        marginLeft: 36,
    },
    statusSeats: {
        fontSize: 14,
        color: '#333',
        marginTop: 8,
        marginLeft: 36,
    },
    refreshButton: {
        padding: 8,
        marginLeft: 10,
    },

    // Pro Features Section
    proFeaturesSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    proFeaturesTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
        marginBottom: 8,
    },
    proFeaturesSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
    trialUpgradeNote: {
        fontSize: 14,
        color: '#FF9500',
        textAlign: 'center',
        marginTop: 10,
    },
    trialTimingInfo: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#FFF7E6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFE4B5',
    },
    trialCountdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    trialDaysText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF9500',
        marginLeft: 8,
    },
    trialEndDate: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '500',
    },

    // License Management Section
    licenseManagementSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    licenseCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    licenseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    licenseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 12,
    },
    licenseDescription: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        marginBottom: 20,
    },
    releaseSeatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ff4444',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    releaseSeatButtonText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },

    // Individual Subscription Management
    subscriptionManagementSection: {
        marginBottom: 24,
    },
    subscriptionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    subscriptionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 12,
    },
    subscriptionDescription: {
        fontSize: 15,
        color: '#666',
        lineHeight: 22,
        marginBottom: 20,
    },
    subscriptionDetails: {
        marginBottom: 20,
    },
    renewalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    renewalText: {
        fontSize: 14,
        marginLeft: 8,
    },
    expiryInfo: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
        marginTop: 8,
    },
    manageSubscriptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    manageSubscriptionButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    managementNote: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
    },

    // Upgrade Section
    upgradeSection: {
        marginTop: 8,
    },
    headerText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#222',
    },
    subheader: {
        fontSize: 16,
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    featuresList: {
        marginBottom: 32,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureIcon: {
        marginRight: 16,
    },
    featureText: {
        fontSize: 15,
        color: '#333',
        flex: 1,
        lineHeight: 20,
    },

    // Packages Section
    packagesSection: {
        marginBottom: 24,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        overflow: 'hidden',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 8,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    planPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#007AFF',
        flexShrink: 0,
        textAlign: 'right',
    },
    planDuration: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    planDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    purchaseButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    purchaseButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    purchaseButtonRecommended: {
        backgroundColor: '#34C759', // A different color for the recommended plan
    },

    // License and Restore Sections
    licenseSection: {
        marginBottom: 16,
    },
    subtleRedeemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    subtleRedeemText: {
        color: '#666',
        marginLeft: 8,
        fontSize: 15,
    },
    restoreSection: {
        marginTop: 8,
        alignItems: 'center',
    },
    restorePrompt: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    restoreLink: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },

    // New styles for recommended plan and savings highlight
    recommendedPlan: {
        borderWidth: 2,
        borderColor: '#34C759', // Green border for recommended plan
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    planContent: {
        padding: 20,
        paddingHorizontal: 16,
    },
    badgeContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: -8, // Pull badge closer to top
    },
    recommendedBadge: {
        backgroundColor: '#34C759',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    recommendedText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    purchaseButtonLoading: {
        opacity: 0.7,
        backgroundColor: '#666',
    },
    purchaseButtonTextRecommended: {
        fontWeight: 'bold',
    },
    savingsHighlight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E8',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginTop: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#34C759',
    },
    savingsText: {
        color: '#34C759',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },

    // Current plan and disabled states
    currentPlanCard: {
        borderWidth: 2,
        borderColor: '#34C759',
        backgroundColor: '#F8FFF8',
    },
    disabledPlanCard: {
        opacity: 0.6,
        backgroundColor: '#F5F5F5',
    },
    currentPlanBadge: {
        backgroundColor: '#34C759',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    currentPlanText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    currentPlanButton: {
        backgroundColor: '#34C759',
        borderWidth: 2,
        borderColor: '#34C759',
    },
    currentPlanButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledPlanButton: {
        backgroundColor: '#E0E0E0',
        borderWidth: 1,
        borderColor: '#CCCCCC',
    },
    disabledPlanButtonText: {
        color: '#888888',
        fontWeight: 'normal',
    },
    disabledText: {
        color: '#999999',
    },

    // New styles for inactive actions and refresh info
    inactiveActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginLeft: 10,
    },
    infoButton: {
        padding: 8,
    },
    checkSubscriptionButton: {
        padding: 8,
    },
    refreshInfoTooltip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2F7',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginTop: 10,
        marginLeft: 36,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    refreshInfoText: {
        fontSize: 13,
        color: '#007AFF',
        marginLeft: 8,
    },

});

export default PlansScreen; 