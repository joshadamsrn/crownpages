// app/(app)/page-editor/[id].tsx
import {
  getSectionDefinition,
  SECTION_DEFINITIONS,
  validateSectionData,
  type SectionDefinition,
} from "@crown-pages/types";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { uploadToSupabase, normalizeStoragePath as normalizeStoragePathUtil } from "../../../utils/resilient-upload";
import { uploadToMux } from "../../../utils/mux-upload";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { EnhancedFeaturesEditor } from "../../../components/page-editor/enhanced-section-editors";
import { SectionBlockPreview } from "../../../components/page-editor/section-block-preview";
import {
  AboutEditor,
  AmenitiesEditor,
  CompanyHeaderEditor,
  ContactCardEditor,
  CTAEditor,
  FAQEditor,
  GalleryEditor,
  HeroEditor,
  LinksWithContactEditor,
  MedicalProviderEditor,
  MultiContactEditor,
  PersonalContactEditor,
  SectionStylesEditor,
  SocialLinksEditor,
  TestimonialsEditor,
} from "../../../components/page-editor/section-editors";
import { PagePreview } from "../../../components/view-page/page-preview";
import { useAuth } from "../../../contexts/AuthContext";
import { Database } from "../../../database.types";
import { supabase } from "../../../utils/supabase";
import UploadProgressModal, { UploadProgressInfo } from "../../../components/UploadProgressModal";

type Page = Database["public"]["Tables"]["pages"]["Row"] & {
  business: Database["public"]["Tables"]["businesses"]["Row"];
};

type Section = {
  id: string;
  type: string;
  data: any;
  styles: any;
};

// Local section definitions for new sections not yet in @crown-pages/types
const LOCAL_SECTION_DEFINITIONS = [
  {
    type: "companyHeader",
    name: "Company Header",
    icon: "business-outline",
    category: "content",
    description: "Company name, address, and map link",
  },
  {
    type: "contactCard",
    name: "Contact Card",
    icon: "person-outline",
    category: "contact",
    description: "Contact person with photo, name, role, and details",
  },
  {
    type: "amenities",
    name: "Amenities",
    icon: "list-outline",
    category: "content",
    description: "Grid of amenities with icons",
  },
  {
    type: "personalContact",
    name: "Personal Contact",
    icon: "person-circle-outline",
    category: "contact",
    description: "Personal contact card with photo and details",
  },
  {
    type: "multiContact",
    name: "Multi Contact",
    icon: "people-outline",
    category: "contact",
    description: "Multiple contact cards for team members",
  },
  {
    type: "medicalProvider",
    name: "Medical Provider",
    icon: "medical-outline",
    category: "content",
    description: "Medical provider information and credentials",
  },
  // Virtual split-view types for linksWithContact — editor-only, never stored in DB
  {
    type: "linksWithContact_links",
    name: "Pages",
    icon: "document-outline",
    category: "content",
    description: "Links, PDFs, and documents list",
  },
  {
    type: "linksWithContact_contact",
    name: "Contact Button",
    icon: "person-outline",
    category: "contact",
    description: "Contact info card shown on the page",
  },
];

// Override getSectionDefinition to include local sections
const getLocalSectionDefinition = (type: string): SectionDefinition | null => {
  // First check if it's in the imported SECTION_DEFINITIONS
  const schemaDef = getSectionDefinition(type);
  if (schemaDef) {
    return schemaDef;
  }

  // If not found, check LOCAL_SECTION_DEFINITIONS
  const localDef = LOCAL_SECTION_DEFINITIONS.find((def) => def.type === type);
  if (localDef) {
    // Convert local definition to SectionDefinition format
    return {
      type: localDef.type,
      name: localDef.name,
      icon: { mobile: localDef.icon, web: localDef.icon },
      category: localDef.category,
      description: localDef.description,
      defaultData: {}, // Will be provided by getDefaultSectionData
      fields: {}, // Local sections don't use schema-based field validation
      styleOptions: {
        canOverride: ['colors', 'typography', 'spacing', 'layout'],
      },
      renderingHints: {
        mobile: {
          height: 'auto',
          spacing: 'normal',
          layout: 'single',
        },
        web: {
          height: 'auto',
          responsive: true,
          container: 'contained',
        },
      },
      version: '1.0.0',
    } as SectionDefinition;
  }

  return null;
};

const getSectionTypesFromSchema = () => {
  const fromTypes = Object.values(SECTION_DEFINITIONS).map((def) => ({
    type: def.type,
    name: def.name,
    icon: def.icon.mobile,
    category: def.category,
    description: def.description,
  }));

  // Add local sections that aren't already in the types package
  // and filter out virtual editor-only split types
  const typeKeys = new Set(fromTypes.map((s) => s.type));
  const localExtras = LOCAL_SECTION_DEFINITIONS
    .filter((def) => !typeKeys.has(def.type) && !def.type.includes('_'))
    .map((def) => ({
      type: def.type,
      name: def.name,
      icon: def.icon,
      category: def.category,
      description: def.description,
    }));

  const allSections = [...fromTypes, ...localExtras];

  console.log(
    "📋 Available section types from schema:",
    allSections.map((s) => s.type)
  );
  return allSections;
};

// Utility to update nested field by path (e.g., testimonials[2].img_uri)
function updateNestedField(obj: any, path: string, value: any) {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let temp = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    temp = temp[keys[i]];
  }

  temp[keys[keys.length - 1]] = value;

  return { ...obj };
}

export interface FileUploadData {
  path: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  thumbnailPath?: string;
}

