import AppHeader from "@/components/common/AppHeader";
import Loader from "@/components/common/Loader";
import { Business } from "@/types/page-builder.types";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { debounce } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { supabase } from "../../utils/supabase";

const SECTION_DEFAULT_STYLES = {
  primary: "",
  secondary: "",
  background: "",
  text: {
    primary: "",
    secondary: "",
    muted: "",
  },
};

// Default comprehensive template
const COMPREHENSIVE_TEMPLATE = {
  id: "comprehensive",
  name: "All-in-One Template",
  description:
    "Includes all available sections - customize or remove as needed",
  sections: [
    {
      id: "temp_hero_1",
      type: "hero",
      data: {
        title: "Welcome to Your Business",
        subtitle: "Your tagline or mission statement here",
        ctaButton: { text: "Get Started", link: "tel:" },
      },
      styles: SECTION_DEFAULT_STYLES,
    },
    {
      id: "temp_about_1",
      type: "about",
      data: {
        title: "About Us",
        content:
          "Tell your story here. What makes your business unique? What are your values and mission?",
        image: null,
      },
      styles: SECTION_DEFAULT_STYLES,
    },
    {
      id: "temp_contact_1",
      type: "contact",
      data: {
        title: "Get In Touch",
        phone: "",
        email: "",
        address: "",
      },
      styles: SECTION_DEFAULT_STYLES,
    },
    // {
    //   id: "temp_amenities_1",
    //   type: "personalContact",
    //   data: {
    //     name: "",
    //     title: "",
    //     phone: "",
    //     email: "",
    //     photo: null,
    //     website: "",
    //     bio: "",
    //     customLinks: [],
    //   },
    //   styles: SECTION_DEFAULT_STYLES,
    // },
    {
      id: "temp_multi_contact_1",
      type: "multiContact",
      data: {
        title: "Contact Our Team",
        businessInfo: [
          {
            id: "business_1",
            name: "Your Business Name",
            address: "123 Main Street, City, State 12345",
            phone: "(555) 123-4567",
            fax: "(555) 123-4568",
            email: "info@business.com",
            website: "https://www.yourbusiness.com",
          },
        ],
        contactPersons: [
          {
            id: "contact_1",
            name: "John Smith",
            title: "Sales Manager",
            photo: null,
            phone: "(555) 123-4567",
            email: "john@business.com",
            extension: "123",
          },
        ],
      },
      styles: SECTION_DEFAULT_STYLES,
    },
  ],
};

