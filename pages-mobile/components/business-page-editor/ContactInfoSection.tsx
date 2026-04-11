import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

type ContactInfo = {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
};

interface ContactInfoSectionProps {
    contactInfo: ContactInfo;
    onContactInfoChange: (contactInfo: ContactInfo) => void;
}

export default function ContactInfoSection({
    contactInfo,
    onContactInfoChange,
}: ContactInfoSectionProps) {
    const updateField = (field: keyof ContactInfo, value: string) => {
        onContactInfoChange({
            ...contactInfo,
            [field]: value,
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={contactInfo.email || ''}
                    onChangeText={(text) => updateField('email', text)}
                    placeholder="contact@business.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                    style={styles.input}
                    value={contactInfo.phone || ''}
                    onChangeText={(text) => updateField('phone', text)}
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={contactInfo.address || ''}
                    onChangeText={(text) => updateField('address', text)}
                    placeholder="123 Business St, City, State 12345"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Website</Text>
                <TextInput
                    style={styles.input}
                    value={contactInfo.website || ''}
                    onChangeText={(text) => updateField('website', text)}
                    placeholder="https://business.com"
                    placeholderTextColor="#999"
                    keyboardType="url"
                    autoCapitalize="none"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
}); 