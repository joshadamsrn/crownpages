import { Ionicons } from '@expo/vector-icons';
// LinearGradient removed - using simple background instead
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../../contexts/SubscriptionContext';

const { width } = Dimensions.get('window');

export default function RedeemLicenseScreen() {
    const [licenseCode, setLicenseCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { redeemLicenseCode, refreshSubscription } = useSubscription();

    const handleRedeemCode = async () => {
        if (!licenseCode.trim()) {
            Alert.alert('Error', 'Please enter a license code');
            return;
        }

        setLoading(true);
        try {
            const result = await redeemLicenseCode(licenseCode.trim());

            if (result.success) {
                // Force refresh subscription to ensure immediate update
                await refreshSubscription();

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
                Alert.alert('Error', result.message);
            }
        } catch (error) {
            console.error('License redemption error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Redeem License Code</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.contentContainer}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Icon and Title */}
                        <View style={styles.heroSection}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="key" size={40} color="#000" />
                            </View>

                            <Text style={styles.heroTitle}>
                                Enter Access Code
                            </Text>

                            <Text style={styles.heroSubtitle}>
                                Have an access code from your team?{'\n'}
                                Enter it below to unlock Pro features.
                            </Text>
                        </View>

                        {/* License Code Input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>
                                Access Code
                            </Text>

                            <TextInput
                                style={[
                                    styles.textInput,
                                    { borderColor: licenseCode ? '#FFD700' : '#ddd' }
                                ]}
                                placeholder="Enter your access code"
                                placeholderTextColor="#999"
                                value={licenseCode}
                                onChangeText={setLicenseCode}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                maxLength={16}
                                returnKeyType="done"
                                onSubmitEditing={handleRedeemCode}
                            />
                        </View>

                        {/* How it Works */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>
                                How it works:
                            </Text>

                            <View style={styles.stepsList}>
                                <View style={styles.stepItem}>
                                    <Text style={styles.stepNumber}>1.</Text>
                                    <Text style={styles.stepText}>
                                        Your team has an access code for Pro features
                                    </Text>
                                </View>

                                <View style={styles.stepItem}>
                                    <Text style={styles.stepNumber}>2.</Text>
                                    <Text style={styles.stepText}>
                                        Enter the code provided by your team admin
                                    </Text>
                                </View>

                                <View style={styles.stepItem}>
                                    <Text style={styles.stepNumber}>3.</Text>
                                    <Text style={styles.stepText}>
                                        Get instant access to all Pro features
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Redeem Button */}
                        <TouchableOpacity
                            style={[
                                styles.redeemButton,
                                { backgroundColor: licenseCode.length >= 3 ? '#FFD700' : '#e0e0e0' }
                            ]}
                            onPress={handleRedeemCode}
                            disabled={loading || licenseCode.length < 3}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <Text style={[
                                    styles.redeemButtonText,
                                    { color: licenseCode.length >= 3 ? '#000' : '#999' }
                                ]}>
                                    Redeem Access Code
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Alternative */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.alternativeButton}
                            onPress={() => router.push('/plans')}
                        >
                            <Text style={styles.alternativeButtonText}>
                                Buy Individual Subscription Instead
                            </Text>
                        </TouchableOpacity>

                        {/* Need Help */}
                        <View style={styles.helpSection}>
                            <Text style={styles.helpText}>
                                Don't have an access code?{'\n'}
                                Ask your team admin.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#000',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
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
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFD700',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
        marginBottom: 12,
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    inputSection: {
        marginBottom: 30,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 12,
    },
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 18,
        color: '#222',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 16,
    },
    stepsList: {
        gap: 12,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepNumber: {
        color: '#FFD700',
        marginRight: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    stepText: {
        color: '#666',
        fontSize: 16,
        flex: 1,
        lineHeight: 22,
    },
    redeemButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    redeemButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    dividerText: {
        color: '#999',
        marginHorizontal: 16,
        fontSize: 14,
    },
    alternativeButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 1,
    },
    alternativeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    helpSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    helpText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },
}); 