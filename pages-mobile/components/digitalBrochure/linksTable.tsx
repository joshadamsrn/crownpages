// components/digitalBrochure/linksTable.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";

interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  image?: string;
}

interface LinksTableProps {
  links: LinkItem[];
  title?: string; // Optional custom title
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

// Map common icon names to valid Ionicons names
const getValidIconName = (iconName?: string): any => {
  if (!iconName) return 'link-outline';
  
  const iconMap: { [key: string]: string } = {
    'web': 'globe-outline',
    'instagram': 'logo-instagram',
    'facebook': 'logo-facebook',
    'twitter': 'logo-twitter',
    'linkedin': 'logo-linkedin',
    'youtube': 'logo-youtube',
    'tiktok': 'logo-tiktok',
    'file-pdf-box': 'document-outline',
    'pdf': 'document-outline',
    'file': 'document-outline',
    'document': 'document-outline',
    'email': 'mail-outline',
    'phone': 'call-outline',
    'location': 'location-outline',
    'map': 'map-outline',
    'calendar': 'calendar-outline',
    'link': 'link-outline',
  };
  
  // Check if it's in our map
  const lowerIconName = iconName.toLowerCase();
  if (iconMap[lowerIconName]) {
    return iconMap[lowerIconName];
  }
  
  // If it already ends with -outline, assume it's valid
  if (iconName.endsWith('-outline')) {
    return iconName;
  }
  
  // Try adding -outline
  return `${iconName}-outline`;
};

const LinksTable: React.FC<LinksTableProps> = ({ links, title = "Links" }) => {
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Force refresh when links change
  useEffect(() => {
    setRefreshKey(Date.now());
  }, [links]);

  const handleLinkPress = (url: string) => {
    // Links are disabled in mobile app - users should view in browser
    console.log("Link press disabled in mobile app:", url);
  };

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Links Container with border */}
      <View style={styles.linksContainer}>
        {links.map((link, index) => {
          const fullImageUrl = getImageUrl(link.image || '');

          return (
            <TouchableOpacity
              key={`${link.id}-${refreshKey}`}
              style={[
                styles.linkItem,
                index === links.length - 1 && styles.lastLinkItem
              ]}
              onPress={() => handleLinkPress(link.url)}
            >
              <View style={styles.linkLeft}>
                <View style={styles.linkIconContainer}>
                  {fullImageUrl ? (
                    <Image
                      source={{ uri: fullImageUrl, cache: 'reload' }}
                      style={styles.linkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name={getValidIconName(link.icon) as any}
                      size={24}
                      color="#666"
                    />
                  )}
                </View>
                <Text style={styles.linkText}>{link.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default LinksTable;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  sectionHeader: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  linksContainer: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  lastLinkItem: {
    borderBottomWidth: 0,
  },

  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkIconContainer: {
    width: 60,
    height: 50,
    borderRadius: 3,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  linkImage: {
    width: "100%",
    height: "100%",
  },
  linkText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "600",
  },
});
