import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { uploadToSupabase, UploadError } from "../../../utils/resilient-upload";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import ColorPicker, {
  HueSlider,
  OpacitySlider,
  Panel1,
  Preview,
  Swatches,
} from "reanimated-color-picker";
import ContactInfoSection from "../../../components/business-page-editor/ContactInfoSection";
import PageLinksSection from "../../../components/business-page-editor/PageLinksSection";
import SocialLinksSection from "../../../components/business-page-editor/SocialLinksSection";
import { useAuth } from "../../../contexts/AuthContext";
import { Database } from "../../../database.types";
import { supabase } from "../../../utils/supabase";

type BusinessPage = Database["public"]["Tables"]["business_pages"]["Row"] & {
  business: Database["public"]["Tables"]["businesses"]["Row"];
};

type PageLink = {
  id: string;
  page_id: string;
  page_title: string;
  page_slug: string;
  custom_title: string;
  is_enabled: boolean;
  sort_order: number;
};

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  is_enabled: boolean;
  sort_order: number;
};

type ContactInfo = {
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
};

export default function BusinessPageEditorScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [businessPage, setBusinessPage] = useState<BusinessPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [pageStyles, setPageStyles] = useState<any>({
    primary: "#FFFFFF",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#000000",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imagesData, setImagesData] = useState({
    uploadImages: [] as string[],
    removeImages: [] as string[],
  });
  const [showPrimaryColorPicker, setShowPrimaryColorPicker] = useState(false);
  const [primaryHexInput, setPrimaryHexInput] = useState("");
  const [isUpdatingStyles, setIsUpdatingStyles] = useState(false);

  // Form data
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [pageLinks, setPageLinks] = useState<PageLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  //  functionality
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error"
  >("saved");
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDataRef = useRef<string | null>(null);

  // Upload state tracking
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  // Computed state for any uploads in progress
  const isUploading = activeUploads.size > 0;

  // Upload state management helpers
  const startUpload = (uploadId: string) => {
    setActiveUploads((prev) => new Set([...prev, uploadId]));
    setUploadProgress((prev) => ({ ...prev, [uploadId]: 0 }));
  };

  const updateUploadProgress = (uploadId: string, progress: number) => {
    setUploadProgress((prev) => ({ ...prev, [uploadId]: progress }));
  };

  const finishUpload = (uploadId: string) => {
    setActiveUploads((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uploadId);
      return newSet;
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[uploadId];
      return newProgress;
    });
  };

  // Debounced autosave effect
  useEffect(() => {
    if (!autosaveEnabled || !businessPage) return;

    const currentData = JSON.stringify({
      title,
      description,
      logoUrl,
      pageLinks,
      socialLinks,
      contactInfo,
      pageStyles,
    });

    // Set initial data reference on first load
    if (!initialDataRef.current) {
      initialDataRef.current = currentData;
      return;
    }

    // Check if data has actually changed
    const hasChanged = currentData !== initialDataRef.current;
    setHasUnsavedChanges(hasChanged);

    if (!hasChanged) return;

    setSaveStatus("unsaved");

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        await performSave(false); // false = don't show success alert for autosave
        setSaveStatus("saved");
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        initialDataRef.current = currentData;
      } catch (error) {
        setSaveStatus("error");
        console.error("Autosave failed:", error);
      }
    }, 2000); // 2 second delay for autosave

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [
    title,
    description,
    logoUrl,
    pageLinks,
    socialLinks,
    contactInfo,
    pageStyles,
    autosaveEnabled,
    businessPage,
  ]);

  // Update initial data when page loads
  useEffect(() => {
    if (businessPage) {
      const currentData = JSON.stringify({
        title,
        description,
        logoUrl,
        pageLinks,
        socialLinks,
        contactInfo,
        pageStyles,
      });
      initialDataRef.current = currentData;
      setLastSavedAt(
        businessPage.updated_at ? new Date(businessPage.updated_at) : null
      );
    }
  }, [businessPage]);

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchBusinessPage();
      }
    }, [id])
  );

  const fetchBusinessPage = async () => {
    try {
      const { data, error } = await supabase
        .from("business_pages")
        .select(
          `
          *,
          business:businesses(*)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("Business page not found");
      }

      setBusinessPage(data);
      setTitle(data.title || "Welcome");
      setDescription(data.description || "");
      setLogoUrl(data.logo_url || "");
      setPageLinks(data.page_links || []);
      setSocialLinks(data.social_links || []);
      setContactInfo(data.contact_info || {});
      setPageStyles(
        data.styles || {
          primary: "#FFFFFF",
          backgroundColor: "#000000",
          textColor: "#FFFFFF",
          buttonColor: "#FFFFFF",
          buttonTextColor: "#000000",
        }
      );
      setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
    } catch (error) {
      console.error("💥 Error fetching business page:", error);
      Alert.alert("Error", "Failed to load business page");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  // After a successful save, permanently delete any files that were replaced/removed
  // and clear tracking so exiting the editor does not delete saved files.
  const finalizeUploadsAfterSave = async () => {
    try {
      const toDelete = imagesData.removeImages.filter(Boolean);
      if (toDelete.length) {
        await supabase.storage.from("uploads").remove(toDelete);
      }
    } catch (err) {
      console.error(
        "⚠️ Error cleaning up removed images after business page save:",
        err
      );
    } finally {
      setImagesData({ uploadImages: [], removeImages: [] });
    }
  };

  const performSave = async (showAlert: boolean = true) => {
    if (!businessPage) return;

    // Prevent saving during uploads
    if (isUploading) {
      if (showAlert) {
        Alert.alert(
          "Upload in Progress",
          "Please wait for image uploads to complete before saving.",
          [{ text: "OK" }]
        );
      }
      console.log("⚠️ Cannot save while uploads are in progress");
      return;
    }

    // Prevent manual save if auto-save is already in progress
    if (saveStatus === "saving" && !showAlert) {
      console.log("⚠️ Auto-save already in progress, skipping manual save");
      return;
    }

    // Cancel any pending auto-save when manually saving
    if (showAlert && autosaveTimeoutRef.current) {
      console.log("🔄 Canceling pending auto-save for manual save");
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const { error } = await supabase
        .from("business_pages")
        .update({
          title,
          description,
          logo_url: logoUrl,
          page_links: pageLinks,
          social_links: socialLinks,
          contact_info: contactInfo,
          styles: pageStyles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Clean up upload bookkeeping and delete any files marked for removal
      await finalizeUploadsAfterSave();

      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());

      // Update the initial data reference to prevent immediate auto-save
      const currentData = JSON.stringify({
        title,
        description,
        logoUrl,
        pageLinks,
        socialLinks,
        contactInfo,
        pageStyles,
      });
      initialDataRef.current = currentData;

      if (showAlert) Alert.alert("Success", "Business page saved successfully");
    } catch (error) {
      console.error("Error saving business page:", error);
      setSaveStatus("error");
      if (showAlert) Alert.alert("Error", "Failed to save business page");
    } finally {
      setIsSaving(false);
    }
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = `logo_${Date.now()}.${
        asset.uri.split(".").pop() || "jpg"
      }`;

      // Generate upload ID and start tracking
      const uploadId = `logo_${Date.now()}`;
      startUpload(uploadId);

      try {
        // Upload to Supabase using resilient upload utility
        const fileExt = uri.split(".").pop()?.split("?")[0] || "png";
        const filePath = `${businessPage?.created_by}/${businessPage?.business_id}/business-page/${fileName}`;
        const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

        const result = await uploadToSupabase({
          uri,
          filePath,
          contentType,
          bucket: 'uploads',
          upsert: true,
          maxRetries: 3,
          onProgress: (progress) => {
            console.log(`📊 Logo upload progress: ${progress}%`);
            updateUploadProgress(uploadId, progress);
          },
        });

        const publicUrl = supabase.storage
          .from("uploads")
          .getPublicUrl(result.path).data.publicUrl;
        setLogoUrl(publicUrl);
      } finally {
        // Always finish upload tracking
        finishUpload(uploadId);
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      Alert.alert("Error", "Failed to upload logo");
    }
  };

  const updatePageLink = (linkId: string, updates: Partial<PageLink>) => {
    setPageLinks((prev) =>
      prev.map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    );
  };

  const updateSocialLink = (linkId: string, updates: Partial<SocialLink>) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.id === linkId ? { ...link, ...updates } : link))
    );
  };

  const addSocialLink = () => {
    const newLink: SocialLink = {
      id: `temp_${Date.now()}`,
      platform: "website",
      url: "",
      is_enabled: true,
      sort_order: socialLinks.length,
    };
    setSocialLinks([...socialLinks, newLink]);
  };

  const removeSocialLink = (linkId: string) => {
    setSocialLinks((prev) => prev.filter((link) => link.id !== linkId));
  };

  const previewBusinessPage = () => {
    const rootUrl = (
      process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com"
    ).replace(/\/$/, "");
    const url = `${rootUrl}/${businessPage?.business.slug || "business"}`;
    // Open in device browser instead of WebView
    Linking.openURL(url);
  };

  const updatePageStyles = async () => {
    if (!businessPage) return;
    setIsUpdatingStyles(true);
    try {
      const { error } = await supabase
        .from("business_pages")
        .update({ styles: pageStyles, updated_at: new Date().toISOString() })
        .eq("id", businessPage.id);
      if (error) throw error;
      Alert.alert("Success", "Page styles updated successfully");
      setShowStyleModal(false);
    } catch (error) {
      console.error("Error updating page styles:", error);
      Alert.alert("Error", "Failed to update page styles");
    } finally {
      setIsUpdatingStyles(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (isUploading) {
                Alert.alert(
                  "Upload in Progress",
                  "Please wait for image uploads to complete before leaving.",
                  [{ text: "OK" }]
                );
                return;
              }
              router.back();
            }}
            disabled={isUploading}
            style={[isUploading && { opacity: 0.5 }]}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isUploading ? "#ccc" : "#000"}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Business Page</Text>
            <View style={styles.saveStatusContainer}>
              {saveStatus === "saving" && (
                <View style={styles.saveStatus}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.saveStatusText}>Saving...</Text>
                </View>
              )}
              {saveStatus === "saved" && lastSavedAt && (
                <View style={styles.saveStatus}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.saveStatusText}>
                    Saved {formatTimeAgo(lastSavedAt)}
                  </Text>
                </View>
              )}
              {saveStatus === "unsaved" && (
                <View style={styles.saveStatus}>
                  <Ionicons name="ellipse" size={8} color="#FF9500" />
                  <Text style={styles.saveStatusText}>Unsaved changes</Text>
                </View>
              )}
              {saveStatus === "error" && (
                <View style={styles.saveStatus}>
                  <Ionicons name="warning" size={16} color="#FF3B30" />
                  <Text style={styles.saveStatusText}>Save failed</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={previewBusinessPage}
              style={styles.headerButton}
            >
              <Ionicons name="eye-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowStyleModal(true)}
              style={styles.headerButton}
            >
              <Ionicons name="color-palette-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => performSave(true)}
              style={[
                styles.saveButton,
                (isSaving || isUploading) && styles.disabledButton,
              ]}
              disabled={isSaving || isUploading}
            >
              {isUploading ? (
                <View style={styles.uploadIndicator}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>Uploading...</Text>
                </View>
              ) : isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Autosave Toggle Bar */}
        <View style={styles.autosaveBar}>
          <View style={styles.autosaveToggleContainer}>
            <Text style={styles.autosaveLabel}>Auto-save</Text>
            <Switch
              value={autosaveEnabled}
              onValueChange={setAutosaveEnabled}
              trackColor={{ false: "#D1D1D6", true: "#007AFF" }}
              thumbColor={autosaveEnabled ? "#fff" : "#fff"}
              style={styles.autosaveSwitch}
            />
          </View>
          {!autosaveEnabled && hasUnsavedChanges && (
            <TouchableOpacity
              onPress={() => performSave(true)}
              style={styles.quickSaveButton}
              disabled={isSaving || isUploading}
            >
              <Ionicons
                name="save"
                size={16}
                color={isUploading ? "#ccc" : "#007AFF"}
              />
              <Text
                style={[styles.quickSaveText, isUploading && { color: "#ccc" }]}
              >
                {isUploading ? "Uploading..." : "Save Now"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pageInfo}>
              <Text style={styles.pageTitle}>
                {businessPage?.business.name}
              </Text>
              <Text style={styles.pageDescription}>Business Page Editor</Text>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Page Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Welcome to our business"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Brief description of your business"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Logo</Text>
                <TouchableOpacity style={styles.imageButton} onPress={pickLogo}>
                  <Ionicons name="image-outline" size={20} color="#007AFF" />
                  <Text style={styles.imageButtonText}>
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </Text>
                </TouchableOpacity>
                {logoUrl && (
                  <View style={styles.logoPreview}>
                    <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                  </View>
                )}
              </View>
            </View>

            {/* Page Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Page Links</Text>
              <PageLinksSection
                businessId={businessPage?.business_id || ""}
                pageLinks={pageLinks}
                onPageLinksChange={setPageLinks}
              />
            </View>

            {/* Social Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Social Links</Text>
              <SocialLinksSection
                socialLinks={socialLinks}
                onSocialLinksChange={setSocialLinks}
              />
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <ContactInfoSection
                contactInfo={contactInfo}
                onContactInfoChange={setContactInfo}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Save Button */}
        {!autosaveEnabled && hasUnsavedChanges && (
          <View style={styles.floatingSaveContainer}>
            <TouchableOpacity
              onPress={() => performSave(true)}
              style={[
                styles.floatingSaveButton,
                (isSaving || isUploading) && styles.disabledButton,
              ]}
              disabled={isSaving || isUploading}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.floatingSaveText}>Uploading...</Text>
                </>
              ) : isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.floatingSaveText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Style Modal */}
        <Modal
          visible={showStyleModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowStyleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Page Styles</Text>
                <TouchableOpacity onPress={() => setShowStyleModal(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <View style={styles.styleOptions}>
                <Text style={styles.fieldLabel}>Primary Color</Text>
                <TouchableOpacity
                  style={styles.colorButton}
                  onPress={() => {
                    setPrimaryHexInput(
                      (pageStyles.primary || "#FFFFFF").replace("#", "")
                    );
                    setShowPrimaryColorPicker(true);
                  }}
                >
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: pageStyles?.primary || "#FFFFFF" },
                    ]}
                  />
                  <Text style={styles.colorText}>
                    {pageStyles?.primary || "#FFFFFF"}
                  </Text>
                  <Ionicons
                    name="color-palette-outline"
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>

                {/* Color Picker Modal */}
                <Modal
                  visible={showPrimaryColorPicker}
                  animationType="slide"
                  transparent={true}
                  onRequestClose={() => setShowPrimaryColorPicker(false)}
                >
                  <View style={styles.colorPickerOverlay}>
                    <View style={styles.colorPickerModal}>
                      <View style={styles.colorPickerHeader}>
                        <Text style={styles.colorPickerTitle}>
                          Select Primary Color
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowPrimaryColorPicker(false)}
                        >
                          <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <ColorPicker
                        style={{ width: "100%" }}
                        value={pageStyles?.primary || "#FFFFFF"}
                        onCompleteJS={(color) => {
                          setPageStyles({
                            ...pageStyles,
                            primary: color.hex,
                          });
                          setPrimaryHexInput(color.hex.replace("#", ""));
                        }}
                      >
                        <Preview style={styles.colorPickerPreview} />
                        <Panel1 style={styles.colorPickerPanel} />
                        <HueSlider style={styles.colorPickerSlider} />
                        <OpacitySlider style={styles.colorPickerSlider} />
                        <Swatches style={styles.colorPickerSwatches} />
                      </ColorPicker>
                      <TouchableOpacity
                        style={styles.colorPickerDone}
                        onPress={() => setShowPrimaryColorPicker(false)}
                      >
                        <Text style={styles.colorPickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>

                <Text style={styles.fieldLabel}>Background Color</Text>
                <TextInput
                  style={styles.input}
                  value={pageStyles.backgroundColor}
                  onChangeText={(text) =>
                    setPageStyles({
                      ...pageStyles,
                      backgroundColor: text,
                    })
                  }
                  placeholder="#000000"
                />

                <Text style={styles.fieldLabel}>Text Color</Text>
                <TextInput
                  style={styles.input}
                  value={pageStyles.textColor}
                  onChangeText={(text) =>
                    setPageStyles({
                      ...pageStyles,
                      textColor: text,
                    })
                  }
                  placeholder="#FFFFFF"
                />

                <TouchableOpacity
                  style={styles.saveStylesButton}
                  onPress={updatePageStyles}
                  disabled={isUpdatingStyles}
                >
                  {isUpdatingStyles ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveStylesButtonText}>Save Styles</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Preview Modal */}
        <Modal
          visible={showPreview}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPreview(false)}
        >
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <TouchableOpacity
                onPress={() => setShowPreview(false)}
                style={styles.previewBackButton}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewHeaderSpacer} />
            </View>
            {previewUrl ? (
              <WebView
                source={{ uri: previewUrl }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading preview...</Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.previewErrorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#999" />
                <Text style={styles.previewErrorText}>
                  No preview URL available
                </Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  saveStatusContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  saveStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
  },
  saveStatusText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  autosaveBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  autosaveToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  autosaveLabel: {
    fontSize: 14,
    color: "#333",
    marginRight: 12,
    fontWeight: "500",
  },
  autosaveSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  quickSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  quickSaveText: {
    fontSize: 12,
    color: "#007AFF",
    marginLeft: 4,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  pageInfo: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 4,
  },
  pageDescription: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
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
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    marginBottom: 12,
  },
  imageButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  logoPreview: {
    alignItems: "center",
    marginTop: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  pageLinksContainer: {
    marginTop: 8,
  },
  pageLinkItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pageLinkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageLinkTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  socialLinkItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  socialLinkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  socialLinkTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    borderStyle: "dashed",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  floatingSaveContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 1000,
  },
  floatingSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
  styleOptions: {
    padding: 16,
  },
  colorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  colorText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
  },
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  colorPickerModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  colorPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  colorPickerPreview: {
    marginBottom: 16,
    borderRadius: 8,
    height: 40,
  },
  colorPickerPanel: {
    borderRadius: 8,
    marginBottom: 16,
    height: 200,
  },
  colorPickerSlider: {
    borderRadius: 8,
    marginBottom: 16,
    height: 32,
  },
  colorPickerSwatches: {
    marginBottom: 16,
    gap: 12,
  },
  colorPickerDone: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  colorPickerDoneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveStylesButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveStylesButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  previewBackButton: {
    padding: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  previewHeaderSpacer: {
    width: 32,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  previewErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  previewErrorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
