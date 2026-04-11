import React, { useRef } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { Video } from 'expo-av';

interface MediaItem {
  id: number;
  src: any;
  alt?: string;
  title?: string;
  thumbnail?: any;
}

interface IndividualMediaProps {
  item: MediaItem;
  type: string;
  isFullScreen?: boolean;
}

export const IndividualMedia: React.FC<IndividualMediaProps> = ({ 
  item, 
  type,
  isFullScreen = false
}) => {
  // Reference for video player
  const videoRef = useRef<Video>(null);
  
  if (type === "photos") {
    return isFullScreen ? (
      // Full screen image
      <Image
        source={typeof item.src === 'string' ? { uri: item.src } : item.src}
        style={styles.fullImage}
        resizeMode="contain"
      />
    ) : (
      // Thumbnail image
      <Image
        source={typeof item.src === 'string' ? { uri: item.src } : item.src}
        style={styles.thumbnailImage}
        resizeMode="cover"
      />
    );
  } else {
    // Video content
    return isFullScreen ? (
      // Full screen video
      <Video
        ref={videoRef}
        source={typeof item.src === 'string' ? { uri: item.src } : item.src}
        style={styles.video}
        useNativeControls
        resizeMode="contain"
        shouldPlay
        isLooping
      />
    ) : (
      // Video thumbnail with play button
      <View style={styles.videoThumbnailContainer}>
        <Image
          source={typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
        {/* Play button overlay */}
        <View style={styles.playButtonContainer}>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: 'white',
    fontSize: 18,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: 300,
  },
});