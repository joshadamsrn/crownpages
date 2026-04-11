import { supabase } from "@/utils/supabase";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CompanyHeader from "./companyHeader";
import HeroSection from "./heroSection";
import SaveContactButton from "./saveContactButton";

interface BrochureData {
  heroImageUrl: string;
  logoUrl: string;
  companyName: string;
  address?: string;
  mapUrl?: string;
  contactInfo?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
}

interface DigitalBrochureProps {
  pageId: string;
}

const DigitalBrochure = ({ pageId, sections: initialSections = [] }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brochureData, setBrochureData] = useState<BrochureData>({
    heroImageUrl: "",
    logoUrl: "",
    companyName: "",
    address: "",
    mapUrl: "",
    contactInfo: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("pages")
          .select(
            `
            id,
            title,
            content,
            business:businesses(id, name, slug, address)
          `
          )
          .eq("id", pageId)
          .single();

        console.log("data of pages that we want", data);

        if (error) throw error;
        if (!data) {
          setError("Page not found");
          return;
        }

        const businessData = data.business as any;

        const heroSection = data.content?.sections?.find(
          (s: any) => s.type === "hero"
        );
        const contactSection = data.content?.sections?.find(
          (s: any) => s.type === "contact"
        );

        const formattedData: BrochureData = {
          heroImageUrl: heroSection?.data?.backgroundImage || "",
          logoUrl: heroSection?.data?.logoUrl || "",
          companyName: businessData?.name || "Untitled",
          address: contactSection?.data?.address || businessData?.address || "",
          mapUrl: contactSection?.data?.mapUrl || "",
          contactInfo: {
            name: businessData?.name,
            phone: contactSection?.data?.phone,
            email: contactSection?.data?.email,
            address: businessData?.address,
          },
        };

        setBrochureData(formattedData);
      } catch (err: any) {
        console.error("Error fetching page data:", err);
        setError(err.message || "Failed to load brochure data");
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      fetchPageData();
    }
  }, [pageId]);

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading brochure...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <HeroSection
          heroImageUrl={brochureData.heroImageUrl}
          logoUrl={brochureData.logoUrl}
        />

        <CompanyHeader
          companyName={brochureData.companyName}
          address={brochureData.address}
          mapUrl={brochureData.mapUrl}
        />

        <SaveContactButton
          name={brochureData.contactInfo?.name!}
          phone={brochureData.contactInfo?.phone}
          email={brochureData.contactInfo?.email}
          address={brochureData.contactInfo?.address}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
});

export default DigitalBrochure;
