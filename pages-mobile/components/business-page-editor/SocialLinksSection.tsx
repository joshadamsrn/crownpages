import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type SocialLink = {
    id: string;
    platform: string;
    url: string;
    is_enabled: boolean;
    sort_order: number;
};

interface SocialLinksSectionProps {
    socialLinks: SocialLink[];
    onSocialLinksChange: (socialLinks: SocialLink[]) => void;
}

const SOCIAL_PLATFORMS = [
    { key: 'website', label: 'Website', icon: 'globe-outline' },
    { key: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
    { key: 'twitter', label: 'Twitter', icon: 'logo-twitter' },
    { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin' },
    { key: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
    { key: 'tiktok', label: 'TikTok', icon: 'logo-tiktok' },
    { key: 'email', label: 'Email', icon: 'mail-outline' },
    { key: 'phone', label: 'Phone', icon: 'call-outline' },
];

export default function SocialLinksSection({
    socialLinks,
    onSocialLinksChange,
}: SocialLinksSectionProps) {
    const addSocialLink = (platform: string) => {
        const newLink: SocialLink = {
            id: `temp_${Date.now()}`,
            platform,
            url: '',
            is_enabled: true,
            sort_order: socialLinks.length,
        };
        onSocialLinksChange([...socialLinks, newLink]);
    };

    const removeSocialLink = (linkId: string) => {
        onSocialLinksChange(socialLinks.filter(link => link.id !== linkId));
    };

    const updateSocialLink = (linkId: string, updates: Partial<SocialLink>) => {
        onSocialLinksChange(
            socialLinks.map(link =>
                link.id === linkId ? { ...link, ...updates } : link
            )
        );
    };

    const getPlatformInfo = (platform: string) => {
        return SOCIAL_PLATFORMS.find(p => p.key === platform) || {
            key: platform,
            label: platform,
            icon: 'link-outline',
        };
    };

    const getAvailablePlatforms = () => {
        const usedPlatforms = socialLinks.map(link => link.platform);
        return SOCIAL_PLATFORMS.filter(platform => !usedPlatforms.includes(platform.key));
    };

    return (
        <View style={styles.container}>
            {/* Existing Social Links */}
            {socialLinks.map((link) => {
                const platformInfo = getPlatformInfo(link.platform);
                return (
                    <View key={link.id} style={styles.socialLinkItem}>
                        <View style={styles.socialLinkHeader}>
                            <View style={styles.platformInfo}>
                                <Ionicons name={platformInfo.icon as any} size={20} color="#007AFF" />
                                <Text style={styles.platformLabel}>{platformInfo.label}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => removeSocialLink(link.id)}
                                style={styles.removeButton}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.urlInput}
                            value={link.url}
                            onChangeText={(text) => updateSocialLink(link.id, { url: text })}
                            placeholder={`Enter your ${platformInfo.label} URL`}
                            placeholderTextColor="#999"
                            keyboardType="url"
                            autoCapitalize="none"
                        />
                    </View>
                );
            })}

            {/* Add Social Link Button */}
            {getAvailablePlatforms().length > 0 && (
                <View style={styles.addSection}>
                    <Text style={styles.addSectionTitle}>Add Social Link</Text>
                    <View style={styles.platformGrid}>
                        {getAvailablePlatforms().map((platform) => (
                            <TouchableOpacity
                                key={platform.key}
                                style={styles.platformButton}
                                onPress={() => addSocialLink(platform.key)}
                            >
                                <Ionicons name={platform.icon as any} size={24} color="#007AFF" />
                                <Text style={styles.platformButtonText}>{platform.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {socialLinks.length === 0 && getAvailablePlatforms().length === 0 && (
                <View style={styles.emptyState}>
                    <Ionicons name="share-social-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyTitle}>All Social Platforms Added</Text>
                    <Text style={styles.emptyDescription}>
                        You've added all available social media platforms. Remove some to add others.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
    },
    socialLinkItem: {
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    socialLinkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    platformInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    platformLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
    },
    removeButton: {
        padding: 4,
    },
    urlInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    addSection: {
        marginTop: 16,
    },
    addSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    platformGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    platformButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
        minWidth: 120,
    },
    platformButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 12,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
}); 