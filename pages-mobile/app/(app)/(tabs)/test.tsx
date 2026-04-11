import SwipableModalComponent from "@/components/common/SwipableModal";
import { AboutSection } from "@/components/digitalBrochure/aboutSection";
import AmenitiesSection from "@/components/digitalBrochure/amenitiesSection";
import CompanyHeader from "@/components/digitalBrochure/companyHeader";
import ContactCard from "@/components/digitalBrochure/contact";
import ContactInfoPage from "@/components/digitalBrochure/contactInfoPage";
import MediaGallery from "@/components/digitalBrochure/gallery/mediaGallery";
import HeroSection from "@/components/digitalBrochure/heroSection";
import LinksTable from "@/components/digitalBrochure/linksTable";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const AbbingtonMurray = () => {
  const router = useRouter();
  const [contactModalVisible, setContactModalVisible] = useState(false);

  const data = {
    contactName: "Lindsay Snow",
    contactRole: "Sales Director",
    communityName: "The Abbington of Murray",
    address: "5377 South State Street, Murray, Utah, 84107",
    phone: "(301) 351-7750", // You can add actual phone number here
    email: "lindsay.snow@abbington.com", // You can add actual email here
  };

  const aboutText = `Our 108 independent assisted living & memory care apartments feature beautiful interiors with mountain views, spacious yet cozy apartments that will make you want to stay & enjoy all the luxury amenities the community of Abbington has to offer. Some highlights our residents enjoy the most include the Sundial Cream Parlor for gathering with friends, three gourmet meals served in a restaurant-style dining room, & luxuries like our library, full-service hair salon, great room, fitness center, movie theater room, & more. Whether you want to enjoy an independent lifestyle, need some additional support daily assistance from our nurses, or need the option of a Murray memory care unit, this is home.`;

  const handleContactPress = () => {
    setContactModalVisible(true);
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2C6BED" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#141414" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              The Abbington of Murray ehyaa
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="bookmark-outline" size={24} color="#141414" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="share-outline" size={24} color="#141414" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Image */}
          <HeroSection
            heroImageUrl="https://images.unsplash.com/photo-1761069234482-e3716e65dfae?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8&auto=format&fit=crop&q=60&w=500"
            logoUrl="https://images.unsplash.com/photo-1666304706996-e2c805459c34?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fHNrYXRlJTIwYmx1cnJlZHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=500"
          />

          {/* Content */}
          <View style={styles.contentContainer}>
            <CompanyHeader
              companyName={"The Abbington of Murray Assisted Living"}
              address={"5377 South State Street, Murray, Utah, 84107"}
              mapUrl={"5377 South State Street, Murray, Utah, 841074235346"}
            />

            {/* Contact Person */}

            {/* <SaveContactButton
              name="Lindsay Snow"
              phone="1233445676"
              email="m@m.k"
              address="The Abbington of Murray asasasas"
            /> */}
            <Contact
              Card
              name="Lindsay Snow"
              role="Marketer"
              imageUrl=""
            />

            {/* Photos & Videos Section */}

            <MediaGallery
              mediaItems={[
                {
                  id: "1",
                  url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
                  type: "video",
                },
                {
                  id: "2",
                  url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400",
                  type: "image",
                },
                {
                  id: "3",
                  url: "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=400",
                  type: "image",
                },
              ]}
            />

            <AboutSection aboutContent={aboutText} />

            {/* Amenities Section */}
            <AmenitiesSection
              amenities={[
                { id: "1", name: "Free Wi-Fi" },
                { id: "2", name: "Fitness Center" },
                { id: "3", name: "Swimming Pool" },
                { id: "4", name: "Free Parking" },
                { id: "5", name: "Pet Friendly" },
                { id: "6", name: "Spa & Wellness" },
                { id: "7", name: "Restaurant & Dining" },
                { id: "8", name: "24/7 Security" },
                { id: "9", name: "Laundry Services" },
                { id: "10", name: "Garden & Outdoor Space" },
              ]}
              itemsPerColumn={3}
            />

            {/* Links Section */}
            <View style={styles.section}>
              <LinksTable
                links={[
                  {
                    id: "1",
                    title: "Official Website",
                    url: "https://abbingtonmurray.com",
                    icon: "web",
                    image: "https://images.unsplash.com/photo-1613323593608-abc90fec84ff?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                  },
                  {
                    id: "2",
                    title: "Instagram",
                    url: "https://instagram.com/abbingtonmurray",
                    icon: "instagram",
                    image: "https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                  },
                  {
                    id: "3",
                    title: "Facebook",
                    url: "https://facebook.com/abbingtonmurray",
                    icon: "facebook",
                    image: "https://images.unsplash.com/photo-1760696155994-a62ecbb320a5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1165",
                  },
                  {
                    id: "4",
                    title: "Brochure PDF",
                    url: "https://example.com/brochure.pdf",
                    icon: "file-pdf-box",
                    image: "https://images.unsplash.com/photo-1757435555190-465de93201d4?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1074",
                  },
                ]}
              />

              {/* Contact Button */}
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactPress}
              >
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <SwipableModalComponent
        modalComparativeHeight={0.9}
        onClose={() => {
          setContactModalVisible(false);
        }}
        visible={contactModalVisible}
      >
        <ContactInfoPage userData={data} />
      </SwipableModalComponent>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000ff",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Hero Image
  heroImageContainer: {
    width: "100%",
    height: 250,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  heroBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#2C6BED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heroBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  contentContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 32,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rating: {
    fontSize: 16,
    color: "#FFB800",
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  address: {
    fontSize: 16,
    color: "#666666",
    flex: 1,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  contactStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
  },
  saveContactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2C6BED",
    gap: 8,
  },
  savedContactButton: {
    backgroundColor: "#2C6BED",
    borderColor: "#2C6BED",
  },
  saveContactText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C6BED",
  },
  savedContactText: {
    color: "#FFFFFF",
  },
  // Quick Actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  actionButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFF",
    minWidth: 72,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2C6BED",
    textAlign: "center",
  },
  // Rest of the styles...
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  seeAllText: {
    fontSize: 14,
    color: "#2C6BED",
    fontWeight: "600",
  },
  photoScroll: {
    marginTop: 8,
  },
  photoScrollContent: {
    paddingRight: 20,
  },
  photoThumbnail: {
    width: 160,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444444",
    marginBottom: 12,
  },
  readMoreButton: {
    paddingVertical: 8,
  },
  readMoreText: {
    fontSize: 16,
    color: "#2C6BED",
    fontWeight: "600",
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  amenityItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 20,
  },
  amenityIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  amenityIcon: {
    fontSize: 24,
  },
  amenityText: {
    fontSize: 13,
    color: "#1A1A1A",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },
  linksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  linksContainer: {
    backgroundColor: "#F8FAFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  linkIcon: {
    fontSize: 18,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  contactButton: {
    backgroundColor: "#63b5f7",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#63b5f7",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  contactButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default AbbingtonMurray;
