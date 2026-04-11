import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IndividualMedia } from "../../components/digitalBrochure/gallery/individualMedia";
import { useViewPage } from "../../contexts/ViewPageContext";

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
  alt?: string;
  title?: string;
}

interface GalleryPageProps {
  photos?: MediaItem[];
  videos?: MediaItem[];
  companyName?: string;
}

// Helper to get full Supabase URL
const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

const GalleryPage: React.FC<GalleryPageProps> = ({
  photos,
  videos,
  companyName: propCompanyName,
}) => {
  const navigation = useNavigation();
  const { companyName: contextCompanyName, mediaItems: contextMediaItems } = useViewPage();
  const [selectedTab, setSelectedTab] = useState("photos");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Use context data if available, otherwise fall back to props
  const companyName = contextCompanyName || propCompanyName || "Gallery";

  // Convert context media items to gallery format
  const contextPhotos = contextMediaItems
    .filter(item => item.type === 'image')
    .map(item => ({
      id: item.id,
      src: getImageUrl(item.url),
      thumbnail: item.thumbnail ? getImageUrl(item.thumbnail) : getImageUrl(item.url),
      alt: `Photo ${item.id}`,
    }));

  const contextVideos = contextMediaItems
    .filter(item => item.type === 'video')
    .map(item => ({
      id: item.id,
      src: getImageUrl(item.url),
      thumbnail: item.thumbnail ? getImageUrl(item.thumbnail) : getImageUrl(item.url),
      title: `Video ${item.id}`,
    }));

  // Use context data if available, otherwise use props or empty array
  const galleryData = {
    photos: contextPhotos.length > 0 ? contextPhotos : (photos || []),
    videos: contextVideos.length > 0 ? contextVideos : (videos || []),
  };

  // Get the count of photos and videos
  const photoCount = galleryData.photos.length;
  const videoCount = galleryData.videos.length;

  // Filter content based on selected tab
  const displayItems =
    selectedTab === "photos" ? galleryData.photos : galleryData.videos;

  // Handle item click to open modal
  const handleItemPress = (item: MediaItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  // Handle back button press on Android
  useEffect(() => {
    const backAction = () => {
      if (modalVisible) {
        closeModal();
        return true; // Prevents default back action
      }
      return false; // Allows default back action
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove(); // Clean up
  }, [modalVisible]);

  // Calculate numColumns based on screen width
  const screenWidth = Dimensions.get("window").width;
  const numColumns = 3; // For smaller screens you might want to adjust this
  const itemWidth = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns; // 16px padding on each side, 8px gap

  // Render item for FlatList
  const renderItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      onPress={() => handleItemPress(item)}
      style={[styles.itemContainer, { width: itemWidth, height: itemWidth }]}
    >
      <IndividualMedia item={item} type={selectedTab} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{companyName}</Text>

        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuButtonText}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setSelectedTab("photos")}
          style={[
            styles.tabButton,
            selectedTab === "photos" ? styles.activeTab : styles.inactiveTab,
          ]}
        >
          <Text
            style={
              selectedTab === "photos"
                ? styles.activeTabText
                : styles.inactiveTabText
            }
          >
            All photos ({photoCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedTab("videos")}
          style={[
            styles.tabButton,
            selectedTab === "videos" ? styles.activeTab : styles.inactiveTab,
          ]}
        >
          <Text
            style={
              selectedTab === "videos"
                ? styles.activeTabText
                : styles.inactiveTabText
            }
          >
            Videos ({videoCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {selectedTab === "photos" ? "All Photos" : "All Videos"}
        </Text>
      </View>

      {/* Gallery grid */}
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.galleryGrid}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
      />

      {/* Modal for fullscreen view */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        {selectedItem && (
          <View style={styles.modalContainer}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {selectedTab === "photos"
                  ? selectedItem.alt
                  : selectedItem.title}
              </Text>

              <View style={styles.spacer} />
            </View>

            {/* Modal content */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalContent}
              onPress={closeModal}
            >
              <IndividualMedia
                item={selectedItem}
                type={selectedTab}
                isFullScreen
              />
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: "white",
    fontSize: 24,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
    flex: 1,
  },
  menuButton: {},
  menuButtonText: {
    color: "white",
    fontSize: 24,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#0066cc",
  },
  inactiveTab: {
    backgroundColor: "#333",
  },
  activeTabText: {
    color: "white",
    fontSize: 14,
  },
  inactiveTabText: {
    color: "#aaa",
    fontSize: 14,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    color: "white",
    fontSize: 20,
  },
  galleryGrid: {
    padding: 16,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },
  itemContainer: {
    borderRadius: 8,
    overflow: "hidden",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "white",
    fontSize: 18,
  },
  modalTitle: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    flex: 1,
  },
  spacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});

export default GalleryPage;
