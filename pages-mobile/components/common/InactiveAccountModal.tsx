import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface InactiveAccountModalProps {
    visible: boolean;
    onClose: () => void;
}

const InactiveAccountModal: React.FC<InactiveAccountModalProps> = ({
    visible,
    onClose,
}) => {
    const handleUpgrade = () => {
        onClose();
        router.push('/(app)/plans');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header with Crown Logo */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/images/logo/crown only.png')}
                            style={styles.crownIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Account Inactive</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.description}>
                            Your free trial has expired. Your data remains safe, but your pages are now unpublished and you cannot publish new pages.
                        </Text>

                        <View style={styles.featuresContainer}>
                            <Text style={styles.featuresTitle}>Crown Pages Pro unlocks:</Text>

                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.featureText}>Publish unlimited pages</Text>
                            </View>

                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.featureText}>Keep your pages live and accessible</Text>
                            </View>

                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.featureText}>Advanced analytics and insights</Text>
                            </View>

                            <View style={styles.feature}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.featureText}>Custom branding and styling</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
                            <Text style={styles.dismissButtonText}>Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    crownIcon: {
        width: 48,
        height: 48,
        marginBottom: 12,
        tintColor: '#ff4444',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ff4444',
        textAlign: 'center',
    },
    content: {
        marginBottom: 24,
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    featuresContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 12,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureText: {
        fontSize: 15,
        color: '#333',
        marginLeft: 8,
        flex: 1,
    },
    actions: {
        gap: 12,
    },
    upgradeButton: {
        backgroundColor: '#000',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dismissButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    dismissButtonText: {
        color: '#666',
        fontSize: 15,
    },
});

export default InactiveAccountModal; 