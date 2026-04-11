import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionService } from '../../utils/subscriptionService';

interface SubscriptionBadgeProps {
    size?: 'small' | 'medium' | 'large';
    showDetails?: boolean;
    style?: any;
}

export default function SubscriptionBadge({
    size = 'medium',
    showDetails = false,
    style
}: SubscriptionBadgeProps) {
    const {
        hasProAccess,
        isLoading,
        source,
        status,
        subscriptionInfo,
        isIndividualSubscription,
        isLicenseSubscription,
        isOnTrial,
        hasNoPlan,
        hasExpiredTrial,
        trialInfo,
        daysRemainingInTrial
    } = useSubscription();

    const getTextStyle = () => {
        switch (size) {
            case 'small': return styles.textSmall;
            case 'large': return styles.textLarge;
            default: return styles.textMedium;
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.badge, styles.loadingBadge, styles[size], style]}>
                <Text style={[styles.text, getTextStyle()]}>
                    Loading...
                </Text>
            </View>
        );
    }

    // User is on trial
    if (isOnTrial && trialInfo?.hasActiveTrial) {
        const daysText = daysRemainingInTrial === 1 ? '1 day left' : `${daysRemainingInTrial || 0} days left`;
        return (
            <View style={[styles.badge, styles.trialBadge, styles[size], style]}>
                <Ionicons
                    name="time"
                    size={size === 'large' ? 16 : size === 'medium' ? 14 : 12}
                    color="#FF9500"
                />
                <Text style={[styles.text, styles.trialText, getTextStyle()]}>
                    Trial
                </Text>
                {showDetails && (
                    <Text style={[styles.details, styles.trialText]}>
                        {daysText}
                    </Text>
                )}
            </View>
        );
    }

    // Legacy user has no plan (no trial record - signed up before trial system)
    if (hasNoPlan) {
        return (
            <View style={[styles.badge, styles.noPlanBadge, styles[size], style]}>
                <Ionicons
                    name="help-circle"
                    size={size === 'large' ? 16 : size === 'medium' ? 14 : 12}
                    color="#8E8E93"
                />
                <Text style={[styles.text, styles.noPlanText, getTextStyle()]}>
                    No Plan
                </Text>
                {showDetails && (
                    <Text style={[styles.details, styles.noPlanText]}>
                        Upgrade available
                    </Text>
                )}
            </View>
        );
    }

    // User had trial but it expired (now inactive)
    if (hasExpiredTrial) {
        return (
            <View style={[styles.badge, styles.inactiveBadge, styles[size], style]}>
                <Ionicons
                    name="warning"
                    size={size === 'large' ? 16 : size === 'medium' ? 14 : 12}
                    color="#ff4444"
                />
                <Text style={[styles.text, styles.inactiveText, getTextStyle()]}>
                    Inactive
                </Text>
                {showDetails && (
                    <Text style={[styles.details, styles.inactiveText]}>
                        Trial ended
                    </Text>
                )}
            </View>
        );
    }

    // User has free access (fallback)
    if (!hasProAccess) {
        return (
            <View style={[styles.badge, styles.freeBadge, styles[size], style]}>
                <Ionicons
                    name="information-circle"
                    size={size === 'large' ? 16 : size === 'medium' ? 14 : 12}
                    color="#666"
                />
                <Text style={[styles.text, styles.freeText, getTextStyle()]}>
                    Free Plan
                </Text>
            </View>
        );
    }

    // User has Pro access
    const getBadgeInfo = () => {
        if (isIndividualSubscription) {
            const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(subscriptionInfo!);

            return {
                icon: 'star' as const,
                text: 'Pro',
                color: '#FFD700',
                bgColor: '#FFF9E6',
                details: displayStatus.showWarning ? 'Expires Soon' : 'Individual'
            };
        } else if (isLicenseSubscription) {
            return {
                icon: 'people' as const,
                text: 'Team Pro',
                color: '#007AFF',
                bgColor: '#E6F2FF',
                details: subscriptionInfo?.licenseDetails?.licenseCode || 'Team License'
            };
        }

        return {
            icon: 'checkmark-circle' as const,
            text: 'Pro',
            color: '#34C759',
            bgColor: '#E6F7E6',
            details: 'Active'
        };
    };

    const badgeInfo = getBadgeInfo();

    return (
        <View style={[
            styles.badge,
            styles[size],
            { backgroundColor: badgeInfo.bgColor },
            style
        ]}>
            <Ionicons
                name={badgeInfo.icon}
                size={size === 'large' ? 16 : size === 'medium' ? 14 : 12}
                color={badgeInfo.color}
            />
            <Text style={[
                styles.text,
                getTextStyle(),
                { color: badgeInfo.color }
            ]}>
                {badgeInfo.text}
            </Text>

            {showDetails && badgeInfo.details && (
                <Text style={[styles.details, { color: badgeInfo.color }]}>
                    {badgeInfo.details}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    small: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    medium: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    large: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    text: {
        fontWeight: '600',
    },
    textSmall: {
        fontSize: 11,
    },
    textMedium: {
        fontSize: 13,
    },
    textLarge: {
        fontSize: 14,
    },
    details: {
        fontSize: 10,
        fontWeight: '500',
        marginLeft: 4,
    },
    loadingBadge: {
        backgroundColor: '#f0f0f0',
    },
    freeBadge: {
        backgroundColor: '#f5f5f5',
    },
    freeText: {
        color: '#666',
    },
    trialBadge: {
        backgroundColor: '#FFF2E6',
    },
    trialText: {
        color: '#FF9500',
    },
    noPlanBadge: {
        backgroundColor: '#F2F2F7',
    },
    noPlanText: {
        color: '#8E8E93',
    },
    inactiveBadge: {
        backgroundColor: '#FFE6E6',
    },
    inactiveText: {
        color: '#ff4444',
    },
}); 