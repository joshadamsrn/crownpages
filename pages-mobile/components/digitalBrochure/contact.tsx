import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { saveContact } from "./saveContactButton"; // Assuming this function is available for saving contacts

interface ContactCardProps {
  name: string;
  role?: string;
  imageUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

const ContactCard: React.FC<ContactCardProps> = ({ name, role, imageUrl, phone, email, address }) => {
  const [isContactSaved, setIsContactSaved] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  // Force refresh when image URL changes
  useEffect(() => {
    setImageKey(Date.now());
  }, [imageUrl]);

  // Function to handle save contact status change - NOW USES DYNAMIC DATA!
  const handleSaveContact = () => {
    // Use the actual props data, not hardcoded values
    const contactName = name || "Contact Person";
    const contactPhone = phone || "";
    const contactEmail = email || "";
    const contactAddress = address || "";

    // Trigger the save contact function with actual data
    saveContact(contactName, contactAddress, contactPhone, contactEmail);

    // Update save state to show "Saved"
    setIsContactSaved(true);
  };

  const fullImageUrl = getImageUrl(imageUrl || '');

  return (
    <View style={styles.contactCard}>
      {/* Contact Image */}
      {fullImageUrl ? (
        <Image
          key={imageKey}
          source={{ uri: fullImageUrl, cache: 'reload' }}
          style={styles.contactImage}
        />
      ) : (
        <View style={[styles.contactImage, styles.placeholderImage]}>
          <Ionicons name="person-outline" size={32} color="#ccc" />
        </View>
      )}

      {/* Contact Info */}
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{name}</Text>
        {role && <Text style={styles.contactRole}>{role}</Text>}
      </View>

      {/* Save Contact Button */}
      <TouchableOpacity
        style={[
          styles.saveContactButton,
          isContactSaved && styles.savedContactButton,
        ]}
        onPress={handleSaveContact}
      >
        <Ionicons
          name={isContactSaved ? "checkmark" : "person-add-outline"}
          size={20}
          color={isContactSaved ? "#FFFFFF" : "#000000"}
        />
        <Text
          style={[
            styles.saveContactText,
            isContactSaved && styles.savedContactText,
          ]}
        >
          {isContactSaved ? "Saved" : "Save Contact"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contactCard: {
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: 0,
    backgroundColor: "#fff",
    marginVertical: 10,
  },
  contactImage: {
    width: 70,
    height: 90,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1, 
    justifyContent: "center",
  },
  contactName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  contactRole: {
    fontSize: 16,
    color: "#666",
  },
  saveContactButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#c5c3c3ff",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  saveContactText: {
    color: "#000000",
    fontWeight: "600",
    marginLeft: 6,
  },
  savedContactButton: {
    backgroundColor: "#000000", 
  },
  savedContactText: {
    color: "#FFFFFF",
  },
});

export default ContactCard;
