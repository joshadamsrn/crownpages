// components/digitalBrochure/companyHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CompanyHeaderProps {
  companyName: string;
  address?: string;
  mapUrl?: string;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  companyName,
  address,
  mapUrl,
}) => {
  const handleAddressPress = () => {
    // Deep linking disabled - map links disabled in mobile app
    console.log("Map link disabled:", mapUrl);
  };

  return (
    <View style={styles.container}>
      {/* Company Name */}
      <Text style={styles.companyName}>
        {companyName || "Unnamed Business"}
      </Text>

      {/* Address */}
      {address ? (
        <TouchableOpacity
          onPress={handleAddressPress}
          style={styles.addressContainer}
          disabled={!mapUrl}
        >
          <Text style={styles.address}>
            {address}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.noAddress}>Address not available</Text>
      )}
    </View>
  );
};

export default CompanyHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  companyName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  address: {
    fontSize: 15,
    color: "#555",
    marginLeft: 6,
    lineHeight: 20,
    textDecorationLine: "none",
  },
  noAddress: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
