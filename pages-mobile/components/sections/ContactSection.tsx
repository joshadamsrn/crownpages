import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageSection } from '../../types/page-builder.types';

interface ContactSectionProps {
  section: PageSection;
  styles?: any;
}

export function ContactSection({ section, styles: customStyles }: ContactSectionProps) {
  const { data } = section;

  const handlePhonePress = () => {
    // Deep linking disabled - phone links disabled in mobile app
    console.log("Phone link disabled:", data.phone);
  };

  const handleEmailPress = () => {
    // Deep linking disabled - email links disabled in mobile app
    console.log("Email link disabled:", data.email);
  };

  const handleAddressPress = () => {
    // Deep linking disabled - map links disabled in mobile app
    console.log("Map link disabled:", data.address);
  };

  return (
    <View style={[styles.container, customStyles?.container]}>
      {data.title && (
        <Text style={[styles.title, customStyles?.title]}>{data.title}</Text>
      )}

      <View style={styles.contactItems}>
        {data.phone && (
          <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
            <View style={styles.iconContainer}>
              <Ionicons name="call-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{data.phone}</Text>
            </View>
          </TouchableOpacity>
        )}

        {data.email && (
          <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>{data.email}</Text>
            </View>
          </TouchableOpacity>
        )}

        {data.address && (
          <TouchableOpacity style={styles.contactItem} onPress={handleAddressPress}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>
                {data.address.street}
                {data.address.city && `\n${data.address.city}, ${data.address.state} ${data.address.zip}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {data.hours && (
          <View style={styles.contactItem}>
            <View style={styles.iconContainer}>
              <Ionicons name="time-outline" size={24} color="#007AFF" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Business Hours</Text>
              {Object.entries(data.hours).map(([day, hours]: [string, any]) => (
                <Text key={day} style={styles.hoursText}>
                  {day}: {hours.open} - {hours.close}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  contactItems: {
    gap: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
}); 