// components/digitalBrochure/gallery/mediaGallery.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
} from "react-native";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  thumbnail?: string;
}

interface MediaGalleryProps {
  mediaItems: MediaItem[];
  onMediaPress?: (item: MediaItem, index: number) => void;
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

const MediaGallery: React.FC<MediaGalleryProps> = ({
  mediaItems,
  onMediaPress,
}) => {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Force refresh when media items change
  useEffect(() => {
    setRefreshKey(Date.now());
  }, [mediaItems]);

  const handlePress = () => {
    router.push("/galleryPage");
  };

  const handleMediaPress = (item: MediaItem, index: number) => {
    setSelectedMedia(item);
    setCurrentIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedMedia(null);
  };

  const navigateMedia = (direction: 'prev' | 'next') => {
    let newIndex = currentIndex;
    if (direction === 'next' && currentIndex < mediaItems.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }
    setCurrentIndex(newIndex);
    setSelectedMedia(mediaItems[newIndex]);
  };

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Photos & Videos</Text>
      </View>

      {/* Image Count Button */}
      <View style={styles.seeAllContainer}>
        <TouchableOpacity onPress={handlePress} style={styles.imageCountButton}>
          <Ionicons name="image-outline" size={18} color="#000" />
          <Text style={styles.imageCountText}>{mediaItems.length}</Text>
        </TouchableOpacity>
      </View>

      {/* Media Thumbnails - Only show first 3 */}
      <View style={styles.mediaContainer}>
        {mediaItems.slice(0, 3).map((item, index) => {
          const fullUrl = getImageUrl(item.thumbnail || item.url);

          return (
            <TouchableOpacity
              key={`${item.id}-${refreshKey}`}
              style={styles.mediaThumbnail}
              onPress={() => handleMediaPress(item, index)}
            >
              {fullUrl ? (
                <Image
                  source={{ uri: fullUrl, cache: 'reload' }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumbnailImage, styles.placeholderImage]}>
                  <Ionicons name="image-outline" size={32} color="#ccc" />
                </View>
              )}
              {item.type === "video" && (
                <View style={styles.playIconCenter}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            activeOpacity={1}
            onPress={closeModal}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalCounter}>
                {currentIndex + 1} / {mediaItems.length}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <View style={styles.modalContent}>
            {selectedMedia && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <Image
                  source={{ uri: getImageUrl(selectedMedia.url) }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={() => navigateMedia('prev')}
              >
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {currentIndex < mediaItems.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => navigateMedia('next')}
              >
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MediaGallery;

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  seeAllContainer: {
    alignSelf: "flex-end",
    marginBottom: 12,
    marginRight: 0,
  },
  mediaContainer: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 0,
    marginTop: 0,
  },
  imageCountButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  imageCountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  modalCloseArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  modalCounter: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 100,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateY: -25 }],
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
});