const TEMPLATES = [
  {
    ...COMPREHENSIVE_TEMPLATE,
    icon: "layers-outline",
  },
  {
    id: "business-simple",
    name: "Simple Business",
    description: "Perfect for local businesses - hero, about, contact",
    icon: "storefront-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Welcome to Your Business",
          subtitle: "Your tagline or mission statement here",
          ctaButton: { text: "Contact Us", link: "tel:" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_about_1",
        type: "about",
        data: {
          title: "About Us",
          content: "Tell your story here. What makes your business unique?",
          image: null,
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_contact_1",
        type: "contact",
        data: {
          title: "Get In Touch",
          phone: "",
          email: "",
          address: "",
        },
        styles: SECTION_DEFAULT_STYLES,
      },
    ],
  },
  {
    id: "personal-portfolio",
    name: "Personal Portfolio",
    description: "Showcase yourself - personal contact, about, gallery",
    icon: "person-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Your Name Here",
          subtitle: "Your profession or passion",
          ctaButton: { text: "View My Work", link: "#gallery" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      // {
      //   id: "temp_personal_contact_1",
      //   type: "personalContact",
      //   data: {
      //     name: "",
      //     title: "",
      //     phone: "",
      //     email: "",
      //     photo: null,
      //     website: "",
      //     bio: "",
      //     customLinks: [],
      //   },
      //   styles: SECTION_DEFAULT_STYLES,
      // },
      {
        id: "temp_about_1",
        type: "about",
        data: {
          title: "About Me",
          content:
            "Share your story, background, and what you're passionate about.",
          image: null,
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      // {
      //   id: "temp_gallery_1",
      //   type: "gallery",
      //   data: {
      //     title: "My Work",
      //     images: [],
      //     videos: [],
      //   },
      //   styles: SECTION_DEFAULT_STYLES,
      // },
    ],
  },
  {
    id: "restaurant-menu",
    name: "Restaurant & Food",
    description: "Perfect for restaurants - hero, about, gallery, contact",
    icon: "restaurant-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Welcome to [Restaurant Name]",
          subtitle:
            "Authentic flavors, fresh ingredients, unforgettable experience",
          ctaButton: { text: "View Menu", link: "#gallery" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_about_1",
        type: "about",
        data: {
          title: "Our Story",
          content:
            "Share your restaurant's history, chef's background, and culinary philosophy.",
          image: null,
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_gallery_1",
        type: "gallery",
        data: {
          title: "Our Menu & Atmosphere",
          images: [],
          videos: [],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_contact_1",
        type: "contact",
        data: {
          title: "Visit Us",
          phone: "",
          email: "",
          address: "",
        },
        styles: SECTION_DEFAULT_STYLES,
      },
    ],
  },
  {
    id: "service-provider",
    name: "Service Provider",
    description: "For professionals - features, testimonials, contact, FAQ",
    icon: "build-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Professional [Service] You Can Trust",
          subtitle: "Quality service with years of experience",
          ctaButton: { text: "Get Quote", link: "tel:" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_features_1",
        type: "features",
        data: {
          title: "Why Choose Us",
          features: [
            {
              id: "temp_feature_1",
              icon: "checkmark-circle",
              title: "Licensed & Insured",
              description: "Fully licensed and insured for your peace of mind",
            },
            {
              id: "temp_feature_2",
              icon: "time",
              title: "Fast Response",
              description: "Quick response times and flexible scheduling",
            },
            {
              id: "temp_feature_3",
              icon: "star",
              title: "5-Star Reviews",
              description: "Consistently rated 5 stars by our customers",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_testimonials_1",
        type: "testimonials",
        data: {
          title: "What Our Customers Say",
          testimonials: [
            {
              id: "temp_testimonial_1",
              name: "Sarah Johnson",
              position: "Homeowner",
              text: "Excellent work and very professional. Highly recommend!",
              rating: 5,
              avatar: "",
              asset_type: "",
              video_uri: "",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_faq_1",
        type: "faq",
        data: {
          title: "Frequently Asked Questions",
          questions: [
            {
              id: "temp_question_1",
              question: "Do you provide free estimates?",
              answer:
                "Yes! We provide free, no-obligation estimates for all services.",
            },
            {
              id: "temp_question_2",
              question: "Are you licensed and insured?",
              answer:
                "Absolutely. We are fully licensed and carry comprehensive insurance.",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_contact_1",
        type: "contact",
        data: {
          title: "Get Your Free Quote",
          phone: "",
          email: "",
          address: "",
        },
        styles: SECTION_DEFAULT_STYLES,
      },
    ],
  },
  {
    id: "healthcare-provider",
    name: "Healthcare & Medical",
    description: "For medical practices - services, links, contact, FAQ",
    icon: "medical-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Quality Healthcare You Deserve",
          subtitle: "Compassionate care with the latest medical technology",
          ctaButton: { text: "Book Appointment", link: "tel:" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_about_1",
        type: "about",
        data: {
          title: "About Our Practice",
          content:
            "Share your practice's mission, doctor credentials, and commitment to patient care.",
          image: null,
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_faq_1",
        type: "faq",
        data: {
          title: "Patient Information",
          questions: [
            {
              id: "temp_question_1",
              question: "What should I bring to my appointment?",
              answer:
                "Please bring your insurance card, ID, and any relevant medical records.",
            },
            {
              id: "temp_question_2",
              question: "Do you accept walk-ins?",
              answer:
                "We prefer appointments but accept walk-ins based on availability.",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_contact_1",
        type: "contact",
        data: {
          title: "Schedule Your Visit",
          phone: "",
          email: "",
          address: "",
        },
        styles: SECTION_DEFAULT_STYLES,
      },
    ],
  },
  {
    id: "event-planning",
    name: "Event & Wedding",
    description: "For event planners - gallery, testimonials, packages",
    icon: "calendar-outline",
    sections: [
      {
        id: "temp_hero_1",
        type: "hero",
        data: {
          title: "Creating Unforgettable Moments",
          subtitle: "Let us make your special day perfect",
          ctaButton: { text: "View Portfolio", link: "#gallery" },
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_gallery_1",
        type: "gallery",
        data: {
          title: "Our Work",
          images: [],
          videos: [],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_features_1",
        type: "features",
        data: {
          title: "Our Services",
          features: [
            {
              id: "temp_feature_1",
              icon: "heart",
              title: "Wedding Planning",
              description: "Full-service wedding planning from start to finish",
            },
            {
              id: "temp_feature_2",
              icon: "star",
              title: "Corporate Events",
              description: "Professional corporate event management",
            },
            {
              id: "temp_feature_3",
              icon: "sparkles",
              title: "Special Occasions",
              description:
                "Birthdays, anniversaries, and milestone celebrations",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_testimonials_1",
        type: "testimonials",
        data: {
          title: "Happy Clients",
          testimonials: [
            {
              id: "temp_testimonial_1",
              name: "Emily & James",
              position: "Wedding Clients",
              text: "Our wedding was absolutely perfect! Every detail was handled beautifully.",
              rating: 5,
              avatar: "",
              asset_type: "",
              video_uri: "",
            },
          ],
        },
        styles: SECTION_DEFAULT_STYLES,
      },
      {
        id: "temp_contact_1",
        type: "contact",
        data: {
          title: "Let's Plan Your Event",
          phone: "",
          email: "",
          address: "",
        },
        styles: SECTION_DEFAULT_STYLES,
      },
    ],
  },
  {
    id: "blank",
    name: "Blank Page",
    description: "Start from scratch with no pre-built sections",
    icon: "document-outline",
    sections: [],
  },
];

export default function CreatePageScreen() {
  const { session } = useAuth();
  const { hasExpiredTrial, hasProAccess } = useSubscription();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState(
    (params.businessId as string) || ""
  );
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null
  );
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced slug validation states
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: "" });
  const [showSlugInfoModal, setShowSlugInfoModal] = useState(false);

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(
    debounce(async (slugToCheck: string) => {
      if (!slugToCheck || !businessId) {
        setSlugAvailability({ available: null, message: "" });
        setIsCheckingSlug(false);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from("pages")
          .select("id")
          .eq("slug", slugToCheck)
          .eq("business_id", businessId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSlugAvailability({
            available: false,
            message: "This page URL is already used in your business",
          });
        } else {
          setSlugAvailability({
            available: true,
            message: "Perfect! This page URL is available",
          });
        }
      } catch (error) {
        console.error("Error checking slug availability:", error);
        setSlugAvailability({
          available: false,
          message: "Error checking availability",
        });
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500),
    [businessId]
  );

  // Format slug (lowercase, replace spaces with hyphens, remove special chars)
  const formatSlug = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  const handleSlugChange = (text: string) => {
    const formattedSlug = formatSlug(text);
    setSlug(formattedSlug);
    setSlugError(null);

    if (formattedSlug && businessId) {
      checkSlugAvailability(formattedSlug);
    } else {
      setSlugAvailability({ available: null, message: "" });
    }
  };

  const getSlugStatusColor = () => {
    if (slugAvailability.available === true) return "#10B981";
    if (slugAvailability.available === false) return "#EF4444";
    return "#6B7280";
  };

  const getSlugStatusIcon = () => {
    if (isCheckingSlug) return "time-outline";
    if (slugAvailability.available === true) return "checkmark-circle";
    if (slugAvailability.available === false) return "close-circle";
    return "information-circle-outline";
  };

  // Reset form function to clear all form data
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSlug("");
    setSlugError(null);
    setSelectedTemplate(TEMPLATES[0]); // Default to All-in-One template
    setSlugAvailability({ available: null, message: "" });
  };

  // Reset form when component mounts or when route changes
  useEffect(() => {
    resetForm();
  }, []);

  // Re-check slug availability when business changes
  useEffect(() => {
    if (slug && businessId) {
      checkSlugAvailability(slug);
    }
  }, [businessId, checkSlugAvailability]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select(`*`)
          .eq("owner_id", session?.user.id)
          .order("created_at", { ascending: false });

        if (error && error.code !== "PGRST116") throw error;

        if (data && data.length > 0) {
          setBusinesses(data);

          // If business ID is provided via params, find and set that business
          if (businessId) {
            const business = data.find((b) => b.id === businessId);
            if (business) {
              setSelectedBusiness(business);
            }
          } else if (data.length === 1) {
            // If only one business, auto-select it
            setSelectedBusiness(data[0]);
            setBusinessId(data[0].id);
          } else {
            // Multiple businesses, show selector
            setShowBusinessSelector(true);
          }
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        Alert.alert("Error", "Failed to load businesses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [businessId, session?.user.id]);

  // Check if a slug is unique for the business
  const checkSlugUnique = async (slug: string): Promise<boolean> => {
    if (!slug) return false;
    const { data, error } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", slug)
      .eq("business_id", businessId);
    return !data || data.length === 0;
  };

  const createPage = async () => {
    // Check if user is inactive (expired trial) before creating
    if (hasExpiredTrial) {
      Alert.alert(
        "Account Inactive",
        "Your free trial has expired. Upgrade to Crown Pages Pro to create pages.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/(app)/plans"),
          },
        ]
      );
      return;
    }

    // Check if user has Pro access
    if (!hasProAccess) {
      Alert.alert(
        "Pro Plan Required",
        "Upgrade to Crown Pages Pro to create pages.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/(app)/plans"),
          },
        ]
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a page title");
      return;
    }
    if (!businessId) {
      Alert.alert("Error", "Please select a business");
      return;
    }
    // Enhanced slug validation
    if (!slug.trim()) {
      setSlugError("Page unique link/slug is required");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("Only lowercase letters, numbers, and dashes are allowed");
      return;
    }
    if (slugAvailability.available === false) {
      setSlugError("This page link/slug is already taken for this business");
      return;
    }
    setSlugError(null);
    setIsCreating(true);
    try {
      // Check slug uniqueness one more time before creating
      const isUnique = await checkSlugUnique(slug);
      if (!isUnique) {
        setSlugError("This page link/slug is already taken for this business");
        setIsCreating(false);
        return;
      }
      // Create page with selected template
      const { data, error } = await supabase
        .from("pages")
        .insert({
          title,
          description,
          slug,
          business_id: businessId,
          created_by: session?.user?.id,
          content: { sections: selectedTemplate.sections },
          is_published: false,
        })
        .select()
        .single();
      if (error) throw error;
      // Navigate to editor
      router.replace(`/(app)/page-editor/${data.id}` as any);
    } catch (error) {
      console.error("Error creating page:", error);
      Alert.alert("Error", "Failed to create page");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    setSelectedBusiness(business);
    setBusinessId(business.id);
    setShowBusinessSelector(false);
  };

  const selectTemplate = (template: (typeof TEMPLATES)[0]) => {
    setSelectedTemplate(template);
    setShowTemplateModal(false);
  };

  const renderBusinessItem = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessItem}
      onPress={() => handleBusinessSelect(item)}
    >
      <View style={styles.businessInfo}>
        <Text style={styles.businessName}>{item.name}</Text>
        <Text style={styles.businessEmail}>{item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppHeader title="Create New Page" />

        <View style={styles.contentContainer}>
          <KeyboardAvoidingView
            style={styles.content}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Page Title</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g., Welcome to Smith Dental"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Brief description of your page"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Business</Text>
                  <TouchableOpacity
                    style={styles.selector}
                    onPress={() =>
                      businesses.length > 1 && setShowBusinessSelector(true)
                    }
                  >
                    <Text style={styles.selectorText}>
                      {selectedBusiness
                        ? selectedBusiness.name
                        : "Select a business"}
                    </Text>
                    {businesses.length > 1 && (
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.slugHeader}>
                    <Text style={styles.label}>🔗 Page URL</Text>
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() => setShowSlugInfoModal(true)}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={24}
                        color="#007AFF"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* URL Preview */}
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>
                      Your page will be available at:
                    </Text>
                    <View style={styles.urlPreview}>
                      <Text style={styles.urlPrefix}>crownpages.com/</Text>
                      <Text style={[styles.urlSlug, { color: "#666" }]}>
                        {selectedBusiness?.slug || "business-name"}/
                      </Text>
                      <Text
                        style={[
                          styles.urlSlug,
                          { color: slug ? "#007AFF" : "#999" },
                        ]}
                      >
                        {slug || "page-name"}
                      </Text>
                    </View>
                  </View>

                  {/* Slug Input */}
                  <TextInput
                    style={[
                      styles.input,
                      styles.slugInput,
                      {
                        borderColor:
                          slugAvailability.available === false
                            ? "#EF4444"
                            : slugAvailability.available === true
                            ? "#10B981"
                            : "#DDD",
                      },
                    ]}
                    value={slug}
                    onChangeText={handleSlugChange}
                    placeholder="page-name"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {/* Status Message */}
                  {(slugAvailability.message || isCheckingSlug) && (
                    <View style={styles.statusContainer}>
                      <View style={styles.statusIndicator}>
                        {isCheckingSlug ? (
                          <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                          <Ionicons
                            name={getSlugStatusIcon()}
                            size={16}
                            color={getSlugStatusColor()}
                          />
                        )}
                        <Text
                          style={[
                            styles.statusText,
                            { color: getSlugStatusColor() },
                          ]}
                        >
                          {isCheckingSlug
                            ? "Checking availability..."
                            : slugAvailability.message}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* URL Rules */}
                  <View style={styles.rulesContainer}>
                    <Text style={styles.rulesTitle}>URL Rules:</Text>
                    <Text style={styles.ruleItem}>
                      • Only letters, numbers, and hyphens
                    </Text>
                    <Text style={styles.ruleItem}>
                      • Spaces become hyphens automatically
                    </Text>
                    <Text style={styles.ruleItem}>
                      • Must be unique within your business
                    </Text>
                  </View>

                  {slugError && (
                    <Text style={{ color: "red", marginTop: 4 }}>
                      {slugError}
                    </Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Template</Text>
                  <TouchableOpacity
                    style={styles.templateSelector}
                    onPress={() => setShowTemplateModal(true)}
                  >
                    <View style={styles.templateInfo}>
                      <Ionicons
                        name={selectedTemplate.icon as any}
                        size={24}
                        color="#007AFF"
                      />
                      <View style={styles.templateDetails}>
                        <Text style={styles.templateName}>
                          {selectedTemplate.name}
                        </Text>
                        <Text style={styles.templateDescription}>
                          {selectedTemplate.description}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.createButton,
                    (isCreating ||
                      (!!slug && slugAvailability.available === false)) &&
                      styles.disabledButton,
                  ]}
                  onPress={createPage}
                  disabled={
                    isCreating ||
                    (!!slug && slugAvailability.available === false)
                  }
                >
                  {isCreating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color="#fff"
                      />
                      <Text style={styles.createButtonText}>Create Page</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>

      {/* Business Selector Modal */}
      <Modal
        visible={showBusinessSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBusinessSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business</Text>
              <TouchableOpacity onPress={() => setShowBusinessSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Which business is this page for?
            </Text>
            <FlatList
              data={businesses}
              renderItem={renderBusinessItem}
              keyExtractor={(item) => item.id}
              style={styles.businessList}
            />
          </View>
        </View>
      </Modal>

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Template</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TEMPLATES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.templateItem,
                    selectedTemplate.id === item.id &&
                      styles.selectedTemplateItem,
                  ]}
                  onPress={() => selectTemplate(item)}
                >
                  <Ionicons name={item.icon as any} size={32} color="#007AFF" />
                  <View style={styles.templateItemInfo}>
                    <Text style={styles.templateItemName}>{item.name}</Text>
                    <Text style={styles.templateItemDescription}>
                      {item.description}
                    </Text>
                    {item.id === "comprehensive" && (
                      <Text style={styles.templateItemNote}>
                        Includes: Hero, About, Documents, Contact, Personal
                        Contact, Multi-Contact, CTA, Links
                      </Text>
                    )}
                  </View>
                  {selectedTemplate.id === item.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#007AFF"
                    />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>
        </View>
      </Modal>

      {/* Slug Info Modal */}
      <Modal
        visible={showSlugInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSlugInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>About Page URLs</Text>
                <TouchableOpacity onPress={() => setShowSlugInfoModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>
                  🌐 What is a Page URL?
                </Text>
                <Text style={styles.infoText}>
                  Your page URL (also called a "slug") is the unique web address
                  for this specific page. It appears after your business name in
                  the full URL: crownpages.com/
                  <Text style={styles.bold}>business-name</Text>/
                  <Text style={styles.bold}>page-name</Text>
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>✨ Why It Matters</Text>
                <Text style={styles.infoText}>
                  • <Text style={styles.bold}>Easy Sharing:</Text> Simple URLs
                  are easier to share and remember
                </Text>
                <Text style={styles.infoText}>
                  • <Text style={styles.bold}>SEO Benefits:</Text> Descriptive
                  URLs help search engines understand your content
                </Text>
                <Text style={styles.infoText}>
                  • <Text style={styles.bold}>Professional Appearance:</Text>{" "}
                  Clean URLs look more trustworthy
                </Text>
                <Text style={styles.infoText}>
                  • <Text style={styles.bold}>User Experience:</Text> Visitors
                  can guess what a page is about from the URL
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>📋 Best Practices</Text>
                <Text style={styles.infoText}>
                  • Use your page title when possible
                </Text>
                <Text style={styles.infoText}>
                  • Keep it short and descriptive
                </Text>
                <Text style={styles.infoText}>
                  • Use hyphens to separate words
                </Text>
                <Text style={styles.infoText}>
                  • Avoid numbers unless necessary
                </Text>
                <Text style={styles.infoText}>
                  • Make it easy to spell and pronounce
                </Text>
              </View>

              <View style={styles.exampleSection}>
                <Text style={styles.infoSectionTitle}>💡 Examples</Text>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleGood}>✅ Good:</Text>
                  <Text style={styles.exampleUrl}>about-us</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleGood}>✅ Good:</Text>
                  <Text style={styles.exampleUrl}>services</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleGood}>✅ Good:</Text>
                  <Text style={styles.exampleUrl}>contact-information</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleBad}>❌ Avoid:</Text>
                  <Text style={styles.exampleUrl}>page123xyz</Text>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Important: Each page in your business must have a unique URL.
                  Changing URLs after sharing them may break existing links!
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // Black container makes status bar black in edge-to-edge
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5", // White background for actual content
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  selectorText: {
    fontSize: 16,
    color: "#333",
  },
  templateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
  },
  templateInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  templateDetails: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  templateDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  selectedTemplateItem: {
    backgroundColor: "#f0f8ff",
  },
  templateItemInfo: {
    flex: 1,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  templateItemDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  templateItemNote: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
  },
  businessItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  businessEmail: {
    fontSize: 14,
    color: "#666",
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  businessList: {
    flex: 1,
  },

  // Enhanced Slug Styles
  slugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  previewContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  previewLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  urlPreview: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  urlPrefix: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace",
  },
  urlSlug: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  slugInput: {
    fontFamily: "monospace",
    marginBottom: 12,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  rulesContainer: {
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D68910",
    marginBottom: 6,
  },
  ruleItem: {
    fontSize: 13,
    color: "#8B6914",
    marginBottom: 2,
  },

  // Modal Info Styles
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    fontWeight: "600",
  },
  exampleSection: {
    marginBottom: 20,
  },
  exampleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  exampleGood: {
    color: "#10B981",
    fontWeight: "600",
    width: 60,
  },
  exampleBad: {
    color: "#EF4444",
    fontWeight: "600",
    width: 60,
  },
  exampleUrl: {
    fontFamily: "monospace",
    fontSize: 14,
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
});
