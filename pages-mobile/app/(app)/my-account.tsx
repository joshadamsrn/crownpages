import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { Database } from '../../database.types';
import { supabase } from '../../utils/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

export default function MyAccountScreen() {
    const { session, signOut } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');

    // Account deletion confirmation
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    useEffect(() => {
        fetchUserProfile();
    }, [session?.user?.id]);

    const fetchUserProfile = async () => {
        try {
            if (!session?.user?.id) return;

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return;
            }

            setUserProfile(data);
            setFirstName(data?.first_name || '');
            setLastName(data?.last_name || '');
            setPhone(data?.phone || '');
            setBio(data?.bio || '');
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!session?.user?.id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                    phone: phone.trim() || null,
                    bio: bio.trim() || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', session.user.id);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully');
            fetchUserProfile(); // Refresh the data
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            '⚠️ This action is irreversible and will permanently delete:\n\n• All your pages and content\n• All businesses you own\n• Your saved pages and folders\n• All uploaded media files\n• Your analytics and usage data\n\nAre you absolutely sure you want to continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => setShowDeleteConfirmation(true),
                },
            ]
        );
    };

    const handleChangePassword = async () => {
        const email = session?.user?.email;
        if (!email) return;

        Alert.alert(
            'Change Password',
            `We will send a password reset link to ${email}. Check your inbox after tapping Send.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Reset Email',
                    onPress: async () => {
                        try {
                            const redirectTo = `${(process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com').replace(/\/$/, '')}/auth/update-password`;
                            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
                            if (error) throw error;
                            Alert.alert('Email Sent', 'Check your inbox for a password reset link. Open it on any device to set your new password.');
                        } catch (error) {
                            console.error('Error sending reset email:', error);
                            Alert.alert('Error', 'Failed to send reset email. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        if (deleteConfirmationText.toLowerCase() !== 'i understand') {
            Alert.alert('Error', 'Please type "I understand" to confirm account deletion');
            return;
        }

        setIsDeleting(true);
        try {
            // Call the Edge Function to delete user
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { confirm: deleteConfirmationText }
            });

            if (error) throw error;

            if (data.success) {
                Alert.alert(
                    'Account Deleted',
                    'Your account and all data have been permanently deleted.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                await signOut();
                                router.replace('/(auth)/signup');
                            },
                        },
                    ]
                );
            } else {
                throw new Error(data.error || 'Failed to delete account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            Alert.alert('Error', 'Failed to delete account. Please try again.');
            setIsDeleting(false);
        }
    };

    const renderUserInfo = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>

            <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{session?.user?.email}</Text>
                <Text style={styles.infoNote}>Email cannot be changed</Text>
            </View>

            <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleChangePassword}
            >
                <Ionicons name="lock-closed-outline" size={18} color="#007AFF" />
                <Text style={styles.changePasswordText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={18} color="#007AFF" />
            </TouchableOpacity>

            <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={[styles.infoValue, styles.userId]}>{session?.user?.id}</Text>
            </View>

            <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Account Created</Text>
                <Text style={styles.infoValue}>
                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
            </View>

            <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Plan Type</Text>
                <Text style={[styles.infoValue, styles.planType]}>
                    {userProfile?.plan_type || 'Free'}
                </Text>
            </View>
        </View>
    );

    const renderProfileForm = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>First Name</Text>
                <TextInput
                    style={styles.formInput}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter your first name"
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Last Name</Text>
                <TextInput
                    style={styles.formInput}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter your last name"
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                    style={styles.formInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bio</Text>
                <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSaving}
            >
                {isSaving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="save-outline" size={20} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderLegalSection = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>

            <TouchableOpacity
                style={styles.legalItem}
                onPress={() => router.push('/(app)/page-viewer/terms-of-service' as any)}
            >
                <View style={styles.legalItemContent}>
                    <Ionicons name="document-text-outline" size={20} color="#007AFF" />
                    <Text style={styles.legalItemText}>Terms of Service</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.legalItem}
                onPress={() => router.push('/(app)/page-viewer/privacy-policy' as any)}
            >
                <View style={styles.legalItemContent}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
                    <Text style={styles.legalItemText}>Privacy Policy</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
        </View>
    );

    const renderDangerZone = () => (
        <View style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <Text style={styles.dangerDescription}>
                Once you delete your account, there is no going back. Please be certain.
            </Text>

            {!showDeleteConfirmation ? (
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAccount}
                >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete My Account</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.confirmationSection}>
                    <Text style={styles.confirmationText}>
                        Type "I understand" to confirm account deletion:
                    </Text>
                    <TextInput
                        style={styles.confirmationInput}
                        value={deleteConfirmationText}
                        onChangeText={setDeleteConfirmationText}
                        placeholder="Type here..."
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <View style={styles.confirmationButtons}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowDeleteConfirmation(false);
                                setDeleteConfirmationText('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.confirmDeleteButton,
                                (isDeleting || deleteConfirmationText.toLowerCase() !== 'i understand') &&
                                styles.confirmDeleteButtonDisabled,
                            ]}
                            onPress={confirmDeleteAccount}
                            disabled={isDeleting || deleteConfirmationText.toLowerCase() !== 'i understand'}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.confirmDeleteButtonText}>Delete Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading account information...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Account</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.contentContainer}>
                    <KeyboardAvoidingView
                        style={styles.content}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                            {renderUserInfo()}
                            {renderProfileForm()}
                            {renderLegalSection()}
                            {renderDangerZone()}
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black container makes status bar black in edge-to-edge
    },
    safeArea: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Light background for actual content
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
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
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    infoItem: {
        marginBottom: 16,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#000',
        marginBottom: 2,
    },
    infoNote: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    changePasswordButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        marginTop: 8,
        gap: 8,
    },
    changePasswordText: {
        flex: 1,
        fontSize: 15,
        color: '#007AFF',
    },
    userId: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
    },
    planType: {
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
        marginBottom: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        marginTop: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    dangerSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 32,
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#ff4444',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dangerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ff4444',
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff4444',
        borderRadius: 8,
        paddingVertical: 12,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    confirmationSection: {
        marginTop: 8,
    },
    confirmationText: {
        fontSize: 14,
        color: '#000',
        marginBottom: 12,
        fontWeight: '500',
    },
    confirmationInput: {
        borderWidth: 1,
        borderColor: '#ff4444',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    confirmationButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingVertical: 12,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    confirmDeleteButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff4444',
        borderRadius: 8,
        paddingVertical: 12,
    },
    confirmDeleteButtonDisabled: {
        backgroundColor: '#ffcccc',
    },
    confirmDeleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    legalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    legalItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    legalItemText: {
        fontSize: 16,
        color: '#000',
        marginLeft: 12,
    },
}); 