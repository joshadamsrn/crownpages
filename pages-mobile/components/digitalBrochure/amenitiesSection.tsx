// components/digitalBrochure/amenitiesSection.tsx
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Amenity {
  id: string;
  name: string;
  icon?: string; // optional, for backwards compatibility but not used
}

interface AmenitiesSectionProps {
  amenities: Amenity[];
  itemsPerColumn?: number; // How many items per column, default 3
  title?: string; // Optional custom title
}

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
  amenities,
  itemsPerColumn = 3,
  title = "Amenities" // Default title
}) => {
  const [showAll, setShowAll] = useState(false);

  // Show only 6 items initially (2 columns × 3 items)
  const displayLimit = 6;
  const displayedAmenities = showAll ? amenities : amenities.slice(0, displayLimit);

  // Split amenities into 2 columns
  const splitIntoColumns = (items: Amenity[]) => {
    const column1: Amenity[] = [];
    const column2: Amenity[] = [];

    items.forEach((item, index) => {
      if (index % 2 === 0) {
        column1.push(item);
      } else {
        column2.push(item);
      }
    });

    return [column1, column2];
  };

  const [column1, column2] = splitIntoColumns(displayedAmenities);

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Amenities List in 2 Columns */}
      <View style={styles.columnsContainer}>
        <View style={styles.column}>
          {column1.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.amenityText}>{item.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.column}>
          {column2.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.amenityText}>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* More Button */}
      {amenities.length > displayLimit && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowAll(!showAll)}
        >
          <Text style={styles.moreText}>
            {showAll ? "Less" : "More"}
          </Text>
          <Ionicons
            name={showAll ? "chevron-up" : "chevron-down"}
            size={16}
            color="#000"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default AmenitiesSection;

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  columnsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  column: {
    width: "48%",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet: {
    fontSize: 18,
    color: "#000",
    marginRight: 8,
    marginTop: 0,
    fontWeight: "bold",
  },
  amenityText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
    lineHeight: 22,
  },
  moreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
  },
  moreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
