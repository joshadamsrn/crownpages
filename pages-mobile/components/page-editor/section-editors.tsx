import { FileUploadData } from "@/app/(app)/page-editor/[id]";
import { Page, Testimonial } from "@/types/page-builder.types";
import { generatePublicUrl } from "@/utils/supabase";
import { getMuxStreamUrl, getMuxThumbnail, isMuxUrl } from "@/utils/mux-upload";
import { getSectionDefinition } from "@crown-pages/types";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
import { useVideoPlayer, VideoView } from "expo-video";
import { FC, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DocumentScanner from "react-native-document-scanner-plugin";
import { IconPicker } from "../common/IconPicker";
import { LinkTypeSelector } from "../common/LinkTypeSelector";
import VideoModal from "../common/VideoModal";

type SectionEditorProps = {
  section: any;
  updateSectionData: (sectionId: string, newData: any) => void;
  updateSectionStyles: (sectionId: string, styles: any) => void;
  pickImage: (
    sectionId: string,
    field?: string,
    existingPath?: string,
    options?: {
      allowCropping?: boolean;
      aspectRatio?: [number, number];
    },
  ) => Promise<FileUploadData | undefined>;
  setImagesData?: any;
  imagesData?: any;
  page?: Page | null;
  updateUploadData?: (url: string, type: "remove" | "add") => void;
  pickVideo?: (
    sectionId: string,
    field?: string,
    uri?: string,
  ) => Promise<FileUploadData | undefined>;
  pickDocument?: (
    sectionId: string,
    field?: string,
    existingPath?: string,
  ) => Promise<FileUploadData | undefined>;
  pickMediaFromDevice?: (
    sectionId: string,
    field?: string,
    existingPath?: string,
  ) => Promise<FileUploadData | undefined>;
  pickImageFromFiles?: (
    sectionId: string,
    field?: string,
    existingPath?: string,
  ) => Promise<FileUploadData | undefined>;
  pickVideoFromFiles?: (
    sectionId: string,
    field?: string,
  ) => Promise<FileUploadData | undefined>;
  uploadLocalFile?: (
    localUri: string,
    sectionId: string,
    fileName: string,
    contentType?: string,
  ) => Promise<string | undefined>;
  /** When set, renders only that half of the linksWithContact editor */
  mode?: "links" | "contact" | "all";
};

export const GalleryEditor = ({
  section,
  updateSectionData,
  pickImage,
  updateSectionStyles,
  page,
  updateUploadData,
  pickVideo,
  pickImageFromFiles,
  pickVideoFromFiles,
}: SectionEditorProps) => {
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState<{ [id: string]: boolean }>(
    {},
  );
  const [loadingVideos, setLoadingVideos] = useState<{ [id: string]: boolean }>(
    {},
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [galleryVideoModalVisible, setGalleryVideoModalVisible] =
    useState(false);
  const [selectedGalleryVideo, setSelectedGalleryVideo] = useState<
    string | null
  >(null);
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    const loadPublicUrls = async () => {
      // Images
      if (!section?.data?.images || section.data.images.length === 0) {
        setGalleryImages([]);
      } else {
        const imagesWithUrls = await Promise.all(
          section.data.images.map(async (image: any) => {
            setLoadingImages((prev) => ({ ...prev, [image.id]: true }));
            const publicUrl = generatePublicUrl(image.url);
            setLoadingImages((prev) => ({ ...prev, [image.id]: false }));
            return { ...image, publicUrl };
          }),
        );
        setGalleryImages(imagesWithUrls);
      }
      // Videos
      if (!section?.data?.videos || section.data.videos.length === 0) {
        setGalleryVideos([]);
      } else {
        const videosWithUrls = await Promise.all(
          section.data.videos.map(async (video: any) => {
            setLoadingVideos((prev) => ({ ...prev, [video.id]: true }));
            // Mux videos: use HLS stream URL for playback and Mux thumbnail for display
            const publicUrl = isMuxUrl(video.url)
              ? getMuxStreamUrl(video.url)
              : generatePublicUrl(video.url);
            const resolvedThumbnail = isMuxUrl(video.url)
              ? (video.thumbnail && video.thumbnail.startsWith('http') ? video.thumbnail : getMuxThumbnail(video.url))
              : (video.thumbnail ? generatePublicUrl(video.thumbnail) : null);
            setLoadingVideos((prev) => ({ ...prev, [video.id]: false }));
            return { ...video, publicUrl, resolvedThumbnail };
          }),
        );
        setGalleryVideos(videosWithUrls);
      }
    };
    loadPublicUrls();
  }, [section?.data?.images, section?.data?.videos]);

  const addGalleryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }
    setUploadingImage(true);
    const result = await pickImage(section?.id, undefined, undefined, {
      allowCropping: false, // Gallery images should not force cropping
    });
    if (result) {
      const { path, fileName } = result;
      const currentImages = section.data.images || [];

      updateSectionData(section.id, {
        images: [...currentImages, { id: fileName, url: path }],
      });
    }

    setUploadingImage(false);
  };

  const addGalleryVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant camera roll permissions");
      return;
    }
    setUploadingVideo(true);
    if (pickVideo) {
      const result = await pickVideo(section?.id);
      if (result) {
        const { path, fileName, thumbnailPath } = result;
        const currentVideos = section.data.videos || [];
        updateSectionData(section.id, {
          videos: [
            ...currentVideos,
            { id: fileName, url: path, thumbnail: thumbnailPath || null },
          ],
        });
      }
      setUploadingVideo(false);
    }
  };

  const removeGalleryImage = (imageId: string, imageUrl: string) => {
    if (updateUploadData && imageUrl) {
      updateUploadData(imageUrl, "remove");
    }
    const updatedImages = section.data.images.filter(
      (img: any) => img.id !== imageId,
    );
    updateSectionData(section.id, { images: updatedImages });
  };

  const removeGalleryVideo = (videoId: string, videoUrl: string) => {
    if (updateUploadData && videoUrl) {
      updateUploadData(videoUrl, "remove");
    }
    const updatedVideos = section.data.videos.filter(
      (vid: any) => vid.id !== videoId,
    );
    updateSectionData(section.id, { videos: updatedVideos });
  };

  const addImageFromUrl = () => {
    if (!imageUrl.trim()) {
      Alert.alert("Error", "Please enter a valid image URL");
      return;
    }
    const currentImages = section.data.images || [];
    const newImage = {
      id: `url_${Date.now()}`,
      url: imageUrl.trim(),
    };
    updateSectionData(section.id, {
      images: [...currentImages, newImage],
    });
    setImageUrl("");
    setShowImageUrlInput(false);
  };

  const addVideoFromUrl = () => {
    if (!videoUrl.trim()) {
      Alert.alert("Error", "Please enter a valid video URL");
      return;
    }
    const currentVideos = section.data.videos || [];
    const newVideo = {
      id: `url_${Date.now()}`,
      url: videoUrl.trim(),
    };
    updateSectionData(section.id, {
      videos: [...currentVideos, newVideo],
    });
    setVideoUrl("");
    setShowVideoUrlInput(false);
  };

  // Utility to chunk images/videos into rows of 2
  function chunkArray(array: any[], size: number) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Gallery Title"
        placeholderTextColor="#999"
      />
      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />

      {/* Gallery Images Grid */}
      {chunkArray(galleryImages, 2).map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", marginBottom: 12 }}>
          {row.map((image: any) => (
            <View
              key={image.id}
              style={[styles.galleryImageContainer, { marginRight: 12 }]}
            >
              <View
                style={{
                  minHeight: 40,
                  minWidth: 40,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Image
                  source={{ uri: image.publicUrl }}
                  style={styles.galleryImage}
                  onLoadStart={() =>
                    setLoadingImages((prev) => ({ ...prev, [image.id]: true }))
                  }
                  onLoadEnd={() =>
                    setLoadingImages((prev) => ({ ...prev, [image.id]: false }))
                  }
                />
                {loadingImages[image.id] && (
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                    style={{ position: "absolute" }}
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeGalleryImage(image.id, image.url)}
              >
                <Ionicons name="close-circle" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
      {/* Gallery Videos Grid */}
      {chunkArray(galleryVideos, 2).map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", marginBottom: 12 }}>
          {row.map((video: any) => (
            <View
              key={video.id}
              style={[styles.galleryImageContainer, { marginRight: 12 }]}
            >
              <View
                style={{
                  minHeight: 40,
                  minWidth: 40,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <VideoThumbnail
                  videoUrl={video.publicUrl}
                  thumbnailUrl={video.resolvedThumbnail ?? null}
                  onPress={() => {
                    setSelectedGalleryVideo(video.publicUrl);
                    setGalleryVideoModalVisible(true);
                  }}
                />
                {loadingVideos[video.id] && (
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                    style={{ position: "absolute" }}
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeGalleryVideo(video.id, video.url)}
              >
                <Ionicons name="close-circle" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}

      {/* Add Image Section */}
      <View style={{ marginTop: 16 }}>
        <Text style={styles.fieldLabel}>Add Images</Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            style={[styles.addImageButton, { flex: 1 }]}
            onPress={() => {
              Alert.alert("Add Image From", undefined, [
                { text: "Photo Library", onPress: () => addGalleryImage() },
                { text: "Files", onPress: async () => {
                  if (!pickImageFromFiles) return;
                  setUploadingImage(true);
                  try {
                    const result = await pickImageFromFiles(section?.id);
                    if (result) {
                      const existing = section?.data?.images || [];
                      updateSectionData(section?.id, { images: [...existing, { id: result.fileName, url: result.path }] });
                    }
                  } finally { setUploadingImage(false); }
                }},
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            disabled={uploadingImage}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
            <Text style={styles.addImageText}>Upload</Text>
            {uploadingImage && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addImageButton, { flex: 1 }]}
            onPress={() => setShowImageUrlInput(!showImageUrlInput)}
          >
            <Ionicons name="link-outline" size={24} color="#007AFF" />
            <Text style={styles.addImageText}>From URL</Text>
          </TouchableOpacity>
        </View>

        {showImageUrlInput && (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Paste image URL..."
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.imageButton, { paddingHorizontal: 16 }]}
              onPress={addImageFromUrl}
            >
              <Text style={styles.imageButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Video Section */}
      <View style={{ marginTop: 16 }}>
        <Text style={styles.fieldLabel}>Add Videos</Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <TouchableOpacity
            style={[styles.addImageButton, { flex: 1 }]}
            onPress={() => {
              Alert.alert("Add Video From", undefined, [
                { text: "Photo Library", onPress: () => addGalleryVideo() },
                { text: "Files", onPress: async () => {
                  if (!pickVideoFromFiles) return;
                  setUploadingVideo(true);
                  try {
                    const result = await pickVideoFromFiles(section?.id);
                    if (result) {
                      const existing = section?.data?.videos || [];
                      updateSectionData(section?.id, { videos: [...existing, { id: result.fileName, url: result.path, thumbnail: result.thumbnailPath || null }] });
                    }
                  } finally { setUploadingVideo(false); }
                }},
                { text: "Cancel", style: "cancel" },
              ]);
            }}
            disabled={uploadingVideo}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
            <Text style={styles.addImageText}>Upload</Text>
            {uploadingVideo && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addImageButton, { flex: 1 }]}
            onPress={() => setShowVideoUrlInput(!showVideoUrlInput)}
          >
            <Ionicons name="link-outline" size={24} color="#007AFF" />
            <Text style={styles.addImageText}>From URL</Text>
          </TouchableOpacity>
        </View>

        {showVideoUrlInput && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="Paste video URL..."
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={[styles.imageButton, { paddingHorizontal: 16 }]}
              onPress={addVideoFromUrl}
            >
              <Text style={styles.imageButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Gallery Video Modal for playing video */}
      <VideoModal
        visible={galleryVideoModalVisible}
        videoUrl={selectedGalleryVideo}
        onClose={() => setGalleryVideoModalVisible(false)}
      />
    </View>
  );
};

export const HeroEditor = ({
  section,
  updateSectionData,
  pickImage,
  updateSectionStyles,
  page,
  updateUploadData,
}: SectionEditorProps) => {
  const [heroImg, setHeroImg] = useState<string>("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [logoImg, setLogoImg] = useState("");
  const [backgroundInputMode, setBackgroundInputMode] = useState<
    "upload" | "url"
  >("upload");
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "url">(
    "upload",
  );
  console.log("this is the url of logo image", logoImg);

  useEffect(() => {
    const loadImage = async () => {
      if (!section?.data?.backgroundImage) {
        setHeroImg("");
        return;
      }
      setLoadingImage(true);
      const url = generatePublicUrl(section?.data?.backgroundImage);
      if (url) setHeroImg(url);
      setLoadingImage(false);
    };
    loadImage();
  }, [section?.data?.backgroundImage]);

  const handlePickImage = async () => {
    setUploadingImage(true);
    await pickImage(
      section.id,
      "backgroundImage",
      section?.data?.backgroundImage,
      {
        allowCropping: true,
        aspectRatio: [16, 9], // Background images benefit from consistent aspect ratio
      },
    );
    setUploadingImage(false);
  };

  useEffect(() => {
    const loadLogo = async () => {
      if (!section?.data?.logoUrl) {
        setLogoImg("");
        return;
      }
      const url = generatePublicUrl(section?.data?.logoUrl);
      if (url) setLogoImg(url);
    };
    loadLogo();
  }, [section?.data?.logoUrl]);

  const handleLogoImage = async () => {
    setUploadingImage(true);
    const result = await pickImage(
      section.id,
      "logoUrl",
      section?.data?.logoUrl,
      {
        allowCropping: true,
        aspectRatio: [1, 1], // Square logo
      },
    );
    setUploadingImage(false);
  };

  return (
    <>
      <View style={styles.fieldContainer}>
        {/* Background Image Input Toggle */}
        <Text style={styles.fieldLabel}>Background Image</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              backgroundInputMode === "upload" && styles.toggleButtonActive,
            ]}
            onPress={() => setBackgroundInputMode("upload")}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={backgroundInputMode === "upload" ? "#FFFFFF" : "#666"}
            />
            <Text
              style={[
                styles.toggleButtonText,
                backgroundInputMode === "upload" &&
                  styles.toggleButtonTextActive,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              backgroundInputMode === "url" && styles.toggleButtonActive,
            ]}
            onPress={() => setBackgroundInputMode("url")}
          >
            <Ionicons
              name="link-outline"
              size={20}
              color={backgroundInputMode === "url" ? "#FFFFFF" : "#666"}
            />
            <Text
              style={[
                styles.toggleButtonText,
                backgroundInputMode === "url" && styles.toggleButtonTextActive,
              ]}
            >
              URL
            </Text>
          </TouchableOpacity>
        </View>

        {backgroundInputMode === "upload" ? (
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            <Ionicons name="image-outline" size={24} color="#007AFF" />
            <Text style={styles.imageButtonText}>
              {heroImg ? "Change Background" : "Upload Background"}
            </Text>
            {uploadingImage && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            value={section.data.backgroundImage || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { backgroundImage: text })
            }
            placeholder="Paste image URL (e.g., https://...)"
            placeholderTextColor="#999"
          />
        )}

        <View
          style={{
            minHeight: 40,
            minWidth: 40,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {heroImg ? (
            <Image
              source={{ uri: heroImg }}
              style={styles.previewImage}
              onLoadStart={() => setLoadingImage(true)}
              onLoadEnd={() => setLoadingImage(false)}
            />
          ) : null}
          {(loadingImage || uploadingImage) && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={{ position: "absolute" }}
            />
          )}
        </View>
        <View style={styles.divider} />

        {/* Logo Input Toggle */}
        <Text style={styles.fieldLabel}>Logo Image (Overlay)</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              logoInputMode === "upload" && styles.toggleButtonActive,
            ]}
            onPress={() => setLogoInputMode("upload")}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={logoInputMode === "upload" ? "#FFFFFF" : "#666"}
            />
            <Text
              style={[
                styles.toggleButtonText,
                logoInputMode === "upload" && styles.toggleButtonTextActive,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              logoInputMode === "url" && styles.toggleButtonActive,
            ]}
            onPress={() => setLogoInputMode("url")}
          >
            <Ionicons
              name="link-outline"
              size={20}
              color={logoInputMode === "url" ? "#FFFFFF" : "#666"}
            />
            <Text
              style={[
                styles.toggleButtonText,
                logoInputMode === "url" && styles.toggleButtonTextActive,
              ]}
            >
              URL
            </Text>
          </TouchableOpacity>
        </View>

        {logoInputMode === "upload" ? (
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handleLogoImage}
            disabled={uploadingImage}
          >
            <Ionicons name="image-outline" size={24} color="#007AFF" />
            <Text style={styles.imageButtonText}>
              {logoImg ? "Change Logo" : "Upload Logo"}
            </Text>
            {uploadingImage && (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.input}
            value={section.data.logoUrl || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { logoUrl: text })
            }
            placeholder="Paste logo URL (e.g., https://...)"
            placeholderTextColor="#999"
          />
        )}

        <View
          style={{
            minHeight: 40,
            minWidth: 40,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {logoImg ? (
            <Image
              source={{ uri: logoImg }}
              style={styles.previewImage}
              onLoadStart={() => setLoadingImage(true)}
              onLoadEnd={() => setLoadingImage(false)}
            />
          ) : null}
          {(loadingImage || uploadingImage) && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={{ position: "absolute" }}
            />
          )}
        </View>
        <View style={styles.divider} />
        {/* <Text style={styles.fieldLabel}>Button</Text>
        <TextInput
          style={styles.input}
          value={section.data.ctaButton?.text}
          onChangeText={(text) =>
            updateSectionData(section.id, {
              ctaButton: { ...section.data.ctaButton, text },
            })
          }
          placeholder="Button Text"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          value={section.data.ctaButton?.link}
          onChangeText={(text) =>
            updateSectionData(section.id, {
              ctaButton: { ...section.data.ctaButton, link: text },
            })
          }
          placeholder="Button Link (URL, tel:, mailto:)"
          placeholderTextColor="#999"
        /> */}
        {/* <SectionStylesEditor
          styles={section.styles}
          onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
        /> */}
      </View>
    </>
  );
};

export const AboutEditor = ({
  section,
  updateSectionData,
  pickImage,
  updateSectionStyles,
  page,
  updateUploadData,
}: SectionEditorProps) => {
  const [aboutImg, setAboutImg] = useState<string>("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!section?.data?.image) {
        setAboutImg("");
        return;
      }
      setLoadingImage(true);
      const url = generatePublicUrl(section?.data?.image);
      if (url) setAboutImg(url);
      setLoadingImage(false);
    };
    loadImage();
  }, [section?.data?.image]);

  const handlePickImage = async () => {
    setUploadingImage(true);
    await pickImage(section.id, "image", section?.data?.image, {
      allowCropping: true,
      aspectRatio: [16, 9], // About section images benefit from consistent aspect ratio
    });
    setUploadingImage(false);
  };

  return (
    <>
      <View style={styles.fieldContainer}>
        <TextInput
          style={styles.input}
          value={section.data.title}
          onChangeText={(text) =>
            updateSectionData(section.id, { title: text })
          }
          placeholder="Title"
          placeholderTextColor="#999"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={section.data.content}
          onChangeText={(text) =>
            updateSectionData(section.id, { content: text })
          }
          placeholder="Content"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
        {/* <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImage}
          disabled={uploadingImage}
        > */}
        {/* <Ionicons name="image-outline" size={24} color="#007AFF" /> */}
        {/* <Text style={styles.imageButtonText}>
            {aboutImg ? "Change Image" : "Add Image"}
          </Text> */}
        {/* {uploadingImage && ( */}
        {/* <ActivityIndicator */}
        {/* size="small" */}
        {/* color="#007AFF" */}
        {/* style={{ marginLeft: 8 }} */}
        {/* /> */}
        {/* )} */}
        {/* </TouchableOpacity> */}
        {/* <View
          style={{
            minHeight: 40,
            minWidth: 40,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {aboutImg ? (
            <Image
              source={{ uri: aboutImg }}
              style={styles.previewImage}
              onLoadStart={() => setLoadingImage(true)}
              onLoadEnd={() => setLoadingImage(false)}
            />
          ) : null}
          {(loadingImage || uploadingImage) && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={{ position: "absolute" }}
            />
          )}
        </View>
        <SectionStylesEditor
          styles={section.styles}
          onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
        /> */}
      </View>
    </>
  );
};

export const FeaturesEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  const addFeature = () => {
    const currentFeatures = section.data.features || [];
    const newFeature = {
      id: `temp_${Date.now()}`,
      icon: "checkmark-circle",
      title: "New Feature",
      description: "Feature description",
    };
    updateSectionData(section.id, {
      features: [...currentFeatures, newFeature],
    });
  };

  const updateFeature = (featureId: string, field: string, value: string) => {
    const updatedFeatures = section.data.features.map((f: any) =>
      f.id === featureId ? { ...f, [field]: value } : f,
    );
    updateSectionData(section.id, { features: updatedFeatures });
  };

  const removeFeature = (featureId: string) => {
    const updatedFeatures = section.data.features.filter(
      (f: any) => f.id !== featureId,
    );
    updateSectionData(section.id, { features: updatedFeatures });
  };

  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Features Title"
        placeholderTextColor="#999"
      />

      {section.data.features?.map((feature: any) => (
        <View key={feature.id} style={styles.featureItem}>
          <View style={styles.featureHeader}>
            <Text style={styles.featureLabel}>Feature</Text>
            <TouchableOpacity onPress={() => removeFeature(feature.id)}>
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={feature.title}
            onChangeText={(text) => updateFeature(feature.id, "title", text)}
            placeholder="Feature Title"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.smallTextArea]}
            value={feature.description}
            onChangeText={(text) =>
              updateFeature(feature.id, "description", text)
            }
            placeholder="Feature Description"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />
          <SectionStylesEditor
            styles={section.styles}
            onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addFeature}>
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addButtonText}>Add Feature</Text>
      </TouchableOpacity>
    </View>
  );
};

// Utility to update nested field by path (e.g., testimonials[2].avatar)
export function updateNestedField(obj: any, path: string, value: any) {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let temp = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    temp = temp[keys[i]];
  }
  temp[keys[keys.length - 1]] = value;
  return { ...obj };
}

// Subcomponent for  video thumbnail

// Subcomponent for modal video player for testimonials
const VideoModalPlayer: FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const player = useVideoPlayer(videoUrl);
  return (
    <VideoView
      style={{
        width: 320,
        height: 320,
        borderRadius: 12,
        backgroundColor: "#000",
      }}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
};

export const TestimonialsEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
  pickImage,
  pickVideo,
}: SectionEditorProps) => {
  // Updated types for media URLs
  type TestimonialsMedia = {
    id: string;
    avatarUrl?: string;
    testimonialImageUrl?: string;
    videoUrl?: string;
  };

  interface TestimonialAssetOptions {
    type: "video" | "image";
    icon: string;
  }

  const TestimonialOptions: TestimonialAssetOptions[] = [
    { type: "video", icon: "videocam" },
    { type: "image", icon: "image" },
  ];

  const [mediaUrlsData, setMediaUrlsData] = useState<TestimonialsMedia[]>([]);
  const [loadingImages, setLoadingImages] = useState<{ [id: string]: boolean }>(
    {},
  );
  const [uploadingImages, setUploadingImages] = useState<{
    [id: string]: boolean;
  }>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] =
    useState<Testimonial | null>(null);
  const [testimonialVideoModalVisible, setTestimonialVideoModalVisible] =
    useState(false);
  const [selectedTestimonialVideo, setSelectedTestimonialVideo] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadMediaData = async () => {
      const mediaPromises = section.data.testimonials.map(
        async (testimonial: Testimonial) => {
          setLoadingImages((prev) => ({ ...prev, [testimonial.id]: true }));

          const media: TestimonialsMedia = { id: testimonial.id };

          // Load avatar (profile picture)
          if (testimonial.avatar) {
            try {
              media.avatarUrl =
                generatePublicUrl(testimonial.avatar) || undefined;
            } catch (error) {
              // ignore
            }
          }

          // Load testimonial content based on asset_type
          if (testimonial.asset_type === "video" && testimonial.video_uri) {
            try {
              media.videoUrl =
                generatePublicUrl(testimonial.video_uri) || undefined;
            } catch (error) {
              // ignore
            }
          } else if (
            testimonial.asset_type === "image" &&
            testimonial.testimonial_image
          ) {
            try {
              media.testimonialImageUrl =
                generatePublicUrl(testimonial.testimonial_image) || undefined;
            } catch (error) {
              // ignore
            }
          }

          setLoadingImages((prev) => ({ ...prev, [testimonial.id]: false }));
          return media;
        },
      );

      const mediaData = await Promise.all(mediaPromises);
      setMediaUrlsData(mediaData);
    };

    if (section.data.testimonials?.length > 0) {
      loadMediaData();
    }
  }, [JSON.stringify(section?.data?.testimonials)]);

  const getMediaForTestimonial = (id: string) => {
    return mediaUrlsData.find((media) => media.id === id);
  };

  const addTestimonial = () => {
    const currentTestimonials = section.data.testimonials || [];
    const newTestimonial = {
      id: `temp_${Date.now()}`,
      name: "Customer Name",
      text: "Their testimonial...",
      rating: 5,
      position: "Position",
      company: "Company",
      avatar: null,
      testimonial_image: null,
      video_uri: null,
      asset_type: null,
    };
    updateSectionData(section.id, {
      testimonials: [...currentTestimonials, newTestimonial],
    });
  };

  // Helper function for individual testimonial updates
  const updateTestimonial = (
    testimonialId: string,
    field: string,
    value: any,
  ) => {
    const updatedTestimonials = section.data.testimonials.map((t: any) =>
      t.id === testimonialId ? { ...t, [field]: value } : t,
    );
    updateSectionData(section.id, { testimonials: updatedTestimonials });
  };

  const removeTestimonial = (testimonialId: string) => {
    const updatedTestimonials = section.data.testimonials.filter(
      (t: any) => t.id !== testimonialId,
    );
    updateSectionData(section.id, { testimonials: updatedTestimonials });
  };

  // Upload testimonial video
  // REPLACE your current testimonial handlers with these fixed versions:

  // Upload testimonial video - FIXED VERSION
  const handlePickTestimonialVideo = async (testimonialId: string) => {
    if (!pickVideo) {
      Alert.alert("Error", "Video upload not available");
      return;
    }

    console.log("🎥 Starting testimonial video upload for:", testimonialId);
    setUploadingImages((prev) => ({ ...prev, [testimonialId]: true }));

    try {
      const testimonial = section.data.testimonials.find(
        (t: any) => t.id === testimonialId,
      );
      const existingVideoPath = testimonial?.video_uri;

      console.log("🎥 Current video path:", existingVideoPath);
      console.log("🎥 Current testimonial data:", testimonial);

      // Upload video WITHOUT specifying field (we'll update manually)
      const result = await pickVideo(section.id, undefined, existingVideoPath);

      if (result?.path) {
        console.log("✅ Video upload successful, updating testimonial data...");
        console.log(
          "📝 Updating testimonial:",
          testimonialId,
          "with video path:",
          result.path,
        );

        // Manually update the testimonial data
        const updatedTestimonials = section.data.testimonials.map((t: any) =>
          t.id === testimonialId
            ? {
                ...t,
                video_uri: result.path,
                asset_type: "video",
                testimonial_image: null, // Clear any existing image
              }
            : t,
        );

        // Update the entire testimonials array
        updateSectionData(section.id, { testimonials: updatedTestimonials });

        console.log("✅ Testimonial video updated successfully:", result.path);
        Alert.alert("Success", "Video testimonial uploaded successfully!");
      } else {
        console.log("❌ No video path returned from upload");
        Alert.alert(
          "Error",
          "Failed to upload video testimonial - no path returned",
        );
      }
    } catch (error: any) {
      console.error("💥 Error in handlePickTestimonialVideo:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload video testimonial. Please try again.",
      );
    } finally {
      setUploadingImages((prev) => ({ ...prev, [testimonialId]: false }));
    }
  };

  // Upload testimonial image - FIXED VERSION
  const handlePickTestimonialImage = async (testimonialId: string) => {
    if (!pickImage) {
      Alert.alert("Error", "Image upload not available");
      return;
    }

    console.log("🖼️ Starting testimonial image upload for:", testimonialId);
    setUploadingImages((prev) => ({ ...prev, [testimonialId]: true }));

    try {
      const testimonial = section.data.testimonials.find(
        (t: any) => t.id === testimonialId,
      );
      const existingImagePath = testimonial?.testimonial_image;

      console.log("🖼️ Current testimonial image path:", existingImagePath);
      console.log("🖼️ Current testimonial data:", testimonial);

      // Upload image WITHOUT specifying field (we'll update manually)
      const result = await pickImage(section.id, undefined, existingImagePath, {
        allowCropping: true,
        aspectRatio: [4, 3], // Testimonial images work well with 4:3 aspect ratio
      });

      if (result?.path) {
        console.log(
          "✅ Testimonial image upload successful, updating testimonial data...",
        );
        console.log(
          "📝 Updating testimonial:",
          testimonialId,
          "with image path:",
          result.path,
        );

        // Manually update the testimonial data
        const updatedTestimonials = section.data.testimonials.map((t: any) =>
          t.id === testimonialId
            ? {
                ...t,
                testimonial_image: result.path,
                asset_type: "image",
                video_uri: null, // Clear any existing video
              }
            : t,
        );

        // Update the entire testimonials array
        updateSectionData(section.id, { testimonials: updatedTestimonials });

        console.log("✅ Testimonial image updated successfully:", result.path);
        Alert.alert("Success", "Testimonial image uploaded successfully!");
      } else {
        console.log("❌ No image path returned from upload");
        Alert.alert(
          "Error",
          "Failed to upload testimonial image - no path returned",
        );
      }
    } catch (error: any) {
      console.error("💥 Error in handlePickTestimonialImage:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload testimonial image. Please try again.",
      );
    } finally {
      setUploadingImages((prev) => ({ ...prev, [testimonialId]: false }));
    }
  };

  // Upload avatar - FIXED VERSION
  const handlePickAvatar = async (testimonialId: string) => {
    if (!pickImage) {
      Alert.alert("Error", "Image upload not available");
      return;
    }

    console.log("👤 Starting avatar upload for testimonial:", testimonialId);
    setUploadingImages((prev) => ({ ...prev, [testimonialId]: true }));

    try {
      const testimonial = section.data.testimonials.find(
        (t: any) => t.id === testimonialId,
      );
      const existingAvatarPath = testimonial?.avatar;

      console.log("👤 Current avatar path:", existingAvatarPath);
      console.log("👤 Current testimonial data:", testimonial);

      // Upload avatar WITHOUT specifying field (we'll update manually)
      const result = await pickImage(
        section.id,
        undefined,
        existingAvatarPath,
        {
          allowCropping: true,
          aspectRatio: [1, 1], // Avatars should be square
        },
      );

      if (result?.path) {
        console.log(
          "✅ Avatar upload successful, updating testimonial data...",
        );
        console.log(
          "📝 Updating testimonial:",
          testimonialId,
          "with avatar path:",
          result.path,
        );

        // Manually update the testimonial data
        const updatedTestimonials = section.data.testimonials.map((t: any) =>
          t.id === testimonialId ? { ...t, avatar: result.path } : t,
        );

        // Update the entire testimonials array
        updateSectionData(section.id, { testimonials: updatedTestimonials });

        console.log("✅ Avatar updated successfully:", result.path);
        Alert.alert("Success", "Profile picture uploaded successfully!");
      } else {
        console.log("❌ No avatar path returned from upload");
        Alert.alert(
          "Error",
          "Failed to upload profile picture - no path returned",
        );
      }
    } catch (error: any) {
      console.error("💥 Error in handlePickAvatar:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload profile picture. Please try again.",
      );
    } finally {
      setUploadingImages((prev) => ({ ...prev, [testimonialId]: false }));
    }
  };

  // Add this function to handle media upload modal action
  const handleUpload = (type: "video" | "image") => {
    if (!selectedTestimonial) return;
    if (type === "image") {
      handlePickTestimonialImage(selectedTestimonial.id);
    } else {
      handlePickTestimonialVideo(selectedTestimonial.id);
    }
    setShowUploadModal(false);
  };

  const handleAvatarUpload = () => {
    if (!selectedTestimonial) return;
    handlePickAvatar(selectedTestimonial.id);
    setShowAvatarModal(false);
  };

  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Testimonials Title"
        placeholderTextColor="#999"
      />
      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />

      {section.data.testimonials?.map(
        (testimonial: Testimonial, index: number) => {
          const media = getMediaForTestimonial(testimonial.id);

          return (
            <View key={testimonial.id} style={styles.testimonialItem}>
              <View style={styles.testimonialHeader}>
                <Text style={styles.testimonialLabel}>Testimonial</Text>
                <TouchableOpacity
                  onPress={() => removeTestimonial(testimonial.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                value={testimonial.name}
                onChangeText={(text) =>
                  updateTestimonial(testimonial.id, "name", text)
                }
                placeholder="Customer Name"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                value={testimonial.position}
                onChangeText={(text) =>
                  updateTestimonial(testimonial.id, "position", text)
                }
                placeholder="Position"
                placeholderTextColor="#999"
              />

              <TextInput
                style={styles.input}
                value={testimonial.company}
                onChangeText={(text) =>
                  updateTestimonial(testimonial.id, "company", text)
                }
                placeholder="Company"
                placeholderTextColor="#999"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                value={testimonial.text}
                onChangeText={(text) =>
                  updateTestimonial(testimonial.id, "text", text)
                }
                placeholder="Testimonial Text"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />

              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Rating:</Text>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() =>
                      updateTestimonial(testimonial.id, "rating", star)
                    }
                  >
                    <Ionicons
                      name={
                        star <= (testimonial.rating ?? 0)
                          ? "star"
                          : "star-outline"
                      }
                      size={24}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Profile Avatar Section */}
              <View style={additionalStyles.avatarSection}>
                <Text style={additionalStyles.sectionTitle}>
                  Profile Picture
                </Text>
                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: "#f8f9fa" }]}
                  onPress={() => {
                    setSelectedTestimonial(testimonial);
                    setShowAvatarModal(true);
                  }}
                  disabled={uploadingImages[testimonial.id]}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color="#007AFF"
                  />
                  <Text style={styles.imageButtonText}>
                    {testimonial.avatar ? "Update Avatar" : "Add Avatar"}
                  </Text>
                  {uploadingImages[testimonial.id] && (
                    <ActivityIndicator
                      size="small"
                      color="#007AFF"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
                {media?.avatarUrl && (
                  <Image
                    source={{ uri: media.avatarUrl }}
                    style={additionalStyles.avatarPreview}
                    onLoadStart={() =>
                      setLoadingImages((prev) => ({
                        ...prev,
                        [testimonial.id]: true,
                      }))
                    }
                    onLoadEnd={() =>
                      setLoadingImages((prev) => ({
                        ...prev,
                        [testimonial.id]: false,
                      }))
                    }
                  />
                )}
              </View>

              {/* Testimonial Media Section */}
              <View style={additionalStyles.mediaSection}>
                <Text style={additionalStyles.sectionTitle}>
                  Testimonial Media
                </Text>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={() => {
                    setSelectedTestimonial(testimonial);
                    setShowUploadModal(true);
                  }}
                  disabled={uploadingImages[testimonial.id]}
                >
                  <Ionicons
                    name={
                      testimonial.asset_type === "video"
                        ? "videocam-outline"
                        : "image-outline"
                    }
                    size={24}
                    color="#007AFF"
                  />
                  <Text style={styles.imageButtonText}>
                    {testimonial.asset_type === "video" && testimonial.video_uri
                      ? "Update Video Testimonial"
                      : testimonial.asset_type === "image" &&
                          testimonial.testimonial_image
                        ? "Update Image Testimonial"
                        : "Add Media"}
                  </Text>
                  {uploadingImages[testimonial.id] && (
                    <ActivityIndicator
                      size="small"
                      color="#007AFF"
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </TouchableOpacity>
                <View
                  style={{
                    minHeight: 40,
                    minWidth: 40,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {testimonial.asset_type === "image" &&
                  media?.testimonialImageUrl ? (
                    <Image
                      source={{ uri: media.testimonialImageUrl }}
                      style={styles.previewImage}
                      onLoadStart={() =>
                        setLoadingImages((prev) => ({
                          ...prev,
                          [testimonial.id]: true,
                        }))
                      }
                      onLoadEnd={() =>
                        setLoadingImages((prev) => ({
                          ...prev,
                          [testimonial.id]: false,
                        }))
                      }
                    />
                  ) : testimonial.asset_type === "video" && media?.videoUrl ? (
                    <VideoThumbnail
                      videoUrl={media.videoUrl}
                      onPress={() => {
                        setSelectedTestimonialVideo(media.videoUrl!);
                        setTestimonialVideoModalVisible(true);
                      }}
                    />
                  ) : null}
                  {(loadingImages[testimonial.id] ||
                    uploadingImages[testimonial.id]) && (
                    <ActivityIndicator
                      size="small"
                      color="#007AFF"
                      style={{ position: "absolute" }}
                    />
                  )}
                </View>
              </View>
            </View>
          );
        },
      )}

      <TouchableOpacity style={styles.addButton} onPress={addTestimonial}>
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addButtonText}>Add Testimonial</Text>
      </TouchableOpacity>

      {/* Avatar Upload Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.templateItem}
              onPress={handleAvatarUpload}
            >
              <Ionicons name="person-circle" size={32} color="#007AFF" />
              <View style={styles.templateItemInfo}>
                <Text style={styles.templateItemName}>Profile Picture</Text>
                <Text style={styles.templateItemDescription}>
                  Upload a profile photo for this customer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Testimonial Media Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Testimonial Media</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TestimonialOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateItem}
                  onPress={() => handleUpload(item.type)}
                >
                  <Ionicons name={item.icon as any} size={32} color="#007AFF" />
                  <View style={styles.templateItemInfo}>
                    <Text style={styles.templateItemName}>
                      {item.type === "video"
                        ? "Video Testimonial"
                        : "Testimonial Image"}
                    </Text>
                    <Text style={styles.templateItemDescription}>
                      {item.type === "video"
                        ? "Upload a video testimonial from the customer"
                        : "Upload an image to display with the testimonial"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.type}
            />
          </View>
        </View>
      </Modal>

      {/* Testimonial Video Modal for playing video */}
      <VideoModal
        visible={testimonialVideoModalVisible}
        videoUrl={selectedTestimonialVideo}
        onClose={() => setTestimonialVideoModalVisible(false)}
      />
    </View>
  );
};

export const FAQEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  const addQuestion = () => {
    const currentQuestions = section.data.questions || [];
    const newQuestion = {
      id: `temp_${Date.now()}`,
      question: "New Question?",
      answer: "Answer goes here.",
    };
    updateSectionData(section.id, {
      questions: [...currentQuestions, newQuestion],
    });
  };

  const updateQuestion = (questionId: string, field: string, value: string) => {
    const updatedQuestions = section.data.questions.map((q: any) =>
      q.id === questionId ? { ...q, [field]: value } : q,
    );
    updateSectionData(section.id, { questions: updatedQuestions });
  };

  const removeQuestion = (questionId: string) => {
    const updatedQuestions = section.data.questions.filter(
      (q: any) => q.id !== questionId,
    );
    updateSectionData(section.id, { questions: updatedQuestions });
  };

  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="FAQ Title"
        placeholderTextColor="#999"
      />
      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />

      {section.data.questions?.map((qa: any) => (
        <View key={qa.id} style={styles.faqItem}>
          <View style={styles.faqHeader}>
            <Text style={styles.faqLabel}>Q&A</Text>
            <TouchableOpacity onPress={() => removeQuestion(qa.id)}>
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={qa.question}
            onChangeText={(text) => updateQuestion(qa.id, "question", text)}
            placeholder="Question"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={qa.answer}
            onChangeText={(text) => updateQuestion(qa.id, "answer", text)}
            placeholder="Answer"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addQuestion}>
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addButtonText}>Add Question</Text>
      </TouchableOpacity>
    </View>
  );
};

