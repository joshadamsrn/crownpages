// app/(app)/business-setup.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { supabase } from "../../utils/supabase";
import { isReservedSlug, getReservedSlugError } from "../../constants/reserved-slugs";

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function BusinessSetup() {
  const { session } = useAuth();
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [showSlugInfo, setShowSlugInfo] = useState(false);

  // Check if user already has businesses (redirect if they do)
  useEffect(() => {
    const checkExistingBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", session?.user?.id);

        if (error && error.code !== "PGRST116") throw error;

        if (data && data.length > 0) {
          // User already has businesses, redirect to my pages
          Alert.alert(
            "Business Already Exists",
            "You already have a business set up. You can manage it from Business Settings in the menu.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/(app)/(tabs)/my-pages"),
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.error("Error checking existing businesses:", error);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    checkExistingBusinesses();
  }, [session?.user?.id]);

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

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(
    debounce(async (slugToCheck: string) => {
      if (!slugToCheck) {
        setSlugAvailability({ available: null, message: "" });
        setIsCheckingSlug(false);
        return;
      }

      // Check if slug is reserved
      if (isReservedSlug(slugToCheck)) {
        setSlugAvailability({
          available: false,
          message: getReservedSlugError(slugToCheck),
        });
        setIsCheckingSlug(false);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", slugToCheck)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSlugAvailability({
            available: false,
            message: "This business URL is already taken",
          });
        } else {
          setSlugAvailability({
            available: true,
            message: "Perfect! This business URL is available",
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
    []
  );

  const handleBusinessNameChange = (text: string) => {
    setBusinessName(text);
    // Auto-generate slug from business name
    const formattedSlug = formatSlug(text);
    setSlug(formattedSlug);
    setSlugError(null);

    if (formattedSlug) {
      checkSlugAvailability(formattedSlug);
    } else {
      setSlugAvailability({ available: null, message: "" });
    }
  };

  const handleSlugChange = (text: string) => {
    const formattedSlug = formatSlug(text);
    setSlug(formattedSlug);
    setSlugError(null);

    if (formattedSlug) {
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
    if (slugAvailability.available === true) return "checkmark-circle";
    if (slugAvailability.available === false) return "close-circle";
    return "information-circle-outline";
  };

  const handleCreateBusiness = async () => {
    // Validation
    if (!businessName.trim()) {
      Alert.alert("Error", "Please enter a business name");
      return;
    }

    if (!slug.trim()) {
      setSlugError("Business URL is required");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("URL can only contain lowercase letters, numbers, and dashes");
      return;
    }

    if (isReservedSlug(slug)) {
      setSlugError(getReservedSlugError(slug));
      return;
    }

    if (slugAvailability.available === false) {
      setSlugError("This business URL is already taken");
      return;
    }

    setSlugError(null);
    setIsCreating(true);

    try {
      // Double-check slug availability
      const { data: existingBusiness } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingBusiness) {
        setSlugError("This business URL is already taken");
        setIsCreating(false);
        return;
      }

      // Create the business
      const { data: newBusiness, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: session?.user?.id,
          name: businessName,
          slug: slug,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Success! Navigate to my pages
      // Using replace to clear the setup screen from history
      router.replace("/(app)/(tabs)/my-pages");
    } catch (error) {
      console.error("Error creating business:", error);
      Alert.alert("Error", "Failed to create business. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (isCheckingExisting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking your account...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="business" size={48} color="#007AFF" />
            </View>
            <Text style={styles.title}>Welcome to Crown Pages! 👑</Text>
            <Text style={styles.subtitle}>
              Let's set up your business to get started
            </Text>
            <Text style={styles.description}>
              You'll create one business that will house all your pages. Your
              pages will be accessible at crownpages.com/your-business/page-name
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Business Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smith Dental Care"
                value={businessName}
                onChangeText={handleBusinessNameChange}
                autoCapitalize="words"
                editable={!isCreating}
              />
              <Text style={styles.hint}>
                This is your business or organization name
              </Text>
            </View>

            {/* Business URL/Slug */}
            <View style={styles.inputGroup}>
              <View style={styles.slugHeader}>
                <Text style={styles.label}>Business URL *</Text>
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => setShowSlugInfo(!showSlugInfo)}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {showSlugInfo && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    Your business URL must be unique across Crown Pages. It can
                    only contain:
                  </Text>
                  <Text style={styles.infoText}>• Lowercase letters (a-z)</Text>
                  <Text style={styles.infoText}>• Numbers (0-9)</Text>
                  <Text style={styles.infoText}>• Dashes (-)</Text>
                  <Text style={styles.infoText}>
                    This URL will be used for all your pages:
                  </Text>
                  <Text style={styles.infoExample}>
                    crownpages.com/your-business/page-name
                  </Text>
                </View>
              )}

              <View style={styles.urlPreviewContainer}>
                <Text style={styles.urlPrefix}>crownpages.com/</Text>
                <Text
                  style={[
                    styles.urlSlug,
                    { color: slug ? "#007AFF" : "#999" },
                  ]}
                >
                  {slug || "your-business"}
                </Text>
              </View>

              <View style={styles.inputWithIcon}>
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
                  placeholder="your-business-name"
                  value={slug}
                  onChangeText={handleSlugChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isCreating}
                />
                <View style={styles.slugStatusIcon}>
                  {isCheckingSlug ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Ionicons
                      name={getSlugStatusIcon()}
                      size={24}
                      color={getSlugStatusColor()}
                    />
                  )}
                </View>
              </View>

              {slugAvailability.message && (
                <View
                  style={[
                    styles.availabilityMessage,
                    {
                      backgroundColor:
                        slugAvailability.available === true
                          ? "#ECFDF5"
                          : "#FEF2F2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availabilityText,
                      {
                        color:
                          slugAvailability.available === true
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {slugAvailability.message}
                  </Text>
                </View>
              )}

              {slugError && (
                <Text style={styles.errorText}>{slugError}</Text>
              )}
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createButton,
              (isCreating ||
                !businessName.trim() ||
                !slug.trim() ||
                slugAvailability.available !== true) &&
                styles.createButtonDisabled,
            ]}
            onPress={handleCreateBusiness}
            disabled={
              isCreating ||
              !businessName.trim() ||
              !slug.trim() ||
              slugAvailability.available !== true
            }
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create My Business</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.helpText}>
              Don't worry, you can contact us later to update your business
              details if needed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  slugHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#1976D2",
    marginBottom: 4,
  },
  infoExample: {
    fontSize: 13,
    color: "#1976D2",
    fontWeight: "600",
    marginTop: 4,
  },
  urlPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  urlPrefix: {
    fontSize: 14,
    color: "#666",
  },
  urlSlug: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputWithIcon: {
    position: "relative",
  },
  slugInput: {
    paddingRight: 48,
  },
  slugStatusIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  availabilityMessage: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 4,
  },
  createButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: "#CCC",
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    flex: 1,
  },
});

