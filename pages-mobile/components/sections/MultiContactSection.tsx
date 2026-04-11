import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    Linking,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { PageSection } from '../../types/page-builder.types';

interface Phone {
    id: string;
    label: string;
    number: string;
}

interface Contact {
    id: string;
    name: string;
    title?: string;
    photo?: string;
    phones?: Phone[];
    email?: string;
    address?: string;
    fax?: string;
}

interface MultiContactSectionProps {
    section: PageSection;
    styles?: any;
}

export function MultiContactSection({ section, styles: customStyles }: MultiContactSectionProps) {
    const { data } = section;
    const [expandedContact, setExpandedContact] = useState<string | null>(null);

    if (!data.primaryContact || data.primaryContact.length === 0) {
        return null;
    }

    const primary = data.primaryContact[0];
    const additionalContacts = data.additionalContacts || [];

    const handlePhonePress = (number: string) => {
        // Deep linking disabled - phone links disabled in mobile app
        console.log("Phone link disabled:", number);
    };

    const handleEmailPress = (email: string) => {
        // Deep linking disabled - email links disabled in mobile app
        console.log("Email link disabled:", email);
    };

    const handleAddressPress = (address: string) => {
        // Deep linking disabled - map links disabled in mobile app
        console.log("Map link disabled:", address);
    };

    const handleShareContact = async (contact: Contact) => {
        try {
            const shareMessage = `${contact.name}${contact.title ? `\n${contact.title}` : ''}${
                contact.phones && contact.phones.length > 0
                    ? contact.phones.map(p => `\n${p.label}: ${p.number}`).join('')
                    : ''
            }${contact.email ? `\nEmail: ${contact.email}` : ''}${
                contact.address ? `\nAddress: ${contact.address}` : ''
            }`;

            await Share.share({
                message: shareMessage,
                title: `Contact: ${contact.name}`
            });
        } catch (error) {
            console.error('Error sharing contact:', error);
        }
    };

    const renderContactCard = (contact: Contact, isPrimary: boolean = false) => {
        const isExpanded = expandedContact === contact.id;
        const hasExpandableContent = 
            (contact.phones && contact.phones.length > 1) || 
            contact.address || 
            contact.fax;

        return (
            <View key={contact.id} style={[
                styles.contactCard, 
                isPrimary && styles.primaryCard,
                customStyles?.contactCard
            ]}>
                {/* Contact Header */}
                <View style={styles.contactHeader}>
                    {/* Photo */}
                    {contact.photo && (
                        <View style={styles.photoContainer}>
                            <Image
                                source={{ uri: contact.photo }}
                                style={styles.contactPhoto}
                                defaultSource={require('../../../assets/images/partial-react-logo.png')}
                            />
                        </View>
                    )}

                    {/* Contact Info */}
                    <View style={styles.contactInfo}>
                        <Text style={[
                            styles.contactName, 
                            isPrimary && styles.primaryName,
                            customStyles?.contactName
                        ]}>
                            {contact.name}
                        </Text>
                        {contact.title && (
                            <Text style={[styles.contactTitle, customStyles?.contactTitle]}>
                                {contact.title}
                            </Text>
                        )}

                        {/* Primary Actions */}
                        <View style={styles.primaryActions}>
                            {contact.phones && contact.phones.length > 0 && (
                                <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={() => handlePhonePress(contact.phones![0].number)}
                                >
                                    <Ionicons name="call" size={16} color="#007AFF" />
                                    <Text style={styles.actionText}>{contact.phones[0].label}</Text>
                                </TouchableOpacity>
                            )}

                            {contact.email && (
                                <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={() => handleEmailPress(contact.email!)}
                                >
                                    <Ionicons name="mail" size={16} color="#007AFF" />
                                    <Text style={styles.actionText}>Email</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Expand/Share buttons */}
                    <View style={styles.contactActions}>
                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={() => handleShareContact(contact)}
                        >
                            <Ionicons name="share-outline" size={20} color="#007AFF" />
                        </TouchableOpacity>

                        {hasExpandableContent && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setExpandedContact(isExpanded ? null : contact.id)}
                            >
                                <Ionicons 
                                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                                    size={20} 
                                    color="#007AFF" 
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Expandable Content */}
                {isExpanded && hasExpandableContent && (
                    <View style={styles.expandedContent}>
                        {/* Additional Phone Numbers */}
                        {contact.phones && contact.phones.length > 1 && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.expandedSectionTitle}>Additional Numbers</Text>
                                {contact.phones.slice(1).map((phone) => (
                                    <TouchableOpacity
                                        key={phone.id}
                                        style={styles.expandedItem}
                                        onPress={() => handlePhonePress(phone.number)}
                                    >
                                        <Ionicons name="call-outline" size={20} color="#007AFF" />
                                        <View style={styles.expandedItemText}>
                                            <Text style={styles.expandedItemLabel}>{phone.label}</Text>
                                            <Text style={styles.expandedItemValue}>{phone.number}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Address */}
                        {contact.address && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.expandedSectionTitle}>Address</Text>
                                <TouchableOpacity
                                    style={styles.expandedItem}
                                    onPress={() => handleAddressPress(contact.address!)}
                                >
                                    <Ionicons name="location-outline" size={20} color="#007AFF" />
                                    <View style={styles.expandedItemText}>
                                        <Text style={styles.expandedItemValue}>{contact.address}</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Fax */}
                        {contact.fax && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.expandedSectionTitle}>Fax</Text>
                                <View style={styles.expandedItem}>
                                    <Ionicons name="document-text-outline" size={20} color="#007AFF" />
                                    <View style={styles.expandedItemText}>
                                        <Text style={styles.expandedItemValue}>{contact.fax}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, customStyles?.container]}>
            {data.title && (
                <Text style={[styles.title, customStyles?.title]}>{data.title}</Text>
            )}

            {/* Primary Contact */}
            {renderContactCard(primary, true)}

            {/* Additional Contacts */}
            {additionalContacts.length > 0 && (
                <View style={styles.additionalContacts}>
                    <View style={styles.additionalHeader}>
                        <Ionicons name="people-outline" size={20} color="#666" />
                        <Text style={styles.additionalTitle}>Additional Contacts</Text>
                    </View>
                    {additionalContacts.map((contact: Contact) => renderContactCard(contact, false))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    contactCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    primaryCard: {
        backgroundColor: '#fff',
        borderColor: '#007AFF',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    photoContainer: {
        flexShrink: 0,
    },
    contactPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e9ecef',
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    primaryName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    contactTitle: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '500',
        marginBottom: 8,
    },
    primaryActions: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#007AFF',
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    contactActions: {
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
    },
    shareButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f8ff',
    },
    expandButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f0f8ff',
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    expandedSection: {
        marginBottom: 16,
    },
    expandedSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    expandedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        gap: 12,
    },
    expandedItemText: {
        flex: 1,
    },
    expandedItemLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    expandedItemValue: {
        fontSize: 14,
        color: '#666',
    },
    additionalContacts: {
        marginTop: 20,
    },
    additionalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    additionalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
});