export const CTAEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  return (
    <View style={styles.fieldContainer}>
      <TextInput
        style={styles.input}
        value={section.data.title}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="CTA Title"
        placeholderTextColor="#999"
      />
      <TextInput
        style={[styles.input, styles.smallTextArea]}
        value={section.data.description}
        onChangeText={(text) =>
          updateSectionData(section.id, { description: text })
        }
        placeholder="CTA Description"
        placeholderTextColor="#999"
        multiline
        numberOfLines={2}
      />
      <View style={styles.divider} />
      <Text style={styles.fieldLabel}>Button</Text>
      <TextInput
        style={styles.input}
        value={section.data.button?.text}
        onChangeText={(text) =>
          updateSectionData(section.id, {
            button: { ...section.data.button, text },
          })
        }
        placeholder="Button Text"
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        value={section.data.button?.link}
        onChangeText={(text) =>
          updateSectionData(section.id, {
            button: { ...section.data.button, link: text },
          })
        }
        placeholder="Button Link (URL, tel:, mailto:)"
        placeholderTextColor="#999"
      />
      {/* <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      /> */}
    </View>
  );
};

export const SectionStylesEditor = ({
  styles = {},
  onChange,
}: {
  styles: any;
  onChange: (newStyles: any) => void;
}) => {
  // Theme colors section removed for simplified UI
  return null;
};

