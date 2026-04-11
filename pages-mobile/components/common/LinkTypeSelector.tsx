import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const LINK_TYPE_OPTIONS = [
    { label: 'LinkedIn', value: 'linkedin', icon: 'logo-linkedin' },
    { label: 'Instagram', value: 'instagram', icon: 'logo-instagram' },
    { label: 'Twitter/X', value: 'twitter', icon: 'logo-twitter' },
    { label: 'Facebook', value: 'facebook', icon: 'logo-facebook' },
    { label: 'TikTok', value: 'tiktok', icon: 'logo-tiktok' },
    { label: 'YouTube', value: 'youtube', icon: 'logo-youtube' },
    { label: 'Portfolio', value: 'portfolio', icon: 'briefcase-outline' },
    { label: 'Resume/CV', value: 'resume', icon: 'document-text-outline' },
    { label: 'Blog', value: 'blog', icon: 'library-outline' },
    { label: 'WhatsApp', value: 'whatsapp', icon: 'logo-whatsapp' },
    { label: 'Telegram', value: 'telegram', icon: 'paper-plane-outline' },
    { label: 'Discord', value: 'discord', icon: 'logo-discord' },
    { label: 'Calendly', value: 'calendly', icon: 'calendar-outline' },
    { label: 'Venmo', value: 'venmo', icon: 'card-outline' },
    { label: 'PayPal', value: 'paypal', icon: 'logo-paypal' },
    { label: 'Custom', value: 'custom', icon: 'link-outline' },
];

interface LinkTypeSelectorProps {
    selectedType?: string;
    onSelectType: (type: string) => void;
    label?: string;
}

export function LinkTypeSelector({ 
    selectedType, 
    onSelectType, 
    label = "Link Type" 
}: LinkTypeSelectorProps) {
    
    const renderLinkTypeOption = ({ item }: { item: typeof LINK_TYPE_OPTIONS[0] }) => {
        const isSelected = selectedType === item.value;
        
        return (
            <TouchableOpacity
                style={[
                    styles.linkTypeOption,
                    isSelected && styles.selectedLinkTypeOption,
                ]}
                onPress={() => onSelectType(item.value)}
            >
                <View style={[
                    styles.iconContainer,
                    isSelected && styles.selectedIconContainer,
                ]}>
                    <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={isSelected ? '#fff' : '#007AFF'}
                    />
                </View>
                <Text
                    style={[
                        styles.linkTypeLabel,
                        isSelected && styles.selectedLinkTypeLabel,
                    ]}
                    numberOfLines={2}
                >
                    {item.label}
                </Text>
                {isSelected && (
                    <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <FlatList
                data={LINK_TYPE_OPTIONS}
                renderItem={renderLinkTypeOption}
                keyExtractor={(item) => item.value}
                numColumns={4}
                contentContainerStyle={styles.gridContainer}
                columnWrapperStyle={styles.row}
                scrollEnabled={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    gridContainer: {
        paddingVertical: 8,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    linkTypeOption: {
        flex: 1,
        alignItems: 'center',
        padding: 8,
        marginHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
        minHeight: 80,
    },
    selectedLinkTypeOption: {
        borderColor: '#007AFF',
        backgroundColor: '#f0f8ff',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    selectedIconContainer: {
        backgroundColor: '#007AFF',
    },
    linkTypeLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        lineHeight: 12,
        minHeight: 24,
    },
    selectedLinkTypeLabel: {
        color: '#007AFF',
        fontWeight: '600',
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
});
