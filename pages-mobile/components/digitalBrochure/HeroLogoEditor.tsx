import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface HeroLogoEditorProps {
  heroImage: string;
  logo: string;
  onHeroChange: (url: string) => void;
  onLogoChange: (url: string) => void;
}

export function HeroLogoEditor({
  heroImage,
  logo,
  onHeroChange,
  onLogoChange,
}: HeroLogoEditorProps) {
  const pickImage = async (type: 'hero' | 'logo') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        // TODO: Upload to Supabase storage and get URL
        // For now, just use local URI
        if (type === 'hero') {
          onHeroChange(uri);
        } else {
          onLogoChange(uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="image" size={20} color="#007AFF" />
        <Text style={styles.sectionTitle}>Hero Image & Logo</Text>
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredText}>Required</Text>
        </View>
      </View>

      <Text style={styles.sectionDescription}>
        Upload a hero image and your company logo. These will appear at the top of your brochure.
      </Text>

      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Text style={styles.label}>
          Hero Image <Text style={styles.requiredStar}>*</Text>
        </Text>
        <Text style={styles.hint}>Recommended: 1200x675px (16:9 ratio)</Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage('hero')}
        >
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroPreview} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={40} color="#999" />
              <Text style={styles.uploadText}>Tap to upload hero image</Text>
            </View>
          )}
        </TouchableOpacity>

        {heroImage && (
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => pickImage('hero')}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.changeButtonText}>Change Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Logo */}
      <View style={styles.imageContainer}>
        <Text style={styles.label}>
          Company Logo <Text style={styles.requiredStar}>*</Text>
        </Text>
        <Text style={styles.hint}>Recommended: Square (1:1 ratio)</Text>

        <TouchableOpacity
          style={[styles.uploadButton, styles.logoUploadButton]}
          onPress={() => pickImage('logo')}
        >
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoPreview} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="business-outline" size={40} color="#999" />
              <Text style={styles.uploadText}>Tap to upload logo</Text>
            </View>
          )}
        </TouchableOpacity>

        {logo && (
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => pickImage('logo')}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.changeButtonText}>Change Logo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  requiredBadge: {
    backgroundColor: '#FEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C00',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#C00',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  logoUploadButton: {
    aspectRatio: 1,
    maxWidth: 200,
  },
  uploadPlaceholder: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  uploadText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  heroPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },
  logoPreview: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    backgroundColor: '#F5F5F5',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    gap: 4,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