export const PersonalContactEditor = ({
  section,
  updateSectionData,
  pickImage,
  updateSectionStyles,
}: SectionEditorProps) => {
  const [profileImg, setProfileImg] = useState<string>("");
  const [loadingImage, setLoadingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!section?.data?.photo) {
        setProfileImg("");
        return;
      }
      setLoadingImage(true);
      const url = generatePublicUrl(section?.data?.photo);
      if (url) setProfileImg(url);
      setLoadingImage(false);
    };
    loadImage();
  }, [section?.data?.photo]);

  const handlePickImage = async () => {
    setUploadingImage(true);
    await pickImage(section.id, "photo", section?.data?.photo, {
      allowCropping: true, // Make cropping optional, not forced
    });
    setUploadingImage(false);
  };

  const handleRemovePhoto = () => {
    updateSectionData(section.id, { photo: null });
    setProfileImg("");
  };

  const addCustomLink = () => {
    const currentLinks = section.data.customLinks || [];
    const newLink = {
      id: `temp_${Date.now()}`,
      type: "custom",
      label: "",
      url: "",
    };
    updateSectionData(section.id, {
      customLinks: [...currentLinks, newLink],
    });
  };

  const updateCustomLink = (linkId: string, field: string, value: string) => {
    const currentLinks = section.data.customLinks || [];
    const updatedLinks = currentLinks.map((link: any) =>
      link.id === linkId ? { ...link, [field]: value } : link,
    );
    updateSectionData(section.id, { customLinks: updatedLinks });
  };

  const removeCustomLink = (linkId: string) => {
    const currentLinks = section.data.customLinks || [];
    const filteredLinks = currentLinks.filter(
      (link: any) => link.id !== linkId,
    );
    updateSectionData(section.id, { customLinks: filteredLinks });
  };

  return (
    <View style={styles.fieldContainer}>
      {/* Profile Photo */}
      <Text style={styles.fieldLabel}>Profile Photo</Text>
      <TouchableOpacity
        style={styles.imageButton}
        onPress={handlePickImage}
        disabled={uploadingImage}
      >
        <Ionicons name="person-circle-outline" size={24} color="#007AFF" />
        <Text style={styles.imageButtonText}>
          {profileImg ? "Change Photo" : "Add Profile Photo"}
        </Text>
        {uploadingImage && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>

      {profileImg && (
        <TouchableOpacity
          style={[styles.imageButton, { borderColor: "#ff3b30", marginTop: 8 }]}
          onPress={handleRemovePhoto}
        >
          <Ionicons name="trash-outline" size={24} color="#ff3b30" />
          <Text style={[styles.imageButtonText, { color: "#ff3b30" }]}>
            Remove Photo
          </Text>
        </TouchableOpacity>
      )}

      {profileImg && (
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: profileImg }}
            style={styles.profileImage}
            onLoadStart={() => setLoadingImage(true)}
            onLoadEnd={() => setLoadingImage(false)}
          />
          {loadingImage && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={{ position: "absolute" }}
            />
          )}
        </View>
      )}

      {/* Basic Information */}
      <Text style={styles.fieldLabel}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={section.data.name || ""}
        onChangeText={(text) => updateSectionData(section.id, { name: text })}
        placeholder="John Doe"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Title/Position</Text>
      <TextInput
        style={styles.input}
        value={section.data.title || ""}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Acme Inc."
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={section.data.phone || ""}
        onChangeText={(text) => updateSectionData(section.id, { phone: text })}
        placeholder="(555) 555-5555"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>Email Address</Text>
      <TextInput
        style={styles.input}
        value={section.data.email || ""}
        onChangeText={(text) => updateSectionData(section.id, { email: text })}
        placeholder="john@example.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Website</Text>
      <TextInput
        style={styles.input}
        value={section.data.website || ""}
        onChangeText={(text) =>
          updateSectionData(section.id, { website: text })
        }
        placeholder="https://www.yourwebsite.com"
        placeholderTextColor="#999"
        keyboardType="url"
        autoCapitalize="none"
      />

      <Text style={styles.fieldLabel}>Short Bio</Text>
      <TextInput
        style={[styles.input, styles.smallTextArea]}
        value={section.data.bio || ""}
        onChangeText={(text) => updateSectionData(section.id, { bio: text })}
        placeholder="Brief description about yourself..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />

      {/* Custom Links */}
      <View style={styles.divider} />
      <View style={styles.sectionHeader}>
        <Text style={styles.fieldLabel}>Custom Links</Text>
        <TouchableOpacity onPress={addCustomLink} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Link</Text>
        </TouchableOpacity>
      </View>

      {(section.data.customLinks || []).map((link: any, index: number) => (
        <View key={link.id} style={styles.linkContainer}>
          <View style={styles.linkHeader}>
            <Text style={styles.linkNumber}>Link {index + 1}</Text>
            <TouchableOpacity
              onPress={() => removeCustomLink(link.id)}
              style={styles.removeButton}
            >
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>

          <LinkTypeSelector
            selectedType={link.type}
            onSelectType={(type) => updateCustomLink(link.id, "type", type)}
            label="Link Type"
          />

          <TextInput
            style={styles.input}
            value={link.label || ""}
            onChangeText={(text) => updateCustomLink(link.id, "label", text)}
            placeholder="Follow me on LinkedIn"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            value={link.url || ""}
            onChangeText={(text) => updateCustomLink(link.id, "url", text)}
            placeholder="https://linkedin.com/in/username"
            placeholderTextColor="#999"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      ))}

      {/* Minimal Style Editor - Only show colors actually used in rendering */}
      <PersonalContactStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};