export default function PageEditorScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [pageStyles, setPageStyles] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<'native' | 'web'>('native'); // Native preview by default
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null); // For section-specific preview
  const [imagesData, setImagesData] = useState({
    uploadImages: [] as string[],
    removeImages: [] as string[],
  });
  const [showPrimaryColorPicker, setShowPrimaryColorPicker] = useState(false);
  const [primaryHexInput, setPrimaryHexInput] = useState("");
  const [isUpdatingStyles, setIsUpdatingStyles] = useState(false);

  // Autosave functionality
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
  const [isDocumentPickerActive, setIsDocumentPickerActive] = useState(false);

  // Upload progress map — keyed by uploadId so concurrent uploads don't stomp each other
  const [uploadInfoMap, setUploadInfoMap] = useState<Record<string, UploadProgressInfo>>({});

  const setUploadEntry = (id: string, info: UploadProgressInfo) => {
    setUploadInfoMap(prev => ({ ...prev, [id]: info }));
  };

  const clearUploadEntry = (id: string) => {
    setUploadInfoMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Derive banner display: show the most recently updated entry and total count
  const uploadQueueEntries = Object.entries(uploadInfoMap);
  const activeUploadInfo = uploadQueueEntries.length > 0
    ? uploadQueueEntries[uploadQueueEntries.length - 1][1]
    : null;
  const uploadQueueCount = uploadQueueEntries.length;

  // Computed state for any uploads in progress
  const isUploading = activeUploads.size > 0;

  // Normalize any URL or path to a storage-relative path within the 'uploads' bucket
  const normalizeStoragePath = (value?: string | null): string => {
    if (!value) return "";
    let v = value.trim();
    if (!v) return "";
    if (v.startsWith("http")) {
      const marker = "/object/public/uploads/";
      const idx = v.indexOf(marker);
      if (idx !== -1) {
        v = v.substring(idx + marker.length);
      }
    }
    if (v.startsWith("/")) v = v.slice(1);
    return v;
  };

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
    if (!autosaveEnabled || !page) return;

    const currentData = JSON.stringify({ sections, pageStyles });

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
  }, [sections, pageStyles, autosaveEnabled, page]);

  // Update initial data when page loads
  useEffect(() => {
    if (page) {
      const currentData = JSON.stringify({ sections, pageStyles });
      initialDataRef.current = currentData;
      setLastSavedAt(page.updated_at ? new Date(page.updated_at) : null);
    }
  }, [page]);

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
        fetchPage();
      }
    }, [id])
  );
  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
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
        throw new Error("Page not found");
      }

      setPage(data);
      console.log("this is tha page in id.tsx and we are testing data", page);

      const content = data.content as any;

      if (!content) {
        console.log("📄 Page has no content, initializing empty sections");
        setSections([]);
      } else if (!content.sections) {
        console.log("📄 Page content has no sections array, initializing");
        setSections([]);
      } else {
        console.log(
          `📄 Loading ${content.sections.length} sections from database`
        );
        const loadedSections = content.sections || [];

        // Ensure socialLinks is present and in the correct position (before gallery/amenities).
        // If it already exists but is misplaced (e.g. added at the bottom via old Add Section button),
        // pull it out and re-insert it at the right spot.
        const existingIdx = loadedSections.findIndex((s: Section) => s.type === 'socialLinks');
        const emptyStyles = { primary: '', secondary: '', background: '', text: { primary: '', secondary: '', muted: '' } };
        const socialLinksSection: Section = existingIdx >= 0
          ? loadedSections[existingIdx]
          : { id: `auto_${Date.now()}`, type: 'socialLinks', data: { title: 'Social Media', links: [] }, styles: emptyStyles };

        // Build list without socialLinks, then find correct insertion point
        const withoutSocial: Section[] = loadedSections.filter((s: Section) => s.type !== 'socialLinks');
        const galleryIdx = withoutSocial.findIndex((s: Section) => s.type === 'gallery');
        const amenitiesIdx = withoutSocial.findIndex((s: Section) => s.type === 'amenities');
        const insertIdx = galleryIdx >= 0 ? galleryIdx : amenitiesIdx >= 0 ? amenitiesIdx : withoutSocial.length;
        const finalSections: Section[] = [...withoutSocial];
        finalSections.splice(insertIdx, 0, socialLinksSection);
        if (existingIdx < 0) console.log(`📱 Auto-injected socialLinks at index ${insertIdx}`);
        else if (existingIdx !== insertIdx) console.log(`📱 Repositioned socialLinks to index ${insertIdx}`);

        setSections(finalSections);
        debugSectionRendering(finalSections);
      }

      setPageStyles(data.styles || {});
      setLastSavedAt(data.updated_at ? new Date(data.updated_at) : null);
    } catch (error) {
      console.error("💥 Error fetching page:", error);
      // Alert.alert("Error", "Failed to load page");
      // router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const savePage = async () => {
    if (!page) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("pages")
        .update({
          content: { sections },
          styles: pageStyles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      Alert.alert("Success", "Page saved successfully");
      setLastSavedAt(new Date());
    } catch (error) {
      console.error("Error saving page:", error);
      Alert.alert("Error", "Failed to save page");
    } finally {
      setIsSaving(false);
    }
  };

  const removeUnsavedImages = async (type: "added" | "removed") => {
    if (imagesData.removeImages.length || imagesData.uploadImages.length) {
      const unSavedImages = (
        type === "added" ? imagesData.uploadImages : imagesData.removeImages
      )
        .map(normalizeStoragePath)
        .filter(Boolean);
      await supabase.storage
        .from("uploads")
        .remove(unSavedImages)
        .then(() => {
          router.back();
        });
    } else {
      router.back();
    }
  };

  // After a successful save, permanently delete any files that were replaced or removed,
  // and clear the upload tracking so exiting the editor does not remove saved files.
  const finalizeUploadsAfterSave = async () => {
    try {
      const toDelete = imagesData.removeImages.filter(Boolean);
      if (toDelete.length) {
        await supabase.storage.from("uploads").remove(toDelete);
      }
    } catch (err) {
      console.error("⚠️ Error cleaning up removed images after save:", err);
    } finally {
      setImagesData({ uploadImages: [], removeImages: [] });
    }
  };

  const addSection = (type: string) => {
    const newSection: Section = {
      id: `temp_${Date.now()}`,
      type,
      data: getDefaultSectionData(type),
      styles: {
        primary: "",
        secondary: "",
        background: "",
        text: {
          primary: "",
          secondary: "",
          muted: "",
        },
      },
    };
    setSections([...sections, newSection]);
    setShowAddSection(false);
  };

  const debugSectionRendering = (sections: Section[]) => {
    console.log("\n=== 🔍 SECTION RENDERING DEBUG ===");
    console.log("Total sections to render:", sections.length);

    sections.forEach((section, index) => {
      const definition = getLocalSectionDefinition(section.type);
      console.log(`\n📄 Section ${index + 1}:`);
      console.log("  - ID:", section.id);
      console.log("  - Type:", section.type);
      console.log("  - Has Schema Definition:", !!definition);
      console.log("  - Data Keys:", Object.keys(section.data || {}));

      if (definition) {
        console.log("  - Expected Fields:", Object.keys(definition.fields));
        console.log("  - Category:", definition.category);

        // Validate data structure
        const validation = validateSectionData(section.type, section.data);
        if (validation.valid) {
          console.log("  - ✅ Validation: PASSED");
        } else {
          console.log("  - ❌ Validation: FAILED");
          console.log("  - Errors:", validation.errors);
        }
      } else {
        console.log("  - ❌ NO SCHEMA DEFINITION FOUND!");
        console.log("  - Available types:", Object.keys(SECTION_DEFINITIONS));
      }
    });
    console.log("=== END DEBUG ===\n");
  };

  const getDefaultSectionData = (type: string) => {
    console.log("🎯 Getting default data for section type:", type);

    const definition = getLocalSectionDefinition(type);
    if (definition) {
      console.log(
        "✅ Found schema definition, using defaultData:",
        definition.defaultData
      );
      return definition.defaultData;
    }

    console.warn("❌ No schema definition found for:", type);
    console.log("Available section types:", Object.keys(SECTION_DEFINITIONS));

    // Fallback default data for local sections not in @crown-pages/types
    const localDefaults: Record<string, any> = {
      companyHeader: {
        companyName: "Company Name",
        address: "123 Main Street, City, State 12345",
        mapUrl: "",
      },
      contactCard: {
        name: "Contact Name",
        role: "Position",
        imageUrl: "",
        phone: "",
        email: "",
      },
      amenities: {
        title: "Amenities",
        amenities: [
          { id: "temp_1", name: "Free Wi-Fi", icon: "wifi" },
          { id: "temp_2", name: "Parking", icon: "car" },
          { id: "temp_3", name: "24/7 Access", icon: "time" },
        ],
      },
      personalContact: {
        name: "Contact Name",
        title: "Position",
        photo: "",
        phone: "",
        email: "",
        bio: "",
      },
      multiContact: {
        title: "Our Team",
        contacts: [
          {
            id: "temp_1",
            name: "Team Member",
            role: "Position",
            photo: "",
            phone: "",
            email: "",
          },
        ],
      },
      medicalProvider: {
        name: "Dr. Name",
        specialty: "Specialty",
        credentials: "MD, Board Certified",
        photo: "",
        bio: "",
        phone: "",
        email: "",
      },
      linksWithContact: {
        title: "Pages",
        links: [],
        contactName: "",
        contactRole: "",
        contactPhone: "",
        contactEmail: "",
        contactImageUrl: "",
        contactStatus: "",
      },
      linksWithContact_links: {
        title: "Pages",
        links: [],
        contactName: "",
        contactRole: "",
        contactPhone: "",
        contactEmail: "",
        contactImageUrl: "",
        contactStatus: "",
      },
      linksWithContact_contact: {
        title: "Pages",
        links: [],
        contactName: "",
        contactRole: "",
        contactPhone: "",
        contactEmail: "",
        contactImageUrl: "",
        contactStatus: "",
      },
    };

    return localDefaults[type] || {};
  };

  const updateSectionData = (sectionId: string, newData: any) => {
    setSections(
      sections.map((section) => {
        if (section.id !== sectionId) return section;
        let updatedData = { ...section.data };
        for (const key in newData) {
          if (key.includes("[")) {
            updatedData = updateNestedField(updatedData, key, newData[key]);
          } else {
            updatedData[key] = newData[key];
          }
        }

        return { ...section, data: updatedData };
      })
    );
  };

  const updateUploadData = (url: string, type: "add" | "remove") => {
    const normalized = normalizeStoragePath(url);
    if (!normalized) return;
    if (type === "add") {
      const updateRemoveImages = imagesData.removeImages.filter((img) => {
        return normalizeStoragePath(img) !== normalized;
      });
      setImagesData((prev) => ({
        ...prev,
        uploadImages: [...prev.uploadImages, normalized],
        removeImages: updateRemoveImages,
      }));
    } else if (type === "remove") {
      const updateUploadImages = imagesData.uploadImages.filter((img) => {
        return normalizeStoragePath(img) !== normalized;
      });
      setImagesData((prev) => ({
        ...prev,
        removeImages: [...prev.removeImages, normalized],
        uploadImages: updateUploadImages,
      }));
    }
  };

  const updateSectionStyles = (sectionId: string, newStyles: any) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId ? { ...section, styles: newStyles } : section
      )
    );
  };

  const deleteSection = (sectionId: string) => {
    Alert.alert(
      "Delete Section",
      "Are you sure you want to delete this section?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setSections(sections.filter((s) => s.id !== sectionId));
          },
        },
      ]
    );
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const newSections = [...sections];
    if (direction === "up" && index > 0) {
      [newSections[index], newSections[index - 1]] = [
        newSections[index - 1],
        newSections[index],
      ];
    } else if (direction === "down" && index < sections.length - 1) {
      [newSections[index], newSections[index + 1]] = [
        newSections[index + 1],
        newSections[index],
      ];
    }
    setSections(newSections);
  };
  async function uploadImageToSupabase(
    uri: string,
    sectionId: string,
    fileName: string,
    existingPath?: string,
    uploadId?: string
  ) {
    try {
      console.log("☁️ Starting Supabase image upload...");
      console.log("📂 Upload details:", {
        uri,
        sectionId,
        fileName,
        existingPath,
      });

      if (!page) {
        throw new Error("Page object not available");
      }

      const fileExt = uri.split(".").pop()?.split("?")[0] || "png";
      const filePath = `${page.created_by}/${page.business_id}/${page.id}/${sectionId}/${fileName}`;
      const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      console.log("📁 Upload path:", filePath);
      console.log("📋 Content type:", contentType);

      // Use the resilient upload utility
      // Images are typically smaller, but we still benefit from retry logic
      const result = await uploadToSupabase({
        uri,
        filePath,
        contentType,
        bucket: 'uploads',
        upsert: true,
        maxRetries: 3,
        onProgress: (progress) => {
          console.log(`📊 Upload progress: ${progress}%`);
        },
        onProgressDetailed: (info) => {
          if (uploadId) setUploadEntry(uploadId, { ...info, fileName });
        },
      });

      console.log("✅ Image uploaded successfully to:", result.path);

      // Clean up old file if exists
      if (existingPath && normalizeStoragePathUtil(existingPath) !== result.path) {
        console.log("🗑️ Cleaning up old file:", existingPath);
        updateUploadData(existingPath, "remove");
      }

      return result.path;
    } catch (error: any) {
      console.error("💥 uploadImageToSupabase error:", error);
      if (error.message?.includes("timeout")) {
        throw new Error(
          "Upload timed out. Please check your internet connection and try again."
        );
      } else if (error.message?.includes("permission")) {
        throw new Error(
          "Permission denied. Please check your account permissions."
        );
      } else if (
        error.message?.includes("size") ||
        error.message?.includes("large")
      ) {
        throw new Error("File is too large. Please select a smaller image.");
      } else {
        throw new Error(error.message || "Upload failed. Please try again.");
      }
    }
  }
  const pickImage = async (
    sectionId: string,
    field?: string,
    existingPath?: string,
    options?: {
      allowCropping?: boolean;
      aspectRatio?: [number, number];
    }
  ): Promise<FileUploadData | undefined> => {
    console.log("📷 Starting image upload process...");
    console.log("📝 Parameters:", { sectionId, field, existingPath, options });

    if (!page) {
      console.error("❌ No page object available");
      Alert.alert("Error", "Page not found");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      console.error("❌ Camera roll permission denied");
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    try {
      console.log("📱 Opening image picker...");
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'] as any,
        allowsEditing: options?.allowCropping ?? false,
        quality: 0.8,
      };

      // Only add aspect ratio if cropping is enabled
      if (options?.allowCropping && options?.aspectRatio) {
        pickerOptions.aspect = options.aspectRatio;
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("❌ Image selection canceled");
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = `${asset.fileName || "image"}_${Date.now()}.${
        asset.uri.split(".").pop() || "jpg"
      }`;

      console.log("🖼️ Selected image:", {
        uri,
        fileName,
        width: asset.width,
        height: asset.height,
      });

      // Generate upload ID and start tracking
      const uploadId = `image_${sectionId}_${Date.now()}`;
      startUpload(uploadId);

      try {
        const path = await uploadImageToSupabase(
          uri,
          sectionId,
          fileName,
          existingPath,
          uploadId
        );

        if (path) {
          console.log("✅ Image upload completed:", path);
          if (field) {
            console.log("📝 Updating section data field:", field);
            updateSectionData(sectionId, { [field]: path });
          }
          if (updateUploadData) {
            updateUploadData(path, "add");
          }
          clearUploadEntry(uploadId);
          return { path, fileName };
        } else {
          throw new Error("Failed to get image path from upload");
        }
      } finally {
        // Always finish upload tracking
        finishUpload(uploadId);
      }
    } catch (error: any) {
      console.error("💥 Image picker/upload error:", error);
      Alert.alert(
        "Upload Error",
        error.message || "Failed to upload image. Please try again."
      );
      return undefined;
    }
  };
  const pickVideo = async (
    sectionId: string,
    field?: string,
    existingPath?: string
  ): Promise<FileUploadData | undefined> => {
    console.log("🎥 Starting Mux video upload process...");

    if (!page) {
      Alert.alert("Error", "Page not found");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uploadId = `video_${sectionId}_${Date.now()}`;
      startUpload(uploadId);

      setUploadEntry(uploadId, {
        bytesUploaded: 0,
        bytesTotal: 0,
        percentage: 0,
        muxPhase: 'uploading',
        fileName: asset.fileName || 'video',
      });

      try {
        const muxResult = await uploadToMux({
          uri: asset.uri,
          pageId: page.id,
          sectionId,
          onUploadProgress: (pct) => {
            setUploadEntry(uploadId, {
              bytesUploaded: pct,
              bytesTotal: 100,
              percentage: pct,
              muxPhase: 'uploading',
              fileName: asset.fileName || 'video',
            });
          },
          onProcessingUpdate: (phase) => {
            setUploadEntry(uploadId, {
              bytesUploaded: 100,
              bytesTotal: 100,
              percentage: 100,
              muxPhase: phase,
            });
          },
        });

        const muxUrl = muxResult.muxUrl;
        const thumbnail = muxResult.thumbnail;

        if (field) {
          updateSectionData(sectionId, { [field]: muxUrl });
        }
        if (updateUploadData) {
          updateUploadData(muxUrl, "add");
        }

        return { path: muxUrl, fileName: asset.fileName || 'video', thumbnailPath: thumbnail };
      } finally {
        finishUpload(uploadId);
        clearUploadEntry(uploadId);
      }
    } catch (error: any) {
      console.error("💥 Mux video upload error:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload video. Please try again.");
      return undefined;
    }
  };

  const pickImageFromFiles = async (
    sectionId: string,
    field?: string,
    existingPath?: string,
  ): Promise<FileUploadData | undefined> => {
    if (!page) {
      Alert.alert("Error", "Page not found");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = `${asset.name || "image"}_${Date.now()}`;

      const uploadId = `image_${sectionId}_${Date.now()}`;
      startUpload(uploadId);

      try {
        const path = await uploadImageToSupabase(uri, sectionId, fileName, existingPath, uploadId);

        if (path) {
          if (field) updateSectionData(sectionId, { [field]: path });
          if (updateUploadData) updateUploadData(path, "add");
          clearUploadEntry(uploadId);
          return { path, fileName };
        } else {
          throw new Error("Failed to get image path from upload");
        }
      } finally {
        finishUpload(uploadId);
      }
    } catch (error: any) {
      console.error("💥 File image upload error:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload image. Please try again.");
      return undefined;
    }
  };

  const pickVideoFromFiles = async (
    sectionId: string,
    field?: string,
  ): Promise<FileUploadData | undefined> => {
    if (!page) {
      Alert.alert("Error", "Page not found");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uploadId = `video_${sectionId}_${Date.now()}`;
      startUpload(uploadId);

      setUploadEntry(uploadId, {
        bytesUploaded: 0,
        bytesTotal: 0,
        percentage: 0,
        muxPhase: 'uploading',
        fileName: asset.name || 'video',
      });

      try {
        const muxResult = await uploadToMux({
          uri: asset.uri,
          pageId: page.id,
          sectionId,
          onUploadProgress: (pct) => {
            setUploadEntry(uploadId, {
              bytesUploaded: pct,
              bytesTotal: 100,
              percentage: pct,
              muxPhase: 'uploading',
              fileName: asset.name || 'video',
            });
          },
          onProcessingUpdate: (phase) => {
            setUploadEntry(uploadId, {
              bytesUploaded: 100,
              bytesTotal: 100,
              percentage: 100,
              muxPhase: phase,
            });
          },
        });

        const muxUrl = muxResult.muxUrl;
        const thumbnail = muxResult.thumbnail;

        if (field) updateSectionData(sectionId, { [field]: muxUrl });
        if (updateUploadData) updateUploadData(muxUrl, "add");

        return { path: muxUrl, fileName: asset.name || 'video', thumbnailPath: thumbnail };
      } finally {
        finishUpload(uploadId);
        clearUploadEntry(uploadId);
      }
    } catch (error: any) {
      console.error("💥 File video upload error:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload video. Please try again.");
      return undefined;
    }
  };

  const pickMediaFromDevice = async (
    sectionId: string,
    field?: string,
    existingPath?: string
  ): Promise<FileUploadData | undefined> => {
    console.log("📷 Starting media (photo/video) upload process...");

    if (!page) {
      Alert.alert("Error", "Page not found");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const isVideo = asset.type === "video";

      if (isVideo) {
        // Videos go through Mux
        const uploadId = `media_${sectionId}_${Date.now()}`;
        startUpload(uploadId);
        setUploadEntry(uploadId, {
          bytesUploaded: 0,
          bytesTotal: 0,
          percentage: 0,
          muxPhase: 'uploading',
          fileName: asset.fileName || 'video',
        });

        try {
          const muxResult = await uploadToMux({
            uri: asset.uri,
            pageId: page.id,
            sectionId,
            onUploadProgress: (pct) => {
              setUploadEntry(uploadId, {
                bytesUploaded: pct,
                bytesTotal: 100,
                percentage: pct,
                muxPhase: 'uploading',
                fileName: asset.fileName || 'video',
              });
            },
            onProcessingUpdate: (phase) => {
              setUploadEntry(uploadId, {
                bytesUploaded: 100,
                bytesTotal: 100,
                percentage: 100,
                muxPhase: phase,
              });
            },
          });

          if (field) updateSectionData(sectionId, { [field]: muxResult.muxUrl });
          if (updateUploadData) updateUploadData(muxResult.muxUrl, "add");
          return { path: muxResult.muxUrl, fileName: asset.fileName || 'video', thumbnailPath: muxResult.thumbnail };
        } finally {
          finishUpload(uploadId);
          clearUploadEntry(uploadId);
        }
      } else {
        // Photos go to Supabase Storage (unchanged)
        const uri = asset.uri;
        const fileName = `${asset.fileName || "image"}_${Date.now()}.${
          asset.uri.split(".").pop()?.split("?")[0] || "jpg"
        }`;
        const fileExt = uri.split(".").pop()?.split("?")[0] || "jpg";
        const filePath = `${page.created_by}/${page.business_id}/${page.id}/${sectionId}/${fileName}`;
        const contentType = `image/${fileExt}`;

        const uploadId = `media_${sectionId}_${Date.now()}`;
        startUpload(uploadId);

        try {
          const uploadResult = await uploadToSupabase({
            uri,
            filePath,
            contentType,
            bucket: 'uploads',
            upsert: true,
            maxRetries: 3,
            onProgress: (progress) => {
              if (uploadId) updateUploadProgress(uploadId, progress);
            },
            onProgressDetailed: (info) => {
              setUploadEntry(uploadId, { ...info, fileName });
            },
          });

          if (field) updateSectionData(sectionId, { [field]: uploadResult.path });
          if (updateUploadData) updateUploadData(uploadResult.path, "add");
          return { path: uploadResult.path, fileName };
        } finally {
          finishUpload(uploadId);
          clearUploadEntry(uploadId);
        }
      }
    } catch (error: any) {
      console.error("💥 Media picker/upload error:", error);
      Alert.alert("Upload Error", error.message || "Failed to upload media. Please try again.");
      return undefined;
    }
  };

  const uploadLocalFile = async (
    localUri: string,
    sectionId: string,
    fileName: string,
    contentType: string = 'image/jpeg'
  ): Promise<string | undefined> => {
    if (!page) return undefined;
    try {
      const uploadId = `scan_${sectionId}_${Date.now()}`;
      startUpload(uploadId);
      const filePath = `${page.created_by}/${page.business_id}/${page.id}/${sectionId}/${fileName}`;
      const result = await uploadToSupabase({
        uri: localUri,
        filePath,
        contentType,
        bucket: 'uploads',
        upsert: true,
        onProgress: (progress) => updateUploadProgress(uploadId, progress),
      });
      finishUpload(uploadId);
      if (updateUploadData) updateUploadData(result.path, 'add');
      return result.path;
    } catch (error: any) {
      console.error('💥 uploadLocalFile error:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload scanned document.');
      return undefined;
    }
  };

  const pickDocument = async (
    sectionId: string,
    field?: string,
    existingPath?: string
  ): Promise<FileUploadData | undefined> => {
    console.log("📄 Starting document upload process...");
    console.log("📝 Parameters:", { sectionId, field, existingPath });

    if (!page) {
      console.error("❌ No page object available");
      Alert.alert("Error", "Page not found");
      return;
    }

    // Prevent concurrent document picker operations
    if (isDocumentPickerActive) {
      console.log("⚠️ Document picker already active, skipping...");
      Alert.alert(
        "Please Wait",
        "A file picker is already open. Please complete or cancel the current selection first."
      );
      return;
    }

    setIsDocumentPickerActive(true);
    try {
      console.log("📱 Opening document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Accept all file types
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log("❌ Document selection canceled");
        setIsDocumentPickerActive(false);
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.name;
      const fileSize = asset.size || 0;
      const mimeType = asset.mimeType || "application/octet-stream";

      console.log("📄 Selected document:", {
        uri,
        fileName,
        fileSize,
        mimeType,
      });

      // File size check is now handled by the resilient upload utility
      // which supports up to 2GB (Supabase limit)

      // Generate upload ID and start tracking
      const uploadId = `document_${sectionId}_${Date.now()}`;
      startUpload(uploadId);

      try {
        console.log("☁️ Starting Supabase document upload...");
        const fileExt = fileName.split(".").pop() || "pdf";
        const filePath = `${page.created_by}/${page.business_id}/${page.id}/${sectionId}/${fileName}`;

        console.log("📁 Upload path:", filePath);

        // Use the resilient upload utility with progress tracking
        const result = await uploadToSupabase({
          uri,
          filePath,
          contentType: mimeType,
          bucket: 'uploads',
          upsert: true,
          maxRetries: 3,
          onProgress: (progress) => {
            console.log(`📊 Upload progress: ${progress}%`);
            updateUploadProgress(uploadId, progress);
          },
        });

        console.log("✅ Document uploaded successfully to:", result.path);

        // Clean up old file if exists
        if (existingPath && normalizeStoragePathUtil(existingPath) !== result.path) {
          console.log("🗑️ Cleaning up old file:", existingPath);
          updateUploadData(existingPath, "remove");
        }

        if (field) {
          console.log("📝 Updating section data field:", field);
          updateSectionData(sectionId, { [field]: result.path });
        }
        if (updateUploadData) {
          updateUploadData(result.path, "add");
        }

        return {
          path: result.path,
          fileName: fileName,
          fileSize: fileSize,
          fileType: mimeType,
        };
      } finally {
        // Always finish upload tracking
        finishUpload(uploadId);
      }
    } catch (error: any) {
      console.error("💥 Document picker/upload error:", error);
      Alert.alert(
        "Upload Error",
        error.message || "Failed to upload document. Please try again."
      );
      return undefined;
    } finally {
      // Always reset document picker state
      setIsDocumentPickerActive(false);
    }
  };

  const previewSection = (sectionId: string) => {
    console.log("🔍 Preview Section (Native):", sectionId);
    setPreviewMode('native');
    setPreviewSectionId(sectionId);
    setShowPreview(true);
  };

  const previewFullPage = () => {
    console.log("🔍 Preview Full Page (Native)");
    setPreviewMode('native');
    setPreviewSectionId(null); // null means full page
    setShowPreview(true);
  };

  const previewWebMode = () => {
    const rootUrl = (
      process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com"
    ).replace(/\/$/, "");
    const url = `${rootUrl}/${page?.slug || id}?preview=${true}`;
    console.log("🔍 Preview Web Mode:", url);
    setPreviewUrl(url);
    setPreviewMode('web');
    setShowPreview(true);
  };

  const RenderSectionEditor = (section: Section, index: number) => {
    console.log(
      `\n🎯 RenderSectionEditor called for: ${section?.type} (index: ${index})`
    );

    if (!section || !section.type) {
      console.error(`❌ Invalid section at index ${index}:`, section);
      return null;
    }

    const isSelected = selectedSection === section?.id;
    const definition = getLocalSectionDefinition(section?.type);

    if (!definition) {
      console.warn(`⚠️ Section ${section?.type} has no schema definition!`);
    }

    return (
      <SectionBlockPreview
        key={section?.id}
        section={section}
        isSelected={isSelected}
        onSelect={() => setSelectedSection(isSelected ? null : section?.id)}
        onEdit={() => setSelectedSection(section?.id)}
        onPreview={() => previewSection(section?.id)}
        onDelete={() => deleteSection(section?.id)}
        canMoveUp={false}
        canMoveDown={false}
        sectionDefinition={definition}
        editContent={
          isSelected ? (
            <>
              <View style={styles.editFieldsHeader}>
                <Ionicons name="create-outline" size={22} color="#ffffff" />
                <Text style={styles.editFieldsTitle}>
                  Edit {definition?.name || section.type}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedSection(null)}
                  style={styles.closeEditButton}
                >
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <View style={styles.editFieldsContent}>
                {renderSectionFields(section)}
              </View>
            </>
          ) : undefined
        }
      />
    );
  };

  const renderContactFields = (
    section: Section,
    definition: SectionDefinition
  ) => {
    console.log("📞 Rendering Contact fields using schema definition");

    return (
      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          value={section.data.title || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { title: text })
          }
          placeholder={definition.fields.title?.placeholder || "Contact Us"}
          placeholderTextColor="#999"
          maxLength={
            definition.fields.title?.type === "text"
              ? definition.fields.title.maxLength
              : undefined
          }
        />
        <TextInput
          style={styles.input}
          value={section.data.phone || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { phone: text })
          }
          placeholder={definition.fields.phone?.placeholder || "Phone Number"}
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={section.data.email || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { email: text })
          }
          placeholder={definition.fields.email?.placeholder || "Email Address"}
          placeholderTextColor="#999"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={section.data.address || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { address: text })
          }
          placeholder={definition.fields.address?.placeholder || "Address"}
          placeholderTextColor="#999"
          multiline
          numberOfLines={
            (definition.fields.address?.type === "textarea"
              ? (definition.fields.address as any).rows
              : undefined) || 3
          }
        />
        <SectionStylesEditor
          styles={section.styles}
          onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
        />
      </View>
    );
  };

  const renderGenericSection = (
    section: Section,
    definition: SectionDefinition
  ) => {
    console.log(`🔧 Rendering generic section for: ${section.type}`);

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.genericSectionBadge}>
          <Text style={styles.genericSectionBadgeText}>
            GENERIC: {definition.name}
          </Text>
        </View>

        {Object.entries(definition.fields).map(
          ([fieldName, fieldDef]: [string, any]) => {
            const value = section.data[fieldName] || "";

            switch (fieldDef.type) {
              case "text":
                return (
                  <View key={fieldName}>
                    <Text style={styles.fieldLabel}>{fieldDef.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={(text) =>
                        updateSectionData(section.id, { [fieldName]: text })
                      }
                      placeholder={fieldDef.placeholder}
                      placeholderTextColor="#999"
                      maxLength={fieldDef.maxLength}
                    />
                  </View>
                );

              case "textarea":
                return (
                  <View key={fieldName}>
                    <Text style={styles.fieldLabel}>{fieldDef.label}</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={value}
                      onChangeText={(text) =>
                        updateSectionData(section.id, { [fieldName]: text })
                      }
                      placeholder={fieldDef.placeholder}
                      placeholderTextColor="#999"
                      maxLength={fieldDef.maxLength}
                      multiline
                      numberOfLines={fieldDef.rows || 3}
                    />
                  </View>
                );

              default:
                return (
                  <View key={fieldName}>
                    <Text style={styles.fieldLabel}>
                      {fieldDef.label} ({fieldDef.type} - needs custom
                      implementation)
                    </Text>
                  </View>
                );
            }
          }
        )}

        <SectionStylesEditor
          styles={section.styles}
          onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
        />
      </View>
    );
  };

  const renderSectionFields = (section: Section) => {
    console.log(
      `\n🎨 Rendering fields for section: ${section.type} (ID: ${section.id})`
    );

    try {
      const definition = getLocalSectionDefinition(section.type);

      if (!definition) {
        console.error(
          `❌ No schema definition found for section type: ${section.type}`
        );
        return (
          <View style={styles.fieldContainer}>
            <Text style={[styles.placeholderText, { color: "red" }]}>
              ❌ Unknown section type: {section?.type}
            </Text>
            <Text style={[styles.placeholderText, { fontSize: 12 }]}>
              Available types: {Object.keys(SECTION_DEFINITIONS).join(", ")}
            </Text>
          </View>
        );
      }

      console.log(
        `✅ Found definition for ${section?.type}, proceeding with render`
      );

      // Handle sections with custom editors
      switch (section.type) {
        case "hero":
          console.log("🎭 Rendering Hero editor");
          return (
            <HeroEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
              page={page}
              updateUploadData={updateUploadData}
            />
          );

        case "about":
          console.log("ℹ️ Rendering About editor");
          return (
            <AboutEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
              page={page}
              updateUploadData={updateUploadData}
            />
          );

        case "contact":
          console.log("📞 Rendering Contact editor (SCHEMA-BASED)");
          return renderContactFields(section, definition);

        case "personalContact":
          console.log("👤 Rendering Personal Contact editor");
          return (
            <PersonalContactEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
            />
          );

        case "gallery":
          console.log("🖼️ Rendering Gallery editor");
          return (
            <GalleryEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              pickVideo={pickVideo}
              pickImageFromFiles={pickImageFromFiles}
              pickVideoFromFiles={pickVideoFromFiles}
              updateSectionStyles={updateSectionStyles}
              page={page}
              updateUploadData={updateUploadData}
            />
          );

        case "features":
          console.log("⭐ Rendering Features editor");
          return (
            <EnhancedFeaturesEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
            />
          );

        case "testimonials":
          console.log(
            "💬 Rendering NEW Testimonials editor with separate avatar/media"
          );
          return (
            <TestimonialsEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
              pickVideo={pickVideo}
            />
          );

        case "faq":
          console.log("❓ Rendering FAQ editor");
          return (
            <FAQEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
            />
          );

        case "cta":
          console.log("📢 Rendering CTA editor");
          return (
            <CTAEditor
              section={section}
              updateSectionData={updateSectionData}
              pickImage={pickImage}
              updateSectionStyles={updateSectionStyles}
            />
          );

        case "multiContact":
          console.log("👥 Rendering Multi-Contact editor");
          return (
            <MultiContactEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
            />
          );

        case "medicalProvider":
          console.log("🏥 Rendering Medical Provider editor");
          return (
            <MedicalProviderEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
              updateUploadData={updateUploadData}
              page={page}
            />
          );

        case "companyHeader":
          console.log("🏢 Rendering Company Header editor");
          return (
            <CompanyHeaderEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
            />
          );

        case "contactCard":
          console.log("👤 Rendering Contact Card editor");
          return (
            <ContactCardEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
            />
          );

        case "amenities":
          console.log("✨ Rendering Amenities editor");
          return (
            <AmenitiesEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
            />
          );

        case "linksWithContact":
          return (
            <LinksWithContactEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
              pickImage={pickImage}
              pickDocument={pickDocument}
              pickMediaFromDevice={pickMediaFromDevice}
              pickImageFromFiles={pickImageFromFiles}
              pickVideoFromFiles={pickVideoFromFiles}
              uploadLocalFile={uploadLocalFile}
            />
          );

        case "socialLinks":
          return (
            <SocialLinksEditor
              section={section}
              updateSectionData={updateSectionData}
              updateSectionStyles={updateSectionStyles}
            />
          );

        default:
          console.log(`🔧 Using generic renderer for: ${section.type}`);
          return renderGenericSection(section, definition);
      }
    } catch (error: any) {
      console.error(`💥 Error rendering section ${section.type}:`, error);
      return (
        <View style={styles.fieldContainer}>
          <Text style={[styles.placeholderText, { color: "red" }]}>
            💥 Error rendering {section.type}
          </Text>
          <Text style={[styles.placeholderText, { fontSize: 12 }]}>
            {error.message}
          </Text>
        </View>
      );
    }
  };

  const updatePageStyles = async () => {
    if (!page) return;
    setIsUpdatingStyles(true);
    try {
      const { error } = await supabase
        .from("pages")
        .update({ styles: pageStyles, updated_at: new Date().toISOString() })
        .eq("id", page.id);
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

  const performSave = async (showAlert: boolean = true) => {
    if (!page) return;

    // Prevent saving during uploads
    if (isUploading) {
      if (showAlert) {
        Alert.alert(
          "Upload in Progress",
          "Please wait for image/video uploads to complete before saving.",
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
        .from("pages")
        .update({
          content: { sections },
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
      const currentData = JSON.stringify({ sections, pageStyles });
      initialDataRef.current = currentData;

      if (showAlert) Alert.alert("Success", "Page saved successfully");
    } catch (error) {
      console.error("Error saving page:", error);
      setSaveStatus("error");
      if (showAlert) Alert.alert("Error", "Failed to save page");
    } finally {
      setIsSaving(false);
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
                  "Please wait for image/video uploads to complete before leaving.",
                  [{ text: "OK" }]
                );
                return;
              }
              removeUnsavedImages("added");
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
            <Text style={styles.headerTitle}>Edit Page</Text>
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
              onPress={() => {
                // Open preview in device browser instead of WebView
                const rootUrl = (
                  process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com'
                ).replace(/\/$/, '');
                const previewUrl = `${rootUrl}/${page?.business?.slug}/${page?.slug}?preview=true`;
                Linking.openURL(previewUrl);
              }}
              style={styles.headerButton}
            >
              <Ionicons name="eye-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => performSave(true)}
              style={[
                styles.saveButton,
                (isSaving || saveStatus === "saving" || isUploading) &&
                  styles.disabledButton,
              ]}
              disabled={isSaving || saveStatus === "saving" || isUploading}
            >
              {isUploading ? (
                <View style={styles.uploadIndicator}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}>Uploading...</Text>
                </View>
              ) : isSaving || saveStatus === "saving" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* <DigitalBrochure pageId={pageId} sections={sections} /> */}

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
              disabled={isSaving || saveStatus === "saving" || isUploading}
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
              <Text style={styles.pageTitle}>{page?.title}</Text>
              <Text style={styles.pageDescription}>{page?.description}</Text>
            </View>

            {sections.flatMap((section, index) => {
              if (section.type !== 'linksWithContact') {
                return [RenderSectionEditor(section, index)];
              }
              // Split linksWithContact into two independently-editable cards
              const linksKey = `${section.id}_links`;
              const contactKey = `${section.id}_contact`;
              const linksDef = getLocalSectionDefinition('linksWithContact_links');
              const contactDef = getLocalSectionDefinition('linksWithContact_contact');

              const makeEditHeader = (label: string) => (
                <View style={styles.editFieldsHeader}>
                  <Ionicons name="create-outline" size={22} color="#ffffff" />
                  <Text style={styles.editFieldsTitle}>{label}</Text>
                  <TouchableOpacity onPress={() => setSelectedSection(null)} style={styles.closeEditButton}>
                    <Ionicons name="close" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              );

              return [
                <SectionBlockPreview
                  key={linksKey}
                  section={{ ...section, type: 'linksWithContact_links' }}
                  isSelected={selectedSection === linksKey}
                  onSelect={() => setSelectedSection(selectedSection === linksKey ? null : linksKey)}
                  onEdit={() => setSelectedSection(linksKey)}
                  onPreview={() => previewSection(section.id)}
                  onDelete={() => deleteSection(section.id)}
                  canMoveUp={false}
                  canMoveDown={false}
                  sectionDefinition={linksDef}
                  editContent={selectedSection === linksKey ? (
                    <>
                      {makeEditHeader('Edit Pages')}
                      <View style={styles.editFieldsContent}>
                        <LinksWithContactEditor
                          section={section}
                          updateSectionData={updateSectionData}
                          updateSectionStyles={updateSectionStyles}
                          pickImage={pickImage}
                          pickDocument={pickDocument}
                          pickMediaFromDevice={pickMediaFromDevice}
                          pickImageFromFiles={pickImageFromFiles}
                          pickVideoFromFiles={pickVideoFromFiles}
                          uploadLocalFile={uploadLocalFile}
                          mode="links"
                        />
                      </View>
                    </>
                  ) : undefined}
                />,
                <SectionBlockPreview
                  key={contactKey}
                  section={{ ...section, type: 'linksWithContact_contact' }}
                  isSelected={selectedSection === contactKey}
                  onSelect={() => setSelectedSection(selectedSection === contactKey ? null : contactKey)}
                  onEdit={() => setSelectedSection(contactKey)}
                  onPreview={() => previewSection(section.id)}
                  onDelete={() => deleteSection(section.id)}
                  canMoveUp={false}
                  canMoveDown={false}
                  sectionDefinition={contactDef}
                  editContent={selectedSection === contactKey ? (
                    <>
                      {makeEditHeader('Edit Contact Button')}
                      <View style={styles.editFieldsContent}>
                        <LinksWithContactEditor
                          section={section}
                          updateSectionData={updateSectionData}
                          updateSectionStyles={updateSectionStyles}
                          pickImage={pickImage}
                          mode="contact"
                        />
                      </View>
                    </>
                  ) : undefined}
                />,
              ];
            })}

            {/* Add Section button intentionally hidden — fixed layout, sections are auto-injected */}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Save Button */}
        {!autosaveEnabled && hasUnsavedChanges && (
          <View style={styles.floatingSaveContainer}>
            <TouchableOpacity
              onPress={() => performSave(true)}
              style={[
                styles.floatingSaveButton,
                (isSaving || saveStatus === "saving" || isUploading) &&
                  styles.disabledButton,
              ]}
              disabled={isSaving || saveStatus === "saving" || isUploading}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.floatingSaveText}>Uploading...</Text>
                </>
              ) : isSaving || saveStatus === "saving" ? (
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

        {/* Add Section Modal — hidden, sections are auto-injected in fixed layout order */}

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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#ddd",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: "#fff",
                    marginBottom: 12,
                  }}
                  onPress={() => {
                    setPrimaryHexInput(
                      (pageStyles.primary || "#007AFF").replace("#", "")
                    );
                    setShowPrimaryColorPicker(true);
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: "#ddd",
                      backgroundColor: pageStyles?.primary || "#007AFF",
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#333",
                      fontFamily: "monospace",
                    }}
                  >
                    {pageStyles?.primary || "#007AFF"}
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
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      justifyContent: "flex-end",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                        maxHeight: "90%",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "600",
                            color: "#000",
                          }}
                        >
                          Select Primary Color
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowPrimaryColorPicker(false)}
                        >
                          <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "#f5f5f5",
                          borderRadius: 8,
                          padding: 8,
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            color: "#666",
                            marginRight: 4,
                            fontFamily: "monospace",
                          }}
                        >
                          #
                        </Text>
                        <TextInput
                          style={{
                            flex: 1,
                            fontSize: 16,
                            color: "#333",
                            fontFamily: "monospace",
                            padding: 4,
                          }}
                          value={primaryHexInput}
                          onChangeText={(text) => {
                            setPrimaryHexInput(text);
                            const hexColor = text.startsWith("#")
                              ? text
                              : `#${text}`;
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(hexColor)) {
                              setPageStyles({
                                ...pageStyles,
                                primary: hexColor,
                              });
                            }
                          }}
                          placeholder="007AFF"
                          maxLength={6}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          keyboardType="default"
                        />
                      </View>
                      <ColorPicker
                        style={{ width: "100%" }}
                        value={pageStyles?.primary || "#007AFF"}
                        onCompleteJS={(color) => {
                          setPageStyles({
                            ...pageStyles,
                            primary: color.hex,
                          });
                          setPrimaryHexInput(color.hex.replace("#", ""));
                        }}
                      >
                        <Preview
                          style={{
                            marginBottom: 16,
                            borderRadius: 8,
                            height: 40,
                          }}
                        />
                        <Panel1
                          style={{
                            borderRadius: 8,
                            marginBottom: 16,
                            height: 200,
                          }}
                        />
                        <HueSlider
                          style={{
                            borderRadius: 8,
                            marginBottom: 16,
                            height: 32,
                          }}
                        />
                        <OpacitySlider
                          style={{
                            borderRadius: 8,
                            marginBottom: 16,
                            height: 32,
                          }}
                        />
                        <Swatches style={{ marginBottom: 16, gap: 12 }} />
                      </ColorPicker>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#007AFF",
                          padding: 16,
                          borderRadius: 12,
                          alignItems: "center",
                          marginTop: 8,
                        }}
                        onPress={() => setShowPrimaryColorPicker(false)}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
                <Text style={styles.fieldLabel}>Font Family</Text>
                <TextInput
                  style={styles.input}
                  value={pageStyles.fontFamily}
                  onChangeText={(text) =>
                    setPageStyles({
                      ...pageStyles,
                      fontFamily: text,
                    })
                  }
                  placeholder="System"
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: "#007AFF",
                    padding: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    marginTop: 16,
                  }}
                  onPress={updatePageStyles}
                  disabled={isUpdatingStyles}
                >
                  {isUpdatingStyles ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      Save Styles
                    </Text>
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
            {previewMode === 'native' ? (
              // Native Preview Mode
              <PagePreview
                sections={previewSectionId ? sections.filter(s => s.id === previewSectionId) : sections}
                pageTitle={previewSectionId ? `Preview: ${sections.find(s => s.id === previewSectionId)?.type}` : page?.title || 'Preview'}
                showHeader={true}
                onBack={() => setShowPreview(false)}
              />
            ) : (
              // Web Preview Mode (fallback)
              <>
                <View style={styles.previewHeader}>
                  <TouchableOpacity
                    onPress={() => setShowPreview(false)}
                    style={styles.previewBackButton}
                  >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                  </TouchableOpacity>
                  <Text style={styles.previewTitle}>Web Preview</Text>
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
                    onError={(syntheticEvent: any) => {
                      const { nativeEvent } = syntheticEvent;
                      console.error("❌ WebView Error:", nativeEvent);
                      Alert.alert(
                        "Preview Error",
                        `Failed to load preview: ${
                          nativeEvent.description || "Unknown error"
                        }`
                      );
                    }}
                  />
                ) : (
                  <View style={styles.previewErrorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#999" />
                    <Text style={styles.previewErrorText}>
                      No preview URL available
                    </Text>
                  </View>
                )}
              </>
            )}
          </SafeAreaView>
        </Modal>

        {/* Upload Progress Banner — stays visible across concurrent uploads */}
        <UploadProgressModal
          visible={uploadQueueCount > 0}
          progress={activeUploadInfo}
          queueCount={uploadQueueCount}
        />
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
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  disabledButton: {
    opacity: 0.5,
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
  sectionContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedSection: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  editFieldsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 20,
  },
  editFieldsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginLeft: 12,
    flex: 1,
  },
  closeEditButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  editFieldsContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "#ffffff",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  sectionActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  fieldContainer: {
    padding: 0,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 8,
    color: "#1a1a1a",
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#f0f8ff",
  },
  imageButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
  },
  addSectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addSectionText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    padding: 16,
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
  sectionTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTypeName: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  styleOptions: {
    padding: 16,
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
    width: 32, // Same width as back button to center the title
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
  genericSectionBadge: {
    backgroundColor: "#eee",
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  genericSectionBadgeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
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
});
