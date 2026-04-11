import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { getIconForPlatform } from "@crown-pages/types";
import { PageSection } from "../../types/page-builder.types";

interface FeatureItem {
  icon?: string;
  title: string;
  description?: string;
}

interface FeaturesSectionProps {
  section: PageSection;
  styles?: any;
}

export function FeaturesSection({
  section,
  styles: customStyles,
}: FeaturesSectionProps) {
  const { data } = section;
  const features = (data.features as FeatureItem[]) || [];

  const renderFeature = ({ item }: { item: FeatureItem }) => (
    <View style={styles.featureItem}>
      {item.icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={getIconForPlatform(item.icon, "mobile") as any}
            size={32}
            color="#007AFF"
          />
        </View>
      )}
      <Text style={[styles.featureTitle, customStyles?.title]}>
        {item.title}
      </Text>
      {item.description && (
        <Text style={[styles.featureDescription, customStyles?.text]}>
          {item.description}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, customStyles?.container]}>
      {data.title && (
        <Text style={[styles.title, customStyles?.title]}>{data.title}</Text>
      )}
      <FlatList
        data={features}
        renderItem={renderFeature}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        columnWrapperStyle={features.length > 1 ? styles.row : undefined}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  row: {
    justifyContent: "space-between",
  },
  featureItem: {
    width: "48%",
    marginBottom: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