// Minimal style editor for personal contact - only shows colors actually used in the rendered component
const PersonalContactStylesEditor = ({
  styles = {},
  onChange,
}: {
  styles: any;
  onChange: (newStyles: any) => void;
}) => {
  // Theme colors section removed for simplified UI
  return null;
};

export const MedicalProviderEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
  pickImage,
  updateUploadData,
  page,
}: SectionEditorProps) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showCertificationModal, setShowCertificationModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Get the section definition for service options
  const sectionDef = getSectionDefinition("medicalProvider");
  const serviceOptions =
    (sectionDef?.fields.services as any)?.itemSchema?.icon?.options || [];
  const certificationOptions =
    (sectionDef?.fields.certifications as any)?.itemSchema?.icon?.options || [];

  // Load public URLs for images
  useEffect(() => {
    const loadUrls = async () => {
      if (section.data.logo) {
        const logoPublicUrl = await generatePublicUrl(section.data.logo);
        setLogoUrl(logoPublicUrl);
      }
      if (section.data.heroImage) {
        const heroPublicUrl = await generatePublicUrl(section.data.heroImage);
        setHeroImageUrl(heroPublicUrl);
      }
      if (section.data.galleryImages) {
        const imagesWithUrls = await Promise.all(
          section.data.galleryImages.map(async (image: any) => {
            const publicUrl = await generatePublicUrl(image.url);
            return { ...image, publicUrl };
          }),
        );
        setGalleryImages(imagesWithUrls);
      }
    };
    loadUrls();
  }, [section.data.logo, section.data.heroImage, section.data.galleryImages]);

  // Image upload handlers
  const uploadLogo = async () => {
    setUploadingLogo(true);
    const result = await pickImage(section.id, "logo", section.data.logo, {
      allowCropping: true,
      aspectRatio: [1, 1],
    });
    if (result) {
      updateSectionData(section.id, { logo: result.path });
    }
    setUploadingLogo(false);
  };

  const uploadHeroImage = async () => {
    setUploadingHero(true);
    const result = await pickImage(
      section.id,
      "heroImage",
      section.data.heroImage,
      {
        allowCropping: false,
      },
    );
    if (result) {
      updateSectionData(section.id, { heroImage: result.path });
    }
    setUploadingHero(false);
  };

  const addGalleryImage = async () => {
    setUploadingGallery(true);
    const result = await pickImage(section.id, "galleryImages");
    if (result) {
      const currentImages = section.data.galleryImages || [];
      const newImage = {
        id: `img_${Date.now()}`,
        url: result.path,
        caption: "",
      };
      updateSectionData(section.id, {
        galleryImages: [...currentImages, newImage],
      });
    }
    setUploadingGallery(false);
  };

  const removeGalleryImage = (imageId: string, imageUrl: string) => {
    if (updateUploadData) {
      updateUploadData(imageUrl, "remove");
    }
    const updatedImages =
      section.data.galleryImages?.filter((img: any) => img.id !== imageId) ||
      [];
    updateSectionData(section.id, { galleryImages: updatedImages });
  };

  const updateGalleryImageCaption = (imageId: string, caption: string) => {
    const updatedImages =
      section.data.galleryImages?.map((img: any) =>
        img.id === imageId ? { ...img, caption } : img,
      ) || [];
    updateSectionData(section.id, { galleryImages: updatedImages });
  };

  // Service management
  const addService = (serviceName: string, serviceIcon: string) => {
    const currentServices = section.data.services || [];
    const newService = {
      id: `service_${Date.now()}`,
      name: serviceName,
      icon: serviceIcon,
      available: "true",
    };
    updateSectionData(section.id, {
      services: [...currentServices, newService],
    });
    setShowServiceModal(false);
  };

  const toggleServiceAvailability = (serviceId: string) => {
    const updatedServices =
      section.data.services?.map((service: any) =>
        service.id === serviceId
          ? {
              ...service,
              available: service.available === "true" ? "false" : "true",
            }
          : service,
      ) || [];
    updateSectionData(section.id, { services: updatedServices });
  };

  const removeService = (serviceId: string) => {
    const updatedServices =
      section.data.services?.filter(
        (service: any) => service.id !== serviceId,
      ) || [];
    updateSectionData(section.id, { services: updatedServices });
  };

  // Insurance management
  const addInsurance = (insuranceName: string) => {
    const currentInsurance = section.data.acceptedInsurance || [];
    const newInsurance = {
      id: `insurance_${Date.now()}`,
      name: insuranceName,
    };
    updateSectionData(section.id, {
      acceptedInsurance: [...currentInsurance, newInsurance],
    });
    setShowInsuranceModal(false);
  };

  const removeInsurance = (insuranceId: string) => {
    const updatedInsurance =
      section.data.acceptedInsurance?.filter(
        (insurance: any) => insurance.id !== insuranceId,
      ) || [];
    updateSectionData(section.id, { acceptedInsurance: updatedInsurance });
  };

  // Certification management
  const addCertification = (certName: string, certIcon: string) => {
    const currentCerts = section.data.certifications || [];
    const newCert = {
      id: `cert_${Date.now()}`,
      name: certName,
      icon: certIcon,
    };
    updateSectionData(section.id, {
      certifications: [...currentCerts, newCert],
    });
    setShowCertificationModal(false);
  };

  const removeCertification = (certId: string) => {
    const updatedCerts =
      section.data.certifications?.filter((cert: any) => cert.id !== certId) ||
      [];
    updateSectionData(section.id, { certifications: updatedCerts });
  };

  return (
    <View style={styles.fieldContainer}>
      {/* Basic Information */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Facility Information
        </Text>

        <Text style={styles.fieldLabel}>Facility Name</Text>
        <TextInput
          style={styles.input}
          value={section.data.facilityName || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { facilityName: text })
          }
          placeholder="Medical Center Name"
          placeholderTextColor="#999"
        />

        <Text style={styles.fieldLabel}>Service Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={section.data.serviceDescription || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { serviceDescription: text })
          }
          placeholder="Describe your services and what makes your facility special"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Images */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Images
        </Text>

        <Text style={styles.fieldLabel}>Provider Logo</Text>
        <TouchableOpacity
          style={[
            linkStyles.medicalImageUpload,
            uploadingLogo && linkStyles.uploadingButton,
          ]}
          onPress={uploadLogo}
          disabled={uploadingLogo}
        >
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={linkStyles.medicalUploadedImage}
            />
          ) : (
            <View style={linkStyles.medicalUploadPlaceholder}>
              {uploadingLogo ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="business-outline" size={32} color="#999" />
              )}
              <Text style={linkStyles.medicalUploadText}>
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Hero Background Image</Text>
        <TouchableOpacity
          style={[
            linkStyles.medicalImageUpload,
            uploadingHero && linkStyles.uploadingButton,
          ]}
          onPress={uploadHeroImage}
          disabled={uploadingHero}
        >
          {heroImageUrl ? (
            <Image
              source={{ uri: heroImageUrl }}
              style={linkStyles.medicalUploadedImage}
            />
          ) : (
            <View style={linkStyles.medicalUploadPlaceholder}>
              {uploadingHero ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="image-outline" size={32} color="#999" />
              )}
              <Text style={linkStyles.medicalUploadText}>
                {uploadingHero ? "Uploading..." : "Upload Hero Image"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Location & Contact */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Location & Contact
        </Text>

        <Text style={styles.fieldLabel}>Street Address</Text>
        <TextInput
          style={styles.input}
          value={section.data.streetAddress || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { streetAddress: text })
          }
          placeholder="123 Medical Drive"
          placeholderTextColor="#999"
        />

        <View style={linkStyles.row}>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Unit/Suite</Text>
            <TextInput
              style={styles.input}
              value={section.data.unit || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { unit: text })
              }
              placeholder="Suite 100"
              placeholderTextColor="#999"
            />
          </View>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={section.data.city || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { city: text })
              }
              placeholder="Your City"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={linkStyles.row}>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>State</Text>
            <TextInput
              style={styles.input}
              value={section.data.state || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { state: text })
              }
              placeholder="CA"
              placeholderTextColor="#999"
            />
          </View>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>ZIP Code</Text>
            <TextInput
              style={styles.input}
              value={section.data.zipCode || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { zipCode: text })
              }
              placeholder="12345"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={linkStyles.row}>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={section.data.phone || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { phone: text })
              }
              placeholder="(555) 123-4567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Fax Number</Text>
            <TextInput
              style={styles.input}
              value={section.data.fax || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { fax: text })
              }
              placeholder="(555) 123-4568"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={section.data.email || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { email: text })
          }
          placeholder="info@provider.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Website</Text>
        <TextInput
          style={styles.input}
          value={section.data.website || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { website: text })
          }
          placeholder="https://www.provider.com"
          placeholderTextColor="#999"
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>

      {/* Pricing */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Pricing
        </Text>

        <View style={linkStyles.row}>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Low Price (monthly)</Text>
            <TextInput
              style={styles.input}
              value={section.data.priceLow || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { priceLow: text })
              }
              placeholder="2500"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>High Price (monthly)</Text>
            <TextInput
              style={styles.input}
              value={section.data.priceHigh || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, { priceHigh: text })
              }
              placeholder="5000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Services */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Services & Specialties
        </Text>

        {section.data.services?.map((service: any) => (
          <View key={service.id} style={linkStyles.medicalListItem}>
            <View style={linkStyles.medicalListItemContent}>
              <Text style={linkStyles.medicalListItemTitle}>
                {service.name}
              </Text>
              <TouchableOpacity
                onPress={() => toggleServiceAvailability(service.id)}
                style={[
                  linkStyles.medicalStatusBadge,
                  service.available === "true"
                    ? linkStyles.medicalStatusAvailable
                    : linkStyles.medicalStatusUnavailable,
                ]}
              >
                <Text
                  style={[
                    linkStyles.medicalStatusText,
                    service.available === "true"
                      ? linkStyles.medicalStatusTextAvailable
                      : linkStyles.medicalStatusTextUnavailable,
                  ]}
                >
                  {service.available === "true" ? "Available" : "Unavailable"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => removeService(service.id)}
              style={linkStyles.medicalRemoveButton}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={linkStyles.medicalAddButton}
          onPress={() => setShowServiceModal(true)}
        >
          <Ionicons name="add" size={18} color="#007AFF" />
          <Text style={linkStyles.medicalAddButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Gallery */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Photo Gallery
        </Text>

        <Text style={styles.fieldLabel}>Gallery Title</Text>
        <TextInput
          style={styles.input}
          value={section.data.galleryTitle || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { galleryTitle: text })
          }
          placeholder="Photos & Videos"
          placeholderTextColor="#999"
        />

        {galleryImages.length > 0 && (
          <View style={linkStyles.medicalGalleryGrid}>
            {galleryImages.map((image: any) => (
              <View key={image.id} style={linkStyles.medicalGalleryItem}>
                <Image
                  source={{ uri: image.publicUrl }}
                  style={linkStyles.medicalGalleryImage}
                />
                <TouchableOpacity
                  style={linkStyles.medicalGalleryRemoveButton}
                  onPress={() => removeGalleryImage(image.id, image.url)}
                >
                  <Ionicons name="close-circle" size={18} color="#FF3B30" />
                </TouchableOpacity>
                <TextInput
                  style={linkStyles.medicalGalleryCaptionInput}
                  value={image.caption || ""}
                  onChangeText={(text) =>
                    updateGalleryImageCaption(image.id, text)
                  }
                  placeholder="Caption (optional)"
                  placeholderTextColor="#999"
                />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            linkStyles.medicalAddButton,
            uploadingGallery && linkStyles.uploadingButton,
          ]}
          onPress={addGalleryImage}
          disabled={uploadingGallery}
        >
          {uploadingGallery ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="camera" size={18} color="#007AFF" />
          )}
          <Text style={linkStyles.medicalAddButtonText}>
            {uploadingGallery ? "Uploading..." : "Add Media"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Accepted Insurance */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Accepted Insurance
        </Text>

        {section.data.acceptedInsurance?.map((insurance: any) => (
          <View key={insurance.id} style={linkStyles.medicalListItem}>
            <View style={linkStyles.medicalListItemContent}>
              <Ionicons
                name="shield-checkmark"
                size={18}
                color="#4CAF50"
                style={{ marginRight: 8 }}
              />
              <Text style={linkStyles.medicalListItemTitle}>
                {insurance.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => removeInsurance(insurance.id)}
              style={linkStyles.medicalRemoveButton}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={linkStyles.medicalAddButton}
          onPress={() => setShowInsuranceModal(true)}
        >
          <Ionicons name="add" size={18} color="#007AFF" />
          <Text style={linkStyles.medicalAddButtonText}>
            Add Insurance Provider
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admission Coordinator */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Admission Coordinator
        </Text>

        <Text style={styles.fieldLabel}>Coordinator Name</Text>
        <TextInput
          style={styles.input}
          value={section.data.admissionCoordinator || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { admissionCoordinator: text })
          }
          placeholder="John Smith"
          placeholderTextColor="#999"
        />

        <View style={linkStyles.row}>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={section.data.admissionCoordinatorPhone || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, {
                  admissionCoordinatorPhone: text,
                })
              }
              placeholder="(555) 123-4567"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
          <View style={linkStyles.halfWidth}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={section.data.admissionCoordinatorEmail || ""}
              onChangeText={(text) =>
                updateSectionData(section.id, {
                  admissionCoordinatorEmail: text,
                })
              }
              placeholder="admissions@provider.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      {/* Certifications & Awards */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#f0f0f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: 16,
            letterSpacing: 0.3,
          }}
        >
          Certifications & Awards
        </Text>

        {section.data.certifications?.map((cert: any) => (
          <View key={cert.id} style={linkStyles.medicalListItem}>
            <View style={linkStyles.medicalListItemContent}>
              <Ionicons
                name="ribbon"
                size={18}
                color="#FFA726"
                style={{ marginRight: 8 }}
              />
              <Text style={linkStyles.medicalListItemTitle}>{cert.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeCertification(cert.id)}
              style={linkStyles.medicalRemoveButton}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={linkStyles.medicalAddButton}
          onPress={() => setShowCertificationModal(true)}
        >
          <Ionicons name="add" size={18} color="#007AFF" />
          <Text style={linkStyles.medicalAddButtonText}>Add Certification</Text>
        </TouchableOpacity>
      </View>

      {/* Additional Features - COMMENTED OUT FOR NOW */}
      {/*
      <View style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: 16,
          letterSpacing: 0.3,
        }}>Additional Features</Text>
        
        <View style={linkStyles.medicalToggleRow}>
          <Text style={linkStyles.medicalToggleLabel}>24/7 Emergency Response</Text>
          <TouchableOpacity
            style={[
              linkStyles.medicalToggleButton,
              section.data.hasEmergencyResponse === 'true' ? linkStyles.medicalToggleActive : linkStyles.medicalToggleInactive
            ]}
            onPress={() => updateSectionData(section.id, {
              hasEmergencyResponse: section.data.hasEmergencyResponse === 'true' ? 'false' : 'true'
            })}
          >
            <Text style={[
              linkStyles.medicalToggleText,
              section.data.hasEmergencyResponse === 'true' ? linkStyles.medicalToggleTextActive : linkStyles.medicalToggleTextInactive
            ]}>
              {section.data.hasEmergencyResponse === 'true' ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={linkStyles.medicalToggleRow}>
          <Text style={linkStyles.medicalToggleLabel}>Pet Friendly</Text>
          <TouchableOpacity
            style={[
              linkStyles.medicalToggleButton,
              section.data.hasPetFriendly === 'true' ? linkStyles.medicalToggleActive : linkStyles.medicalToggleInactive
            ]}
            onPress={() => updateSectionData(section.id, {
              hasPetFriendly: section.data.hasPetFriendly === 'true' ? 'false' : 'true'
            })}
          >
            <Text style={[
              linkStyles.medicalToggleText,
              section.data.hasPetFriendly === 'true' ? linkStyles.medicalToggleTextActive : linkStyles.medicalToggleTextInactive
            ]}>
              {section.data.hasPetFriendly === 'true' ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Operating Hours</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={section.data.operatingHours || ''}
          onChangeText={(text) => updateSectionData(section.id, { operatingHours: text })}
          placeholder="Monday-Friday: 9AM-6PM&#10;Saturday: 10AM-4PM&#10;Sunday: Closed"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      */}

      {/* Style Options */}
      {/* <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      /> */}

      {/* Service Selection Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Service</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={serviceOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={linkStyles.modalItem}
                  onPress={() => addService(item.label, item.value)}
                >
                  <Ionicons name={item.icon as any} size={24} color="#007AFF" />
                  <Text style={linkStyles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
            />
          </View>
        </View>
      </Modal>

      {/* Insurance Modal */}
      <Modal
        visible={showInsuranceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInsuranceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Insurance Provider</Text>
              <TouchableOpacity onPress={() => setShowInsuranceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                "Medicare",
                "Medicaid",
                "Blue Cross Blue Shield",
                "Aetna",
                "Cigna",
                "UnitedHealth",
                "Humana",
                "Kaiser Permanente",
                "Anthem",
                "Molina Healthcare",
              ]}
              renderItem={({ item: insurance }) => (
                <TouchableOpacity
                  style={linkStyles.insuranceModalItem}
                  onPress={() => addInsurance(insurance)}
                >
                  <View style={linkStyles.insuranceModalIcon}>
                    <Ionicons
                      name="shield-checkmark"
                      size={22}
                      color="#4CAF50"
                    />
                  </View>
                  <Text style={linkStyles.insuranceModalText}>{insurance}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Certification Modal */}
      <Modal
        visible={showCertificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCertificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Certification</Text>
              <TouchableOpacity
                onPress={() => setShowCertificationModal(false)}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={certificationOptions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={linkStyles.modalItem}
                  onPress={() => addCertification(item.label, item.value)}
                >
                  <Ionicons name={item.icon as any} size={24} color="#007AFF" />
                  <Text style={linkStyles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.value}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const MultiContactEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
  pickImage,
}: SectionEditorProps) => {
  const [expandedSection, setExpandedSection] = useState<
    "business" | "contacts" | null
  >("business");

  const businessInfo = section.data.businessInfo?.[0] || {};
  const contactPersons = section.data.contactPersons || [];

  // Update business information
  const updateBusinessInfo = (field: string, value: any) => {
    const updated = { ...businessInfo, [field]: value };
    updateSectionData(section.id, {
      businessInfo: [updated],
    });
  };

  // Contact persons management
  const addContactPerson = () => {
    const newContact = {
      id: `contact_${Date.now()}`,
      name: "",
      title: "",
      photo: null,
      phone: "",
      email: "",
      extension: "",
    };
    updateSectionData(section.id, {
      contactPersons: [...contactPersons, newContact],
    });
  };

  const removeContactPerson = (contactId: string) => {
    const updatedContacts = contactPersons.filter(
      (contact: any) => contact.id !== contactId,
    );
    updateSectionData(section.id, {
      contactPersons: updatedContacts,
    });
  };

  const updateContactPerson = (
    contactId: string,
    field: string,
    value: any,
  ) => {
    const updatedContacts = contactPersons.map((contact: any) =>
      contact.id === contactId ? { ...contact, [field]: value } : contact,
    );
    updateSectionData(section.id, {
      contactPersons: updatedContacts,
    });
  };

  const addPhone = (contactId: string, isPrimary: boolean = false) => {
    const newPhone = {
      id: `phone_${Date.now()}`,
      label: "",
      number: "",
    };

    if (isPrimary) {
      const updatedPrimary = section.data.primaryContact.map((contact: any) =>
        contact.id === contactId
          ? { ...contact, phones: [...(contact.phones || []), newPhone] }
          : contact,
      );
      updateSectionData(section.id, { primaryContact: updatedPrimary });
    } else {
      const updatedAdditional = section.data.additionalContacts.map(
        (contact: any) =>
          contact.id === contactId
            ? { ...contact, phones: [...(contact.phones || []), newPhone] }
            : contact,
      );
      updateSectionData(section.id, { additionalContacts: updatedAdditional });
    }
  };

  const removePhone = (
    contactId: string,
    phoneId: string,
    isPrimary: boolean = false,
  ) => {
    if (isPrimary) {
      const updatedPrimary = section.data.primaryContact.map((contact: any) =>
        contact.id === contactId
          ? {
              ...contact,
              phones:
                contact.phones?.filter((p: any) => p.id !== phoneId) || [],
            }
          : contact,
      );
      updateSectionData(section.id, { primaryContact: updatedPrimary });
    } else {
      const updatedAdditional = section.data.additionalContacts.map(
        (contact: any) =>
          contact.id === contactId
            ? {
                ...contact,
                phones:
                  contact.phones?.filter((p: any) => p.id !== phoneId) || [],
              }
            : contact,
      );
      updateSectionData(section.id, { additionalContacts: updatedAdditional });
    }
  };

  const updatePhone = (
    contactId: string,
    phoneId: string,
    field: string,
    value: string,
    isPrimary: boolean = false,
  ) => {
    if (isPrimary) {
      const updatedPrimary = section.data.primaryContact.map((contact: any) =>
        contact.id === contactId
          ? {
              ...contact,
              phones:
                contact.phones?.map((p: any) =>
                  p.id === phoneId ? { ...p, [field]: value } : p,
                ) || [],
            }
          : contact,
      );
      updateSectionData(section.id, { primaryContact: updatedPrimary });
    } else {
      const updatedAdditional = section.data.additionalContacts.map(
        (contact: any) =>
          contact.id === contactId
            ? {
                ...contact,
                phones:
                  contact.phones?.map((p: any) =>
                    p.id === phoneId ? { ...p, [field]: value } : p,
                  ) || [],
              }
            : contact,
      );
      updateSectionData(section.id, { additionalContacts: updatedAdditional });
    }
  };

  const updateContact = (
    contactId: string,
    field: string,
    value: any,
    isPrimary: boolean = false,
  ) => {
    if (isPrimary) {
      const updatedPrimary = section.data.primaryContact.map((contact: any) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact,
      );
      updateSectionData(section.id, { primaryContact: updatedPrimary });
    } else {
      const updatedAdditional = section.data.additionalContacts.map(
        (contact: any) =>
          contact.id === contactId ? { ...contact, [field]: value } : contact,
      );
      updateSectionData(section.id, { additionalContacts: updatedAdditional });
    }
  };

  const addAdditionalContact = () => {
    // Use the new contact person functionality
    addContactPerson();
  };

  const removeAdditionalContact = (contactId: string) => {
    // Use the new contact person functionality
    removeContactPerson(contactId);
  };

  const renderPhoneInputs = (contact: any, isPrimary: boolean = false) => (
    <View style={multiContactStyles.phoneSection}>
      <View style={multiContactStyles.phoneSectionHeader}>
        <Text style={styles.fieldLabel}>Phone Numbers</Text>
        <TouchableOpacity
          style={multiContactStyles.addPhoneButton}
          onPress={() => addPhone(contact.id, isPrimary)}
        >
          <Ionicons name="add-circle" size={20} color="#007AFF" />
          <Text style={multiContactStyles.addPhoneText}>Add Phone</Text>
        </TouchableOpacity>
      </View>

      {contact.phones?.map((phone: any, index: number) => (
        <View key={phone.id} style={multiContactStyles.phoneInput}>
          <View style={multiContactStyles.phoneInputHeader}>
            <Text style={multiContactStyles.phoneInputLabel}>
              Phone {index + 1}
            </Text>
            <TouchableOpacity
              onPress={() => removePhone(contact.id, phone.id, isPrimary)}
              style={multiContactStyles.removePhoneButton}
            >
              <Ionicons name="trash-outline" size={16} color="#ff3b30" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={phone.label}
            onChangeText={(text) =>
              updatePhone(contact.id, phone.id, "label", text, isPrimary)
            }
            placeholder="Label (e.g., Office, Mobile)"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            value={phone.number}
            onChangeText={(text) =>
              updatePhone(contact.id, phone.id, "number", text, isPrimary)
            }
            placeholder="Phone Number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>
      ))}
    </View>
  );

  const renderContactEditor = (contact: any, isPrimary: boolean = false) => {
    const isExpanded = false; // TODO: Fix this old implementation

    return (
      <View
        key={contact.id}
        style={[
          multiContactStyles.contactCard,
          isPrimary && multiContactStyles.primaryContactCard,
        ]}
      >
        <View style={multiContactStyles.contactHeader}>
          <Text style={multiContactStyles.contactHeaderText}>
            {isPrimary ? "Primary Contact" : "Additional Contact"}
          </Text>
          {!isPrimary && (
            <TouchableOpacity
              onPress={() => removeAdditionalContact(contact.id)}
              style={multiContactStyles.removeContactButton}
            >
              <Ionicons name="trash-outline" size={16} color="#ff3b30" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {}} // TODO: Fix this old implementation
            style={multiContactStyles.expandButton}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>

        {/* Basic Contact Info */}
        <TextInput
          style={styles.input}
          value={contact.name}
          onChangeText={(text) =>
            updateContact(contact.id, "name", text, isPrimary)
          }
          placeholder="Full Name"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          value={contact.title}
          onChangeText={(text) =>
            updateContact(contact.id, "title", text, isPrimary)
          }
          placeholder="Title/Position"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          value={contact.email}
          onChangeText={(text) =>
            updateContact(contact.id, "email", text, isPrimary)
          }
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Expanded Section */}
        {isExpanded && (
          <View style={multiContactStyles.expandedSection}>
            {/* Photo Upload for Primary Contact */}
            {isPrimary && pickImage && (
              <View style={multiContactStyles.photoSection}>
                <Text style={styles.fieldLabel}>Contact Photo</Text>
                <TouchableOpacity
                  style={multiContactStyles.photoButton}
                  onPress={() =>
                    pickImage(section.id, `primaryContact.0.photo`)
                  }
                >
                  <Ionicons name="camera" size={24} color="#007AFF" />
                  <Text style={multiContactStyles.photoButtonText}>
                    {contact.photo ? "Change Photo" : "Add Photo"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Phone Numbers */}
            {renderPhoneInputs(contact, isPrimary)}

            {/* Primary Contact Additional Fields */}
            {isPrimary && (
              <>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={contact.address}
                  onChangeText={(text) =>
                    updateContact(contact.id, "address", text, isPrimary)
                  }
                  placeholder="Address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />

                <TextInput
                  style={styles.input}
                  value={contact.fax}
                  onChangeText={(text) =>
                    updateContact(contact.id, "fax", text, isPrimary)
                  }
                  placeholder="Fax Number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderBusinessEditor = () => (
    <View style={multiContactStyles.sectionCard}>
      <TouchableOpacity
        style={multiContactStyles.sectionHeader}
        onPress={() =>
          setExpandedSection(expandedSection === "business" ? null : "business")
        }
      >
        <View style={multiContactStyles.sectionHeaderLeft}>
          <Ionicons
            name="business"
            size={20}
            color="#007AFF"
            style={{ marginRight: 8 }}
          />
          <Text style={multiContactStyles.sectionTitle}>
            Main Business Information
          </Text>
        </View>
        <Ionicons
          name={expandedSection === "business" ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {expandedSection === "business" && (
        <View style={multiContactStyles.sectionContent}>
          <Text style={styles.fieldLabel}>Business/Organization Name *</Text>
          <TextInput
            style={styles.input}
            value={businessInfo.name || ""}
            onChangeText={(text) => updateBusinessInfo("name", text)}
            placeholder="Your Business Name"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Business Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={businessInfo.address || ""}
            onChangeText={(text) => updateBusinessInfo("address", text)}
            placeholder="123 Main Street, City, State 12345"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
          />

          <Text style={styles.fieldLabel}>Main Phone Number</Text>
          <TextInput
            style={styles.input}
            value={businessInfo.phone || ""}
            onChangeText={(text) => updateBusinessInfo("phone", text)}
            placeholder="(555) 123-4567"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Fax Number</Text>
          <TextInput
            style={styles.input}
            value={businessInfo.fax || ""}
            onChangeText={(text) => updateBusinessInfo("fax", text)}
            placeholder="(555) 123-4568"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Main Email</Text>
          <TextInput
            style={styles.input}
            value={businessInfo.email || ""}
            onChangeText={(text) => updateBusinessInfo("email", text)}
            placeholder="info@business.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput
            style={styles.input}
            value={businessInfo.website || ""}
            onChangeText={(text) => updateBusinessInfo("website", text)}
            placeholder="https://www.yourbusiness.com"
            placeholderTextColor="#999"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      )}
    </View>
  );

  const renderContactPersonEditor = (contact: any) => (
    <View key={contact.id} style={multiContactStyles.contactPersonCard}>
      <View style={multiContactStyles.contactPersonHeader}>
        <Text style={multiContactStyles.contactPersonTitle}>
          {contact.name || "Contact Person"}
        </Text>
        <TouchableOpacity
          onPress={() => removeContactPerson(contact.id)}
          style={multiContactStyles.removeContactButton}
        >
          <Ionicons name="trash-outline" size={18} color="#ff3b30" />
        </TouchableOpacity>
      </View>

      <Text style={styles.fieldLabel}>Contact Name *</Text>
      <TextInput
        style={styles.input}
        value={contact.name || ""}
        onChangeText={(text) => updateContactPerson(contact.id, "name", text)}
        placeholder="John Smith"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Title/Department</Text>
      <TextInput
        style={styles.input}
        value={contact.title || ""}
        onChangeText={(text) => updateContactPerson(contact.id, "title", text)}
        placeholder="Sales Manager"
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.imageButton}
        onPress={() =>
          pickImage(
            section.id,
            `contactPersons.${contactPersons.indexOf(contact)}.photo`,
            contact.photo,
          )
        }
      >
        <Ionicons name="camera-outline" size={24} color="#007AFF" />
        <Text style={styles.imageButtonText}>
          {contact.photo ? "Change Photo" : "Add Photo"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Direct Phone</Text>
      <TextInput
        style={styles.input}
        value={contact.phone || ""}
        onChangeText={(text) => updateContactPerson(contact.id, "phone", text)}
        placeholder="(555) 123-4567"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>Extension</Text>
      <TextInput
        style={styles.input}
        value={contact.extension || ""}
        onChangeText={(text) =>
          updateContactPerson(contact.id, "extension", text)
        }
        placeholder="ext. 123"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Direct Email</Text>
      <TextInput
        style={styles.input}
        value={contact.email || ""}
        onChangeText={(text) => updateContactPerson(contact.id, "email", text)}
        placeholder="john@business.com"
        placeholderTextColor="#999"
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );

  const renderContactPersonsSection = () => (
    <View style={multiContactStyles.sectionCard}>
      <TouchableOpacity
        style={multiContactStyles.sectionHeader}
        onPress={() =>
          setExpandedSection(expandedSection === "contacts" ? null : "contacts")
        }
      >
        <View style={multiContactStyles.sectionHeaderLeft}>
          <Ionicons
            name="people"
            size={20}
            color="#007AFF"
            style={{ marginRight: 8 }}
          />
          <Text style={multiContactStyles.sectionTitle}>
            Additional Contact
          </Text>
          {contactPersons.length > 0 && (
            <View style={multiContactStyles.badge}>
              <Text style={multiContactStyles.badgeText}>
                {contactPersons.length}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={addContactPerson}
            style={multiContactStyles.addContactButton}
          >
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <Ionicons
            name={
              expandedSection === "contacts" ? "chevron-up" : "chevron-down"
            }
            size={20}
            color="#666"
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>

      {expandedSection === "contacts" && (
        <View style={multiContactStyles.sectionContent}>
          {contactPersons.length === 0 ? (
            <View style={multiContactStyles.emptyState}>
              <Ionicons name="person-add-outline" size={48} color="#ccc" />
              <Text style={multiContactStyles.emptyStateText}>
                No additional contacts added
              </Text>
              <Text style={multiContactStyles.emptyStateSubtext}>
                Add additional contacts like departments, email addresses, or
                alternate phone numbers.
              </Text>
            </View>
          ) : (
            contactPersons.map(renderContactPersonEditor)
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.fieldContainer}>
      {/* Section Title */}
      <Text style={styles.fieldLabel}>Section Title</Text>
      <TextInput
        style={styles.input}
        value={section.data.title || ""}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Contact Information"
        placeholderTextColor="#999"
      />

      {/* Description */}
      <View style={multiContactStyles.description}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={multiContactStyles.descriptionText}>
          Create a professional contact section - main business info plus
          additional contact options.
        </Text>
      </View>

      {/* Main Business Information */}
      {renderBusinessEditor()}

      {/* Contact Persons */}
      {renderContactPersonsSection()}

      {/* Section Styles */}
      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};

// Multi-Contact Editor Styles
const multiContactStyles = StyleSheet.create({
  // New styles for the improved editor
  description: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sectionContent: {
    padding: 16,
  },
  badge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  addContactButton: {
    padding: 4,
  },
  contactPersonCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  contactPersonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  contactPersonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  removeContactButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },

  // Legacy styles (to be removed)
  contactCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  primaryContactCard: {
    backgroundColor: "#f0f8ff",
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  contactHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  expandButton: {
    padding: 8,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  photoSection: {
    marginBottom: 16,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
  },
  photoButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontWeight: "500",
  },
  phoneSection: {
    marginBottom: 16,
  },
  phoneSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addPhoneButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  addPhoneText: {
    marginLeft: 4,
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  phoneInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  phoneInputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  phoneInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  removePhoneButton: {
    padding: 4,
  },
  additionalContactsSection: {
    marginTop: 16,
  },
  additionalContactsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addContactText: {
    marginLeft: 4,
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
});

export const VideoThumbnail: FC<{
  videoUrl: string;
  thumbnailUrl?: string | null;
  onPress: () => void;
}> = ({ videoUrl, thumbnailUrl, onPress }) => {
  const player = useVideoPlayer(thumbnailUrl ? null : videoUrl);
  return (
    <View
      style={{
        width: 120,
        height: 120,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 8,
            backgroundColor: "#000",
          }}
          resizeMode="cover"
        />
      ) : (
        <VideoView
          style={{
            width: 120,
            height: 120,
            borderRadius: 8,
            backgroundColor: "#000",
          }}
          player={player!}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
        />
      )}
      <TouchableOpacity
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          zIndex: 2,
        }}
        onPress={onPress}
        activeOpacity={1}
      />
    </View>
  );
};
const stylesLocal = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  subFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#999",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  hexInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  hexInputLabel: {
    fontSize: 16,
    color: "#666",
    marginRight: 4,
    fontFamily: "monospace",
  },
  hexInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontFamily: "monospace",
    padding: 4,
  },
  colorPicker: {
    width: "100%",
  },
  colorPreviewPicker: {
    marginBottom: 16,
    borderRadius: 8,
    height: 40,
  },
  colorPanel: {
    borderRadius: 8,
    marginBottom: 16,
    height: 200,
  },
  colorSlider: {
    borderRadius: 8,
    marginBottom: 16,
    height: 32,
  },
  swatches: {
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
});

// Company Header Editor - for business name, address, map link
export const CompanyHeaderEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Company Name</Text>
      <TextInput
        style={styles.input}
        value={section.data.companyName || ""}
        onChangeText={(text) =>
          updateSectionData(section.id, { companyName: text })
        }
        placeholder="Enter company name"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Address</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={section.data.address || ""}
        onChangeText={(text) =>
          updateSectionData(section.id, { address: text })
        }
        placeholder="Enter full address"
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />

      <Text style={styles.fieldLabel}>Map URL (Optional)</Text>
      <TextInput
        style={styles.input}
        value={section.data.mapUrl || ""}
        onChangeText={(text) => updateSectionData(section.id, { mapUrl: text })}
        placeholder="Google Maps link or address for mapping"
        placeholderTextColor="#999"
      />

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};

// Contact Card Editor - for displaying contact person
export const ContactCardEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
  pickImage,
}: SectionEditorProps) => {
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">(
    "upload",
  );

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Contact Name</Text>
      <TextInput
        style={styles.input}
        value={section.data.name || ""}
        onChangeText={(text) => updateSectionData(section.id, { name: text })}
        placeholder="Enter contact person name"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Role/Title</Text>
      <TextInput
        style={styles.input}
        value={section.data.role || ""}
        onChangeText={(text) => updateSectionData(section.id, { role: text })}
        placeholder="e.g., Sales Director, Manager"
        placeholderTextColor="#999"
      />

      <Text style={styles.fieldLabel}>Phone</Text>
      <TextInput
        style={styles.input}
        value={section.data.phone || ""}
        onChangeText={(text) => updateSectionData(section.id, { phone: text })}
        placeholder="Phone number"
        placeholderTextColor="#999"
        keyboardType="phone-pad"
      />

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        style={styles.input}
        value={section.data.email || ""}
        onChangeText={(text) => updateSectionData(section.id, { email: text })}
        placeholder="Email address"
        placeholderTextColor="#999"
        keyboardType="email-address"
      />

      <Text style={styles.fieldLabel}>Contact Image (Optional)</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            imageInputMode === "upload" && styles.toggleButtonActive,
          ]}
          onPress={() => setImageInputMode("upload")}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={18}
            color={imageInputMode === "upload" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.toggleButtonText,
              imageInputMode === "upload" && styles.toggleButtonTextActive,
            ]}
          >
            Upload
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            imageInputMode === "url" && styles.toggleButtonActive,
          ]}
          onPress={() => setImageInputMode("url")}
        >
          <Ionicons
            name="link-outline"
            size={18}
            color={imageInputMode === "url" ? "#007AFF" : "#666"}
          />
          <Text
            style={[
              styles.toggleButtonText,
              imageInputMode === "url" && styles.toggleButtonTextActive,
            ]}
          >
            URL
          </Text>
        </TouchableOpacity>
      </View>

      {section.data.imageUrl && (
        <Image
          source={{ uri: generatePublicUrl(section.data.imageUrl) || "" }}
          style={styles.previewImage}
        />
      )}

      {imageInputMode === "upload" ? (
        <TouchableOpacity
          style={styles.imageButton}
          onPress={async () => {
            // Use Expo ImagePicker with square cropping for profile pictures
            const result = await pickImage(
              section.id,
              "imageUrl",
              section.data.imageUrl,
              {
                allowCropping: true,
              },
            );
            if (result) {
              updateSectionData(section.id, { imageUrl: result.path });
            }
          }}
        >
          <Ionicons name="image-outline" size={20} color="#007AFF" />
          <Text style={styles.imageButtonText}>
            {section.data.imageUrl ? "Change Image" : "Upload Image"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TextInput
          style={styles.input}
          value={section.data.imageUrl || ""}
          onChangeText={(text) =>
            updateSectionData(section.id, { imageUrl: text })
          }
          placeholder="Paste image URL (e.g., https://...)"
          placeholderTextColor="#999"
        />
      )}

      <Text style={styles.fieldLabel}>Availability Status</Text>
      <TextInput
        style={styles.input}
        value={section.data.status || ""}
        onChangeText={(text) => updateSectionData(section.id, { status: text })}
        placeholder="e.g., Available, Online, Offline"
        placeholderTextColor="#999"
      />

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};

// Amenities Section Editor - for grid of amenities with icons
export const AmenitiesEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  const amenities = section.data.amenities || [];

  const addAmenity = () => {
    const newAmenity = {
      id: `amenity_${Date.now()}`,
      name: "",
      icon: "checkmark-circle",
    };
    updateSectionData(section.id, {
      amenities: [...amenities, newAmenity],
    });
  };

  const removeAmenity = (amenityId: string) => {
    const updated = amenities.filter((a: any) => a.id !== amenityId);
    updateSectionData(section.id, { amenities: updated });
  };

  const updateAmenity = (amenityId: string, field: string, value: any) => {
    const updated = amenities.map((a: any) =>
      a.id === amenityId ? { ...a, [field]: value } : a,
    );
    updateSectionData(section.id, { amenities: updated });
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Section Title</Text>
      <TextInput
        style={styles.input}
        value={section.data.title || ""}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Amenities & Features"
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Amenities List</Text>

      {amenities.map((amenity: any, index: number) => (
        <View key={amenity.id} style={styles.listItem}>
          <View style={styles.listItemHeader}>
            <Text style={styles.listItemTitle}>Amenity {index + 1}</Text>
            <TouchableOpacity onPress={() => removeAmenity(amenity.id)}>
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={amenity.name}
            onChangeText={(text) => updateAmenity(amenity.id, "name", text)}
            placeholder="Amenity name (e.g., Free Wi-Fi)"
            placeholderTextColor="#999"
          />

          {/* Icon field hidden - amenities use bullet points only */}
        </View>
      ))}

      {amenities.length === 0 && (
        <Text style={styles.emptyText}>No amenities added yet</Text>
      )}

      <TouchableOpacity
        style={[styles.addItemButton, { marginTop: 12, marginBottom: 16 }]}
        onPress={addAmenity}
      >
        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.addItemButtonText}>Add Amenity</Text>
      </TouchableOpacity>

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};

// UNIFIED EDITOR - Handles BOTH Pages and Contact, can show split view
export const LinksWithContactEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
  pickImage,
  pickDocument,
  pickMediaFromDevice,
  pickImageFromFiles,
  pickVideoFromFiles,
  uploadLocalFile,
  mode = "all",
}: SectionEditorProps) => {
  const links = section.data.links || [];
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">(
    "upload",
  );
  const [linkImageModes, setLinkImageModes] = useState<
    Record<string, "upload" | "url">
  >({});
  const [mediaSourceModalVisible, setMediaSourceModalVisible] = useState(false);
  const [selectedLinkIdForMedia, setSelectedLinkIdForMedia] = useState<
    string | null
  >(null);
  const [pendingMediaSource, setPendingMediaSource] = useState<
    "drive" | "photos" | "files" | null
  >(null);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [selectedLinkIdForIcon, setSelectedLinkIdForIcon] = useState<
    string | null
  >(null);
  const [stackVideoPreviewUrl, setStackVideoPreviewUrl] = useState<string | null>(null);

  // Ref to track modal dismissal completion
  const modalDismissResolveRef = useRef<(() => void) | null>(null);

  const getLinkImageMode = (linkId: string) => {
    return linkImageModes[linkId] || "upload";
  };

  const setLinkImageMode = (linkId: string, mode: "upload" | "url") => {
    setLinkImageModes((prev) => ({ ...prev, [linkId]: mode }));
  };

  const addLink = () => {
    const newLink = {
      id: `link_${Date.now()}`,
      title: "",
      url: "",
      image: "",
    };
    updateSectionData(section.id, {
      links: [...links, newLink],
    });
  };

  const removeLink = (linkId: string) => {
    const updated = links.filter((l: any) => l.id !== linkId);
    updateSectionData(section.id, { links: updated });
  };

  const updateLink = (linkId: string, field: string, value: any) => {
    const updated = links.map((l: any) =>
      l.id === linkId ? { ...l, [field]: value } : l,
    );
    updateSectionData(section.id, { links: updated });
  };

  const handleUploadButtonPress = (linkId: string) => {
    setSelectedLinkIdForMedia(linkId);
    setMediaSourceModalVisible(true);
  };

  // Called when modal is fully dismissed (animation complete)
  const handleModalDismiss = async () => {
    // Resolve the promise to signal modal is fully dismissed
    if (modalDismissResolveRef.current) {
      modalDismissResolveRef.current();
      modalDismissResolveRef.current = null;
    }

    // If there's a pending media source selection, process it now
    if (pendingMediaSource) {
      const source = pendingMediaSource;
      setPendingMediaSource(null);

      const linkId = selectedLinkIdForMedia;
      if (!linkId) return;

      const link = links.find((l: any) => l.id === linkId);
      if (!link) return;

      try {
        let result: FileUploadData | undefined;

        if (source === "drive") {
          if (!pickDocument) {
            Alert.alert("Error", "Document picker not available");
            return;
          }
          result = await pickDocument(
            section.id,
            `link_${linkId}_file`,
            link.url,
          );
        } else if (source === "photos") {
          if (!pickMediaFromDevice) {
            Alert.alert("Error", "Media picker not available");
            return;
          }
          result = await pickMediaFromDevice(
            section.id,
            `link_${linkId}_file`,
            link.url,
          );
        } else if (source === "files") {
          result = await new Promise((resolve) => {
            Alert.alert("File Type", undefined, [
              { text: "Image", onPress: async () => {
                resolve(pickImageFromFiles ? await pickImageFromFiles(section.id, `link_${linkId}_file`, link.url) : undefined);
              }},
              { text: "Video", onPress: async () => {
                resolve(pickVideoFromFiles ? await pickVideoFromFiles(section.id, `link_${linkId}_file`) : undefined);
              }},
              { text: "Cancel", style: "cancel", onPress: () => resolve(undefined) },
            ]);
          });
        }

        if (result) {
          updateLink(linkId, "url", result.path);
        }
      } catch (error: any) {
        console.error("Error uploading media:", error);
        Alert.alert("Upload Error", error.message || "Failed to upload media");
      } finally {
        setSelectedLinkIdForMedia(null);
      }
    }
  };

  const handleMediaSourceSelection = async (source: "drive" | "photos" | "files") => {
    const linkId = selectedLinkIdForMedia;
    if (!linkId) return;

    const link = links.find((l: any) => l.id === linkId);
    if (!link) return;

    // Close the modal first
    setMediaSourceModalVisible(false);

    // On iOS, use onDismiss callback. On Android, wait for modal animation to complete
    if (Platform.OS === "android") {
      // Wait for modal animation to complete on Android (typically 300ms for slide animation)
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Now open the picker
      try {
        let result: FileUploadData | undefined;

        if (source === "drive") {
          if (!pickDocument) {
            Alert.alert("Error", "Document picker not available");
            return;
          }
          result = await pickDocument(
            section.id,
            `link_${linkId}_file`,
            link.url,
          );
        } else if (source === "photos") {
          if (!pickMediaFromDevice) {
            Alert.alert("Error", "Media picker not available");
            return;
          }
          result = await pickMediaFromDevice(
            section.id,
            `link_${linkId}_file`,
            link.url,
          );
        } else if (source === "files") {
          result = await new Promise((resolve) => {
            Alert.alert("File Type", undefined, [
              { text: "Image", onPress: async () => {
                resolve(pickImageFromFiles ? await pickImageFromFiles(section.id, `link_${linkId}_file`, link.url) : undefined);
              }},
              { text: "Video", onPress: async () => {
                resolve(pickVideoFromFiles ? await pickVideoFromFiles(section.id, `link_${linkId}_file`) : undefined);
              }},
              { text: "Cancel", style: "cancel", onPress: () => resolve(undefined) },
            ]);
          });
        }

        if (result) {
          updateLink(linkId, "url", result.path);
        }
      } catch (error: any) {
        console.error("Error uploading media:", error);
        Alert.alert("Upload Error", error.message || "Failed to upload media");
      } finally {
        setSelectedLinkIdForMedia(null);
      }
    } else {
      // On iOS, store the pending action and let onDismiss handle it
      setPendingMediaSource(source);
    }
  };

  const showPages = mode === "all" || mode === "links";
  const showContact = mode === "all" || mode === "contact";

  return (
    <View style={styles.fieldContainer}>
      {/* PAGES SECTION — only shown when mode is 'links' or 'all' */}
      {showPages && mode === "all" && (
        <View style={linkStyles.sectionDivider}>
          <Ionicons name="document-outline" size={20} color="#007AFF" />
          <Text style={linkStyles.sectionDividerText}>PAGES SECTION</Text>
        </View>
      )}

      {showPages && (
        <>
          <Text style={styles.fieldLabel}>Section Title</Text>
          <TextInput
            style={styles.input}
            value={section.data.title || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { title: text })
            }
            placeholder="Pages"
            placeholderTextColor="#999"
          />

          {links.map((link: any, index: number) => {
            // Infer content type from data for backward-compat (old links have no explicit contentType)
            const contentType: "link" | "image" | "file" | "stack" =
              link.contentType ??
              ((link.mediaItems || []).length > 0
                ? "stack"
                : link.url?.startsWith("http")
                  ? "link"
                  : link.url
                    ? "file"
                    : "link");

            const applyContentType = (
              type: "link" | "image" | "file" | "stack",
            ) => {
              // Single updateSectionData call — multiple updateLink calls each trigger a full re-render
              const patch: any = { contentType: type };
              if (type === "stack") patch.url = "";
              if (type !== "stack") patch.mediaItems = [];
              if (type === "link" && !link.url?.startsWith("http"))
                patch.url = "";
              const updated = links.map((l: any) =>
                l.id === link.id ? { ...l, ...patch } : l,
              );
              updateSectionData(section.id, { links: updated });
            };

            const typeOptions: {
              type: "link" | "image" | "file" | "stack";
              icon: any;
              label: string;
            }[] = [
              { type: "link", icon: "link-outline", label: "Link" },
              { type: "image", icon: "image-outline", label: "Image" },
              {
                type: "file",
                icon: "document-text-outline",
                label: "File / PDF",
              },
              { type: "stack", icon: "layers-outline", label: "Media Stack" },
            ];

            return (
              <View key={link.id} style={pcStyles.card}>
                {/* Card header */}
                <View style={pcStyles.cardHeader}>
                  <Ionicons
                    name={(link.icon as any) || "document-outline"}
                    size={16}
                    color="#007AFF"
                  />
                  <Text style={pcStyles.cardHeaderTitle} numberOfLines={1}>
                    {link.title?.trim() || `Page ${index + 1}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeLink(link.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff3b30" />
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <TextInput
                  style={pcStyles.titleInput}
                  value={link.title || ""}
                  onChangeText={(t) => updateLink(link.id, "title", t)}
                  placeholder="Page name"
                  placeholderTextColor="#aaa"
                />

                {/* Icon picker */}
                <TouchableOpacity
                  style={pcStyles.iconRow}
                  onPress={() => {
                    setSelectedLinkIdForIcon(link.id);
                    setIconPickerVisible(true);
                  }}
                >
                  <Ionicons
                    name={(link.icon as any) || "document-outline"}
                    size={15}
                    color="#007AFF"
                  />
                  <Text style={pcStyles.iconRowText}>
                    {link.icon ? "Change icon" : "Select icon"}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color="#bbb" />
                </TouchableOpacity>

                {/* Content type selector */}
                <Text style={pcStyles.sectionLabel}>Content</Text>
                <View style={pcStyles.typeGrid}>
                  {typeOptions.map(({ type: t, icon, label }) => {
                    const active = contentType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          pcStyles.typeTile,
                          active && pcStyles.typeTileActive,
                        ]}
                        onPress={() => applyContentType(t)}
                      >
                        <Ionicons
                          name={icon}
                          size={20}
                          color={active ? "#fff" : "#555"}
                        />
                        <Text
                          style={[
                            pcStyles.typeTileLabel,
                            active && pcStyles.typeTileLabelActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Link */}
                {contentType === "link" && (
                  <TextInput
                    style={pcStyles.urlInput}
                    value={link.url?.startsWith("http") ? link.url : ""}
                    onChangeText={(t) => updateLink(link.id, "url", t)}
                    placeholder="https://example.com"
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                )}

                {/* Image */}
                {contentType === "image" && (
                  <View>
                    {link.image ? (
                      <Image
                        source={{ uri: generatePublicUrl(link.image) || "" }}
                        style={pcStyles.previewImg}
                      />
                    ) : null}
                    <TouchableOpacity
                      style={pcStyles.uploadBtn}
                      onPress={async () => {
                        const result = await pickImage(
                          section.id,
                          `link_${link.id}_img`,
                          link.image,
                          { allowCropping: false },
                        );
                        if (result) {
                          const updated = links.map((l: any) =>
                            l.id === link.id
                              ? { ...l, image: result.path, url: result.path }
                              : l,
                          );
                          updateSectionData(section.id, { links: updated });
                        }
                      }}
                    >
                      <Ionicons name="cloud-upload-outline" size={17} color="#007AFF" />
                      <Text style={pcStyles.uploadBtnText}>
                        {link.image ? "Change Image" : "Upload Image"}
                      </Text>
                    </TouchableOpacity>

                    {link.image && (
                      <TouchableOpacity
                        onPress={() => {
                          const updated = links.map((l: any) =>
                            l.id === link.id ? { ...l, image: "", url: "" } : l
                          );
                          updateSectionData(section.id, { links: updated });
                        }}
                      >
                        <Text style={[pcStyles.removeText, { paddingHorizontal: 14 }]}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* File / PDF */}
                {contentType === "file" && (
                  <View>
                    {link.url && !link.url.startsWith("http") ? (
                      <View style={pcStyles.fileChip}>
                        <Ionicons
                          name="document-text"
                          size={15}
                          color="#007AFF"
                        />
                        <Text style={pcStyles.fileChipText} numberOfLines={1}>
                          {link.url.split("/").pop()}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateLink(link.id, "url", "")}
                        >
                          <Ionicons
                            name="close-circle"
                            size={15}
                            color="#aaa"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={pcStyles.uploadBtn}
                      onPress={() => handleUploadButtonPress(link.id)}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={17}
                        color="#007AFF"
                      />
                      <Text style={pcStyles.uploadBtnText}>
                        {link.url && !link.url.startsWith("http")
                          ? "Replace File"
                          : "Upload File (PDF, Image, Video…)"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Photo Stack */}
                {contentType === "stack" && (
                  <View>
                    {(link.mediaItems || []).length === 0 && (
                      <Text style={pcStyles.stackEmpty}>
                        Add photos and videos — viewers scroll through them
                        fullscreen like a document.
                      </Text>
                    )}
                    {(link.mediaItems || []).map((item: any, mIdx: number) => {
                      const thumbUri = item.thumbnail
                        ? (item.thumbnail.startsWith('http') ? item.thumbnail : (generatePublicUrl(item.thumbnail) || ''))
                        : (isMuxUrl(item.url) ? getMuxThumbnail(item.url) : null);
                      return (
                      <View key={item.id} style={pcStyles.stackItem}>
                        <TouchableOpacity
                          onPress={() => {
                            if (item.type === 'video') {
                              const url = isMuxUrl(item.url) ? getMuxStreamUrl(item.url) : item.url;
                              setStackVideoPreviewUrl(url);
                            }
                          }}
                          disabled={item.type !== 'video'}
                          activeOpacity={item.type === 'video' ? 0.7 : 1}
                        >
                          {thumbUri ? (
                            <View>
                              <Image
                                source={{ uri: thumbUri }}
                                style={pcStyles.stackThumb}
                              />
                              {item.type === 'video' && (
                                <View style={pcStyles.stackThumbPlay}>
                                  <Ionicons name="play-circle" size={22} color="rgba(255,255,255,0.9)" />
                                </View>
                              )}
                            </View>
                          ) : (
                            <View style={pcStyles.stackThumbPlaceholder}>
                              <Ionicons
                                name={item.type === "video" ? "videocam-outline" : "image-outline"}
                                size={18}
                                color="#007AFF"
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                        <Text style={pcStyles.stackItemLabel} numberOfLines={1}>
                          {item.type === "video" ? "▶ Video" : "🖼 Photo"}{" "}
                          {mIdx + 1}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            const updated = (link.mediaItems || []).filter(
                              (m: any) => m.id !== item.id,
                            );
                            updateLink(link.id, "mediaItems", updated);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#ff3b30"
                          />
                        </TouchableOpacity>
                      </View>
                      );
                    })}
                    <View style={pcStyles.stackAddRow}>
                      <TouchableOpacity
                        style={pcStyles.stackAddBtn}
                        onPress={() => {
                          Alert.alert("Add Photo From", undefined, [
                            { text: "Photo Library", onPress: async () => {
                              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                              if (status !== "granted") return;
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ['images'],
                                allowsMultipleSelection: true,
                                quality: 0.85,
                              });
                              if (result.canceled || !result.assets?.length) return;
                              const newItems: any[] = [];
                              for (const asset of result.assets) {
                                let storagePath: string | undefined;
                                const fileName = `stack_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
                                if (uploadLocalFile) {
                                  storagePath = await uploadLocalFile(asset.uri, section.id, fileName, "image/jpeg");
                                }
                                if (storagePath) {
                                  newItems.push({ id: `media_${Date.now()}_${Math.random().toString(36).slice(2)}`, type: "photo", url: storagePath, thumbnail: storagePath });
                                }
                              }
                              if (newItems.length)
                                updateLink(link.id, "mediaItems", [...(link.mediaItems || []), ...newItems]);
                            }},
                            { text: "Files", onPress: async () => {
                              if (!pickImageFromFiles) return;
                              const result = await pickImageFromFiles(section.id, `link_${link.id}_m_${Date.now()}`);
                              if (result) {
                                updateLink(link.id, "mediaItems", [...(link.mediaItems || []), { id: `media_${Date.now()}`, type: "photo", url: result.path, thumbnail: result.path }]);
                              }
                            }},
                            { text: "Cancel", style: "cancel" },
                          ]);
                        }}
                      >
                        <Ionicons
                          name="image-outline"
                          size={16}
                          color="#007AFF"
                        />
                        <Text style={pcStyles.stackAddBtnText}>Add Photos</Text>
                      </TouchableOpacity>
                      {pickMediaFromDevice && (
                        <TouchableOpacity
                          style={pcStyles.stackAddBtn}
                          onPress={() => {
                            Alert.alert("Add Video From", undefined, [
                              { text: "Photo Library", onPress: async () => {
                                const result = await pickMediaFromDevice(
                                  section.id,
                                  `link_${link.id}_m_${Date.now()}`,
                                );
                                if (result) {
                                  updateLink(link.id, "mediaItems", [...(link.mediaItems || []), { id: `media_${Date.now()}`, type: "video", url: result.path, thumbnail: result.thumbnailPath || null }]);
                                }
                              }},
                              { text: "Files", onPress: async () => {
                                if (!pickVideoFromFiles) return;
                                const result = await pickVideoFromFiles(section.id, `link_${link.id}_m_${Date.now()}`);
                                if (result) {
                                  updateLink(link.id, "mediaItems", [...(link.mediaItems || []), { id: `media_${Date.now()}`, type: "video", url: result.path, thumbnail: result.thumbnailPath || null }]);
                                }
                              }},
                              { text: "Cancel", style: "cancel" },
                            ]);
                          }}
                        >
                          <Ionicons
                            name="videocam-outline"
                            size={16}
                            color="#007AFF"
                          />
                          <Text style={pcStyles.stackAddBtnText}>
                            Add Video
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Row thumbnail — optional for all types */}
                <View style={pcStyles.thumbSection}>
                  <Text style={pcStyles.sectionLabel}>
                    Row thumbnail (optional)
                  </Text>
                  {link.image && contentType !== "image" ? (
                    <View style={pcStyles.thumbRow}>
                      <Image
                        source={{ uri: generatePublicUrl(link.image) || "" }}
                        style={pcStyles.thumbPreview}
                      />
                      <TouchableOpacity
                        onPress={() => updateLink(link.id, "image", "")}
                      >
                        <Text style={pcStyles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={pcStyles.thumbBtn}
                    onPress={async () => {
                      const result = await pickImage(
                        section.id,
                        `link_${link.id}_thumb`,
                        link.image,
                        { allowCropping: true, aspectRatio: [4, 3] },
                      );
                      if (result) updateLink(link.id, "image", result.path);
                    }}
                  >
                    <Ionicons name="image-outline" size={15} color="#555" />
                    <Text style={pcStyles.thumbBtnText}>
                      {link.image && contentType !== "image"
                        ? "Change thumbnail"
                        : "Add thumbnail"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {links.length === 0 && (
            <Text style={styles.emptyText}>No pages added yet</Text>
          )}

          <TouchableOpacity
            style={linkStyles.addLinkButtonStyled}
            onPress={addLink}
          >
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <Text style={linkStyles.addLinkButtonText}>Add Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              linkStyles.addLinkButtonStyled,
              {
                backgroundColor: "#34495e",
                borderColor: "#34495e",
                marginTop: 8,
              },
            ]}
            onPress={async () => {
              try {
                // Multi-page scanning — up to 10 pages assembled into one PDF
                const { scannedImages } = await DocumentScanner.scanDocument({
                  maxNumDocuments: 10,
                });
                if (!scannedImages || scannedImages.length === 0) return;

                const count = scannedImages.length;

                // Build single multi-page PDF — each page sized to its image (no whitespace)
                // US Letter: 612×792pt — image fills as large as possible, centered
                const b64Pages = await Promise.all(
                  scannedImages.map((uri) =>
                    FileSystem.readAsStringAsync(uri, {
                      encoding: "base64" as any,
                    }),
                  ),
                );
                const pageDivs = b64Pages
                  .map(
                    (b64, i) =>
                      `<div style="width:612pt;height:792pt;display:flex;align-items:center;justify-content:center;page-break-after:always;background:white;">` +
                      `<img src="data:image/jpeg;base64,${b64}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;"/>` +
                      `</div>`,
                  )
                  .join("");
                const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;}</style></head><body>${pageDivs}</body></html>`;
                const { uri: pdfUri } = await Print.printToFileAsync({
                  html,
                  base64: false,
                  width: 612,
                  height: 792,
                });

                // Save PDF to camera roll in background (bonus — non-blocking)
                MediaLibrary.requestPermissionsAsync().then(({ status }) => {
                  if (status === "granted")
                    MediaLibrary.saveToLibraryAsync(pdfUri).catch(() => {});
                });

                // Upload to Supabase
                const fileName = `scan_${Date.now()}.pdf`;
                let storagePath: string | undefined;
                if (uploadLocalFile) {
                  storagePath = await uploadLocalFile(
                    pdfUri,
                    section.id,
                    fileName,
                    "application/pdf",
                  );
                }

                if (!storagePath) {
                  Alert.alert(
                    "Upload failed",
                    "Could not upload the scanned document. Please try again.",
                  );
                  return;
                }

                const addWithTitle = (title: string) => {
                  const newLink = {
                    id: `scan_${Date.now()}`,
                    title: title.trim() || "Scanned Document",
                    url: storagePath!,
                    icon: "document",
                    image: "",
                    contentType: "file",
                  };
                  updateSectionData(section.id, { links: [...links, newLink] });
                };

                if (Platform.OS === "ios") {
                  Alert.prompt(
                    "Name Your Document",
                    `${count} page${count > 1 ? "s" : ""} scanned. Give this document a title:`,
                    (title) => addWithTitle(title || "Scanned Document"),
                    "plain-text",
                    "Scanned Document",
                  );
                } else {
                  addWithTitle("Scanned Document");
                }
              } catch (error: any) {
                if (error?.message?.toLowerCase().includes("cancel")) return;
                console.error("Document scan error:", error);
                Alert.alert(
                  "Scan failed",
                  "Could not scan document. Please try again.",
                );
              }
            }}
          >
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={linkStyles.addLinkButtonText}>Scan Document</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === "all" && <View style={styles.divider} />}

      {/* CONTACT SECTION — only shown when mode is 'contact' or 'all' */}
      {showContact && mode === "all" && (
        <View style={linkStyles.sectionDivider}>
          <Ionicons name="person-outline" size={20} color="#007AFF" />
          <Text style={linkStyles.sectionDividerText}>CONTACT SECTION</Text>
        </View>
      )}

      {showContact && (
        <>
          <Text style={styles.fieldLabel}>Contact Name</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactName || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactName: text })
            }
            placeholder="Enter contact person name"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Role/Title</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactRole || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactRole: text })
            }
            placeholder="e.g., Sales Director, Manager"
            placeholderTextColor="#999"
          />

          <Text style={styles.fieldLabel}>Main Office (Optional)</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactPhone || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactPhone: text })
            }
            placeholder="Main office phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Personal (Optional)</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactPhone2 || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactPhone2: text })
            }
            placeholder="Personal phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactEmail || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactEmail: text })
            }
            placeholder="Email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
          />

          <Text style={styles.fieldLabel}>Fax (Optional)</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactFax || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactFax: text })
            }
            placeholder="Fax number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>Website (Optional)</Text>
          <TextInput
            style={styles.input}
            value={section.data.contactWebsite || ""}
            onChangeText={(text) =>
              updateSectionData(section.id, { contactWebsite: text })
            }
            placeholder="e.g., abbingtonseniorliving.com"
            placeholderTextColor="#999"
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Contact Image (Optional)</Text>

          {section.data.contactImageUrl && (
            <Image
              source={{
                uri: generatePublicUrl(section.data.contactImageUrl) || "",
              }}
              style={styles.previewImage}
            />
          )}

          <TouchableOpacity
            style={styles.imageButton}
            onPress={async () => {
              // Use Expo ImagePicker with square cropping for contact profile pictures
              const result = await pickImage(
                section.id,
                "contactImageUrl",
                section.data.contactImageUrl,
                {
                  allowCropping: true,
                },
              );
              if (result) {
                updateSectionData(section.id, { contactImageUrl: result.path });
              }
            }}
          >
            <Ionicons name="image-outline" size={20} color="#007AFF" />
            <Text style={styles.imageButtonText}>
              {section.data.contactImageUrl ? "Change Image" : "Upload Image"}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.divider} />

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />

      {showPages && (
        <IconPicker
          visible={iconPickerVisible}
          selectedIcon={
            selectedLinkIdForIcon
              ? links.find((l: any) => l.id === selectedLinkIdForIcon)?.icon
              : undefined
          }
          onSelectIcon={(iconValue) => {
            if (selectedLinkIdForIcon) {
              updateLink(selectedLinkIdForIcon, "icon", iconValue);
            }
          }}
          onClose={() => {
            setIconPickerVisible(false);
            setSelectedLinkIdForIcon(null);
          }}
          title="Select Page Icon"
        />
      )}

      {/* Video preview modal for media stack items */}
      <VideoModal
        visible={!!stackVideoPreviewUrl}
        videoUrl={stackVideoPreviewUrl}
        onClose={() => setStackVideoPreviewUrl(null)}
      />

      {/* Media Source Selector Modal — only needed for pages section */}
      {showPages && (
        <Modal
          visible={mediaSourceModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setMediaSourceModalVisible(false);
            setSelectedLinkIdForMedia(null);
            setPendingMediaSource(null);
          }}
          onDismiss={handleModalDismiss}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Media Source</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMediaSourceModalVisible(false);
                    setSelectedLinkIdForMedia(null);
                    setPendingMediaSource(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={linkStyles.modalItem}
                onPress={() => handleMediaSourceSelection("drive")}
              >
                <Ionicons name="cloud-outline" size={24} color="#007AFF" />
                <Text style={linkStyles.modalItemText}>Drive</Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={linkStyles.modalItem}
                onPress={() => handleMediaSourceSelection("photos")}
              >
                <Ionicons name="images-outline" size={24} color="#007AFF" />
                <Text style={linkStyles.modalItemText}>Photos and Videos</Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={linkStyles.modalItem}
                onPress={() => handleMediaSourceSelection("files")}
              >
                <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                <Text style={linkStyles.modalItemText}>Files</Text>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    padding: 16,
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
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
  imageButtonContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 2,
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
    color: "#333",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  smallTextArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 16,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    marginTop: -4,
  },
  galleryScroll: {
    marginBottom: 12,
  },
  galleryImageContainer: {
    marginRight: 12,
    position: "relative",
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  addImageButton: {
    width: 120,
    height: 150,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: {
    color: "#007AFF",
    fontSize: 12,
    marginTop: 4,
  },
  featureItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  linkItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  addItemButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  testimonialItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  testimonialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  testimonialLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  ratingLabel: {
    fontSize: 14,
    marginRight: 8,
    color: "#666",
  },
  faqItem: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  faqLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  documentDetails: {
    flex: 1,
  },
  documentNameInput: {
    fontSize: 14,
    fontWeight: "500",
  },
  documentSize: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
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

  // Personal Contact Editor Styles
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  linkContainer: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  linkNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  removeButton: {
    padding: 4,
  },
  iconSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  iconOption: {
    flexDirection: "column",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    minWidth: 70,
  },
  selectedIconOption: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
  },
  iconLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  selectedIconLabel: {
    color: "#fff",
  },
  iconSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  listItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
  },
});

// Add these styles to your existing styles object
const additionalStyles = StyleSheet.create({
  avatarSection: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  mediaSection: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cce7ff",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginTop: 8,
  },
});

// Page card styles used in the redesigned link item editor
const pcStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F8FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  cardHeaderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  titleInput: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  iconRowText: {
    fontSize: 13,
    color: "#007AFF",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 14,
  },
  typeTile: {
    width: "46%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  typeTileActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  typeTileLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#444",
    textAlign: "center",
  },
  typeTileLabelActive: {
    color: "#fff",
  },
  urlInput: {
    fontSize: 14,
    color: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  uploadBtnText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  previewImg: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fileChipText: {
    flex: 1,
    fontSize: 13,
    color: "#007AFF",
  },
  stackEmpty: {
    fontSize: 13,
    color: "#999",
    paddingHorizontal: 14,
    paddingBottom: 10,
    lineHeight: 18,
  },
  stackItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  stackThumb: {
    width: 52,
    height: 38,
    borderRadius: 6,
    resizeMode: "cover",
  },
  stackThumbPlaceholder: {
    width: 52,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#EEF5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stackThumbPlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  stackItemLabel: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  stackAddRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  stackAddBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#007AFF",
  },
  stackAddBtnText: {
    fontSize: 13,
    color: "#007AFF",
  },
  thumbSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  thumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  thumbPreview: {
    width: 60,
    height: 45,
    borderRadius: 6,
    resizeMode: "cover",
  },
  thumbBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FAFAFA",
    alignSelf: "flex-start",
  },
  thumbBtnText: {
    fontSize: 13,
    color: "#555",
  },
  removeText: {
    fontSize: 12,
    color: "#ff3b30",
    marginTop: 4,
  },
});

// Enhanced styles for the LinkListEditor
const linkStyles = StyleSheet.create({
  renderTypeContainer: {
    marginBottom: 16,
  },
  renderTypeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  renderTypeButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  selectedRenderType: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  renderTypeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  selectedRenderTypeText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  layoutDescription: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  layoutDescriptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  layoutDescriptionText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  linksSection: {
    marginBottom: 16,
  },
  linksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addLinkText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  linkItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  linkTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  urlPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e5f2ff",
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  urlPreviewText: {
    fontSize: 12,
    color: "#007AFF",
    flex: 1,
  },
  linkSeparator: {
    height: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: "#fff9e6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeaa7",
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d68910",
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: "#8b6914",
    marginBottom: 4,
    lineHeight: 18,
  },
  // Medical Provider specific styles
  imageUploadButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 120,
  },
  uploadingButton: {
    opacity: 0.6,
  },
  uploadedImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 20,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  arrayItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  arrayItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  arrayItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    flex: 1,
  },
  arrayItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleActive: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  toggleInactive: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#155724",
  },
  toggleTextInactive: {
    color: "#721c24",
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    marginTop: 8,
  },
  addButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontWeight: "500",
  },
  addLinkButtonStyled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addLinkButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  switchActive: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  switchInactive: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  switchText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchTextActive: {
    color: "#155724",
  },
  switchTextInactive: {
    color: "#721c24",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  galleryItem: {
    width: "48%",
    marginBottom: 12,
  },
  galleryImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  galleryRemoveButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  galleryCaptionInput: {
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 4,
    marginTop: 4,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#000",
  },
  // Improved Service Styles
  serviceItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 8,
  },
  serviceToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  serviceAvailable: {
    backgroundColor: "#d1f2d1",
    borderColor: "#4CAF50",
  },
  serviceUnavailable: {
    backgroundColor: "#ffd6d6",
    borderColor: "#f44336",
  },
  serviceToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  serviceAvailableText: {
    color: "#2e7d32",
  },
  serviceUnavailableText: {
    color: "#c62828",
  },
  serviceRemoveButton: {
    padding: 4,
  },
  addServiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addServiceButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Media Button Styles
  addMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  addMediaButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Insurance Styles
  insuranceItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  insuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  insuranceName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#212529",
    marginLeft: 12,
  },
  insuranceRemoveButton: {
    padding: 4,
  },
  addInsuranceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addInsuranceButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Insurance Modal Styles
  insuranceModalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  insuranceModalIcon: {
    width: 32,
    alignItems: "center",
  },
  insuranceModalText: {
    flex: 1,
    fontSize: 16,
    color: "#212529",
    marginLeft: 12,
  },
  iconSection: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  fileInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  sectionDividerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
  // Certification Styles
  certificationItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  certificationHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  certificationName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#212529",
    marginLeft: 12,
  },
  certificationRemoveButton: {
    padding: 4,
  },
  addCertificationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addCertificationButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Medical Provider Clean Styles
  medicalSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicalSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  medicalImageUpload: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  medicalUploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    resizeMode: "cover",
  },
  medicalUploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  medicalUploadText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  medicalListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  medicalListItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  medicalListItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#212529",
    flex: 1,
  },
  medicalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 12,
  },
  medicalStatusAvailable: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4CAF50",
  },
  medicalStatusUnavailable: {
    backgroundColor: "#ffeaea",
    borderColor: "#f44336",
  },
  medicalStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  medicalStatusTextAvailable: {
    color: "#2e7d32",
  },
  medicalStatusTextUnavailable: {
    color: "#c62828",
  },
  medicalRemoveButton: {
    padding: 8,
    marginLeft: 8,
  },
  medicalAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
  },
  medicalAddButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  medicalGalleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 12,
  },
  medicalGalleryItem: {
    width: "48%",
    marginBottom: 16,
  },
  medicalGalleryImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  medicalGalleryRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 4,
  },
  medicalGalleryCaptionInput: {
    marginTop: 8,
    fontSize: 14,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 4,
  },
  medicalToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  medicalToggleLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  medicalToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  medicalToggleActive: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4CAF50",
  },
  medicalToggleInactive: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  medicalToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  medicalToggleTextActive: {
    color: "#2e7d32",
  },
  medicalToggleTextInactive: {
    color: "#666",
  },
  medicalModalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  medicalModalText: {
    flex: 1,
    fontSize: 16,
    color: "#212529",
  },
});

// ─── Social Links Editor ─────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    color: "#1877F2",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: "logo-instagram",
    color: "#E4405F",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: "logo-twitter",
    color: "#1DA1F2",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: "logo-linkedin",
    color: "#0A66C2",
  },
  { key: "youtube", label: "YouTube", icon: "logo-youtube", color: "#FF0000" },
  { key: "tiktok", label: "TikTok", icon: "logo-tiktok", color: "#000" },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: "logo-pinterest",
    color: "#E60023",
  },
  {
    key: "snapchat",
    label: "Snapchat",
    icon: "logo-snapchat",
    color: "#FFFC00",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "logo-whatsapp",
    color: "#25D366",
  },
  { key: "website", label: "Website", icon: "globe-outline", color: "#007AFF" },
  { key: "other", label: "Other", icon: "link-outline", color: "#666" },
] as const;

export const SocialLinksEditor = ({
  section,
  updateSectionData,
  updateSectionStyles,
}: SectionEditorProps) => {
  const links: any[] = section.data.links || [];

  const addLink = () => {
    const newLink = {
      id: `social_${Date.now()}`,
      platform: "instagram",
      url: "",
      label: "",
    };
    updateSectionData(section.id, { links: [...links, newLink] });
  };

  const removeLink = (id: string) => {
    updateSectionData(section.id, {
      links: links.filter((l: any) => l.id !== id),
    });
  };

  const updateLink = (id: string, field: string, value: string) => {
    updateSectionData(section.id, {
      links: links.map((l: any) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    });
  };

  const getPlatformInfo = (key: string) =>
    SOCIAL_PLATFORMS.find((p) => p.key === key) ||
    SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Section Title</Text>
      <TextInput
        style={styles.input}
        value={section.data.title || ""}
        onChangeText={(text) => updateSectionData(section.id, { title: text })}
        placeholder="Follow Us"
        placeholderTextColor="#999"
      />

      {links.map((link: any, index: number) => {
        const platform = getPlatformInfo(link.platform);
        return (
          <View key={link.id} style={styles.listItem}>
            <View style={styles.listItemHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name={platform.icon as any}
                  size={20}
                  color={platform.color}
                />
                <Text style={styles.listItemTitle}>{platform.label}</Text>
              </View>
              <TouchableOpacity onPress={() => removeLink(link.id)}>
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Platform</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SOCIAL_PLATFORMS.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                      },
                      link.platform === p.key
                        ? { backgroundColor: p.color, borderColor: p.color }
                        : { backgroundColor: "#f5f5f5", borderColor: "#ddd" },
                    ]}
                    onPress={() => updateLink(link.id, "platform", p.key)}
                  >
                    <Text
                      style={[
                        { fontSize: 13, fontWeight: "500" },
                        link.platform === p.key
                          ? { color: "#fff" }
                          : { color: "#333" },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Profile URL</Text>
            <TextInput
              style={styles.input}
              value={link.url || ""}
              onChangeText={(text) => updateLink(link.id, "url", text)}
              placeholder="https://..."
              placeholderTextColor="#999"
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Display Label (Optional)</Text>
            <TextInput
              style={styles.input}
              value={link.label || ""}
              onChangeText={(text) => updateLink(link.id, "label", text)}
              placeholder="e.g., @ourpage"
              placeholderTextColor="#999"
            />
          </View>
        );
      })}

      {links.length === 0 && (
        <Text style={styles.emptyText}>No social links added yet</Text>
      )}

      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#007AFF",
          borderStyle: "dashed",
          marginTop: 8,
        }}
        onPress={addLink}
      >
        <Ionicons name="add-circle" size={20} color="#007AFF" />
        <Text style={{ color: "#007AFF", fontWeight: "500" }}>
          Add Social Link
        </Text>
      </TouchableOpacity>

      <SectionStylesEditor
        styles={section.styles}
        onChange={(newStyles) => updateSectionStyles(section.id, newStyles)}
      />
    </View>
  );
};
