// components/digitalBrochure/contactInfoPage.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ContactInfoPageProps {
  userData: {
    contactName?: string;
    contactRole?: string;
    phone?: string;
    email?: string;
    fax?: string;
    personalPhone?: string;
    link?: string;
    logo?: string;
    communityName?: string;
    address?: string;
  };
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

const ContactInfoPage: React.FC<ContactInfoPageProps> = ({ userData }) => {
  const router = useRouter();
  const [logoKey, setLogoKey] = useState(Date.now());

  // Get data from userData prop
  const {
    contactName,
    contactRole,
    phone,
    email,
    fax,
    personalPhone,
    link,
    logo,
  } = userData;

  const fullLogoUrl = getImageUrl(logo || '');

  // Force refresh when logo changes
  useEffect(() => {
    setLogoKey(Date.now());
  }, [logo]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Contact Information</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close-circle-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            {fullLogoUrl ? (
              <View style={styles.logoCircle}>
                <Image
                  key={logoKey}
                  source={{ uri: fullLogoUrl, cache: 'reload' }}
                  style={styles.logo}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={[styles.logoCircle, { justifyContent: "center" }]}>
                <Ionicons
                  name="person-circle-outline"
                  size={100}
                  color="#003366"
                />
              </View>
            )}
          </View>

          {/* Name & Role */}
          <Text style={styles.name}>{contactName}</Text>
          {contactRole && <Text style={styles.role}>{contactRole}</Text>}

          {/* Contact Details */}
          <View style={styles.contactDetails}>
            {phone && (
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="call" size={24} color="#1a5490" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Main Office</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </View>
            )}
            {personalPhone && (
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="call" size={24} color="#1a5490" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Personal</Text>
                  <Text style={styles.infoValue}>{personalPhone}</Text>
                </View>
              </View>
            )}
            {email && (
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail" size={24} color="#1a5490" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>
            )}
            {fax && (
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="print" size={24} color="#1a5490" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Fax</Text>
                  <Text style={styles.infoValue}>{fax}</Text>
                </View>
              </View>
            )}
            {link && (
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="globe" size={24} color="#1a5490" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.infoLabel}>Website</Text>
                  <Text style={styles.infoValue}>{link}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#000" },
  closeButton: { padding: 4 },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: 'hidden',
  },
  logo: { 
    width: "100%", 
    height: "100%",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#003366",
    marginBottom: 8,
  },
  role: { fontSize: 16, textAlign: "center", color: "#666", marginBottom: 24 },
  contactDetails: { marginBottom: 24 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  iconContainer: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContainer: { flex: 1 },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: { 
    fontSize: 16, 
    color: "#1a5490",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#003366",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});

export default ContactInfoPage;
