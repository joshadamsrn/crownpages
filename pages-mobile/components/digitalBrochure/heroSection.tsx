// components/digitalBrochure/heroSection.tsx
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface HeroSectionProps {
  heroImageUrl: string;
  logoUrl: string;
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  // Add Supabase public URL
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

const HeroSection: React.FC<HeroSectionProps> = ({ heroImageUrl, logoUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [heroKey, setHeroKey] = useState(Date.now());
  const [logoKey, setLogoKey] = useState(Date.now());

  // Force refresh when URLs change
  useEffect(() => {
    setHeroKey(Date.now());
    setIsLoading(true);
  }, [heroImageUrl]);

  useEffect(() => {
    setLogoKey(Date.now());
  }, [logoUrl]);

  const fullHeroUrl = getImageUrl(heroImageUrl);
  const fullLogoUrl = getImageUrl(logoUrl);

  return (
    <View style={styles.container}>
      {fullHeroUrl ? (
        <>
          <Image
            key={heroKey}
            source={{ uri: fullHeroUrl, cache: 'reload' }}
            style={styles.heroImage}
            resizeMode="cover"
            onLoadEnd={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
        </>
      ) : (
        <View style={styles.noImageContainer}>
          <Ionicons name="image-outline" size={48} color="#999" />
          <Text style={styles.noImageText}>No Hero Image</Text>
        </View>
      )}

      {fullLogoUrl ? (
        <View style={styles.logoContainer}>
          <Image
            key={logoKey}
            source={{ uri: fullLogoUrl, cache: 'reload' }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      ) : null}
    </View>
  );
};

export default HeroSection;

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    height: 200, // Adjust based on design needs
    backgroundColor: "#f0f0f0",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  noImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  noImageText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  logoContainer: {
    position: "absolute",
    bottom: -30, // Half the height of the logo to overlap
    left: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 60,
    height: 60,
  },
});
