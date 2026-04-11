import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";

interface VideoModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

const VideoModalPlayer: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
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

const VideoModal: React.FC<VideoModalProps> = ({ visible, videoUrl, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.85)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ position: "absolute", top: 40, right: 20, zIndex: 2 }}
          onPress={onClose}
        >
          <Ionicons name="close-circle" size={36} color="#fff" />
        </TouchableOpacity>
        {videoUrl && <VideoModalPlayer videoUrl={videoUrl} />}
      </View>
    </Modal>
  );
};

export default VideoModal; 