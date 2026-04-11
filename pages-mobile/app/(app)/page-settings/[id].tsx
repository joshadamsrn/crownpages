import AppHeader from '@/components/common/AppHeader';
import Loader from '@/components/common/Loader';
import { Page } from '@/types/page-builder.types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { uploadToSupabase, UploadError } from '../../../utils/resilient-upload';
import { router, useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateSignedUrl, supabase } from '../../../utils/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
    marginTop: 8,
  },
  imageUploadText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  faviconPreview: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  faviconImage: {
    width: 24,
    height: 24,
    borderRadius: 2,
  },
  ogImagePreview: {
    width: 120,
    height: 63,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    position: 'relative',
  },
  ogImage: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  removeImageButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsSection: {
    backgroundColor: '#fff9e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d68910',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#8b6914',
    marginBottom: 6,
    lineHeight: 18,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  uploadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    zIndex: 10,
  },

  // Slug Editor Styles
  slugContainer: {
    marginBottom: 16,
  },
  slugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoButton: {
    padding: 4,
  },
  previewContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  urlPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  urlPrefix: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  urlSlug: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  slugInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    backgroundColor: '#FFF',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  generateText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rulesContainer: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D68910',
    marginBottom: 6,
  },
  ruleItem: {
    fontSize: 13,
    color: '#8B6914',
    marginBottom: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  exampleSection: {
    marginBottom: 20,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exampleGood: {
    color: '#10B981',
    fontWeight: '600',
    width: 60,
  },
  exampleBad: {
    color: '#EF4444',
    fontWeight: '600',
    width: 60,
  },
  exampleUrl: {
    fontFamily: 'monospace',
    fontSize: 14,
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});


export default function PageSettings() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Basic settings
  const [pageTitle, setPageTitle] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Slug settings
  const [pageSlug, setPageSlug] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');
  const [originalPageSlug, setOriginalPageSlug] = useState('');

  // Images
  const [favicon, setFavicon] = useState<string | null>(null);
  const [ogImage, setOgImage] = useState<string | null>(null);

  // Social Media
  const [ogTitle, setOgTitle] = useState('');
  const [ogDescription, setOgDescription] = useState('');

  // Advanced
  const [keywords, setKeywords] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [isFaviconLoading, setIsFaviconLoading] = useState(false);
  const [isOgImageLoading, setOgImageLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Slug validation states
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailability, setSlugAvailability] = useState<{
    available: boolean | null;
    message: string;
  }>({ available: null, message: '' });
  const [showSlugInfoModal, setShowSlugInfoModal] = useState(false);
  const [hasSlugChanges, setHasSlugChanges] = useState(false);

  // Image URLs
  const [faviconSignedUrl, setFaviconSignedUrl] = useState<string | null>(null);
  const [ogImageSignedUrl, setOgImageSignedUrl] = useState<string | null>(null);

  // Upload tracking
  const [imagesData, setImagesData] = useState({
    uploadImages: [''],
    removeImages: [''],
  });

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(
    debounce(async (slugToCheck: string) => {
      if (!slugToCheck || slugToCheck === originalPageSlug || !page) {
        setSlugAvailability({ available: null, message: '' });
        setIsCheckingSlug(false);
        return;
      }

      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('id')
          .eq('slug', slugToCheck)
          .eq('business_id', page.business_id)
          .neq('id', page.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSlugAvailability({
            available: false,
            message: 'This page URL is already used in your business',
          });
        } else {
          setSlugAvailability({
            available: true,
            message: 'Perfect! This page URL is available',
          });
        }
      } catch (error) {
        console.error('Error checking slug availability:', error);
        setSlugAvailability({
          available: false,
          message: 'Error checking availability',
        });
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500),
    [page, originalPageSlug]
  );

  // Format slug (lowercase, replace spaces with hyphens, remove special chars)
  const formatSlug = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleSlugChange = (text: string) => {
    const formattedSlug = formatSlug(text);
    setPageSlug(formattedSlug);
    setHasSlugChanges(formattedSlug !== originalPageSlug);

    if (formattedSlug && formattedSlug !== originalPageSlug) {
      checkSlugAvailability(formattedSlug);
    } else {
      setSlugAvailability({ available: null, message: '' });
    }
  };

  const generateSlugFromTitle = () => {
    const generated = formatSlug(pageTitle);
    setPageSlug(generated);
    setHasSlugChanges(generated !== originalPageSlug);
    if (generated !== originalPageSlug) {
      checkSlugAvailability(generated);
    }
  };

  const getSlugStatusColor = () => {
    if (slugAvailability.available === true) return '#10B981';
    if (slugAvailability.available === false) return '#EF4444';
    return '#6B7280';
  };

  const getSlugStatusIcon = () => {
    if (isCheckingSlug) return 'time-outline';
    if (slugAvailability.available === true) return 'checkmark-circle';
    if (slugAvailability.available === false) return 'close-circle';
    return 'information-circle-outline';
  };

  const removeUnsavedImages = async (
    type: 'added' | 'removed',
    setLoader?: boolean
  ) => {
    if (imagesData.removeImages.length || imagesData.uploadImages.length) {
      if (setLoader) setIsSaving(true);
      const unSavedImages =
        type === 'added' ? imagesData.uploadImages : imagesData.removeImages;

      await supabase.storage
        .from('uploads')
        .remove(unSavedImages)
        .then(() => {
          router.push(`/(app)/page-options/${id}`);
        })
        .finally(() => {
          if (setLoader) setIsSaving(false);
        });
    } else {
      router.push(`/(app)/page-options/${id}`);
    }
  };

  async function uploadImageToSupabase(
    uri: string,
    page: Page,
    type: 'favicon' | 'og',
    existingPath: string
  ) {
    try {
      const fileExt = uri.split('.').pop()?.split('?')[0] || 'png';
      const filePath = `${page.created_by}/${page.business_id}/${page.id
        }/${type}_${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

      updateUploadData(existingPath, 'remove');

      // Use the resilient upload utility
      const result = await uploadToSupabase({
        uri,
        filePath,
        contentType,
        bucket: 'uploads',
        upsert: true,
        maxRetries: 3,
        onProgress: (progress) => {
          console.log(`📊 ${type} upload progress: ${progress}%`);
        },
      });

      updateUploadData(result.path, 'add');
      return result.path;
    } catch (error: any) {
      console.log('Upload error', error);
      
      // Provide user-friendly error messages
      if (error instanceof UploadError) {
        if (error.code === 'FILE_TOO_LARGE') {
          throw new Error('Image exceeds 2GB limit. Please select a smaller image.');
        } else if (error.code === 'FILE_NOT_FOUND') {
          throw new Error('Image not found. Please try selecting again.');
        }
      }
      
      throw new Error(error.message || 'Upload failed');
    }
  }

  const updateUploadData = (url: string, type: 'add' | 'remove') => {
    if (type === 'add') {
      const updateRemoveImages = imagesData.removeImages.filter((img) => {
        return img !== url;
      });

      setImagesData((prev) => ({
        ...prev,
        uploadImages: [...prev.uploadImages, url],
        removeImages: updateRemoveImages,
      }));
    } else if (type === 'remove') {
      const updateUploadImages = imagesData.uploadImages.filter((img) => {
        return img !== url;
      });
      setImagesData((prev) => ({
        ...prev,
        removeImages: [...prev.removeImages, url],
        uploadImages: updateUploadImages,
      }));
    }
  };

  // Load signed URLs for images
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (favicon) {
        const url = await generateSignedUrl(favicon);
        setFaviconSignedUrl(url || null);
      } else {
        setFaviconSignedUrl(null);
      }

      if (ogImage) {
        const url = await generateSignedUrl(ogImage);
        setOgImageSignedUrl(url || null);
      } else {
        setOgImageSignedUrl(null);
      }
    };
    fetchSignedUrls();
  }, [favicon, ogImage]);

  const pickAndUploadImage = async (type: 'favicon' | 'og') => {
    const setter = type === 'favicon' ? setFavicon : setOgImage;
    const setUploading =
      type === 'favicon' ? setUploadingFavicon : setUploadingOg;
    const existingPath =
      type === 'favicon' ? page?.favicon_image_url : page?.og_image_url;

    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'favicon' ? [1, 1] : [1200, 630],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (!id || typeof id !== 'string') throw new Error('Invalid page id');
        if (!page) return;

        const path = await uploadImageToSupabase(
          uri,
          page,
          type,
          existingPath || ''
        );

        if (path) {
          setter(path || '');

          // Auto-save the page after OG image upload using the same save logic
          if (type === 'og') {
            try {
              // Use the same save logic as the handleSave function
              const updates = {
                title: pageTitle,
                slug: pageSlug,
                meta_title: metaTitle,
                meta_description: metaDescription,
                og_image_url: path, // Use the newly uploaded path
                favicon_image_url: favicon,
                og_title: ogTitle,
                og_description: ogDescription,
                keywords: keywords,
                canonical_url: canonicalUrl,
                updated_at: new Date().toISOString(),
              };

              const { error } = await supabase
                .from('pages')
                .update(updates)
                .eq('id', page.id);

              if (error) throw error;

              // Clean up unsaved images like the main save function does
              await removeUnsavedImages('removed');

              Alert.alert(
                'Success',
                'Open Graph image uploaded and saved successfully!'
              );
            } catch (saveError: any) {
              console.error('Error auto-saving OG image:', saveError);
              Alert.alert(
                'Upload Complete',
                'Image uploaded successfully, but failed to save automatically. Please click Save to complete.'
              );
            }
          } else {
            Alert.alert(
              'Success',
              'Favicon uploaded successfully!'
            );
          }
        } else {
          throw new Error('Failed to get image path');
        }
      }
    } catch (err: any) {
      console.log(err);
      Alert.alert('Upload Error', err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select(
          `
          *,
          business:businesses(*)
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Page not found');

      setPage(data);
      setPageTitle(data.title || '');
      setPageSlug(data.slug || '');
      setOriginalPageSlug(data.slug || '');
      setBusinessSlug(data.business?.slug || '');
      setMetaTitle(data.meta_title || '');
      setMetaDescription(data.meta_description || '');
      setOgImage(data.og_image_url || null);
      setFavicon(data.favicon_image_url || null);
      setOgTitle(data.og_title || '');
      setOgDescription(data.og_description || '');
      setKeywords(data.keywords || '');
      setCanonicalUrl(data.canonical_url || '');
    } catch (error) {
      console.error('Error fetching page:', error);
      Alert.alert('Error', 'Failed to load page');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset meta title and description to match the page title. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            setMetaTitle(pageTitle);
            setMetaDescription(
              `${pageTitle} - Learn more about our services and offerings.`
            );
            setOgTitle(pageTitle);
            setOgDescription(
              `${pageTitle} - Learn more about our services and offerings.`
            );
          },
        },
      ]
    );
  };

  const removeImage = (type: 'favicon' | 'og') => {
    Alert.alert(
      `Remove ${type === 'favicon' ? 'Favicon' : 'Open Graph Image'}`,
      `Are you sure you want to remove the ${type === 'favicon' ? 'favicon' : 'Open Graph image'
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (type === 'favicon') {
              setFavicon(null);
              setFaviconSignedUrl(null);
            } else {
              setOgImage(null);
              setOgImageSignedUrl(null);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!page) return;

    // Check if slug changes are valid
    if (hasSlugChanges && !slugAvailability.available) {
      Alert.alert('Invalid URL', 'Please fix the page URL before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        title: pageTitle,
        slug: pageSlug,
        meta_title: metaTitle,
        meta_description: metaDescription,
        og_image_url: ogImage,
        favicon_image_url: favicon,
        og_title: ogTitle,
        og_description: ogDescription,
        keywords: keywords,
        canonical_url: canonicalUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', page.id);

      if (error) throw error;

      await removeUnsavedImages('removed');
      Alert.alert('Success', 'Page settings have been saved.');
      router.push(`/(app)/page-options/${id}`);
    } catch (error: any) {
      console.error('Error saving page settings:', error);
      Alert.alert('Error', error.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Page Settings" onBackPress={() => removeUnsavedImages('added', true)} />
      <View style={styles.contentWrapper}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Page URL Section */}
          <View style={styles.section}>
            <View style={styles.slugHeader}>
              <Text style={styles.sectionTitle}>🔗 Page URL</Text>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setShowSlugInfoModal(true)}
              >
                <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* URL Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>
                Your page will be available at:
              </Text>
              <View style={styles.urlPreview}>
                <Text style={styles.urlPrefix}>crownpages.com/</Text>
                <Text style={[styles.urlSlug, { color: '#666' }]}>
                  {businessSlug}/
                </Text>
                <Text
                  style={[
                    styles.urlSlug,
                    { color: hasSlugChanges ? '#007AFF' : '#000' },
                  ]}
                >
                  {pageSlug || 'page-name'}
                </Text>
              </View>
            </View>

            {/* Slug Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.slugInput,
                  {
                    borderColor:
                      slugAvailability.available === false
                        ? '#EF4444'
                        : slugAvailability.available === true
                          ? '#10B981'
                          : '#DDD',
                  },
                ]}
                value={pageSlug}
                onChangeText={handleSlugChange}
                placeholder="page-name"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateSlugFromTitle}
              >
                <Ionicons name="refresh" size={20} color="#007AFF" />
                <Text style={styles.generateText}>Generate</Text>
              </TouchableOpacity>
            </View>

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
                    style={[styles.statusText, { color: getSlugStatusColor() }]}
                  >
                    {isCheckingSlug
                      ? 'Checking availability...'
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
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 Basic Information</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Page Title</Text>
              <TextInput
                style={styles.input}
                value={pageTitle}
                onChangeText={setPageTitle}
                placeholder="Enter page title"
                placeholderTextColor="#999"
              />
              <Text style={styles.fieldDescription}>
                The main title of your page
              </Text>
            </View>

            {/* Hidden for now - Meta Title */}
            {false && (
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Meta Title</Text>
                  <TouchableOpacity
                    onPress={resetToDefaults}
                    style={styles.resetButton}
                  >
                    <Ionicons name="refresh" size={16} color="#007AFF" />
                    <Text style={styles.resetButtonText}>Auto-fill</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={metaTitle}
                  onChangeText={setMetaTitle}
                  placeholder="Enter meta title (SEO)"
                  placeholderTextColor="#999"
                  maxLength={60}
                />
                <Text style={styles.fieldDescription}>
                  Title shown in search results ({metaTitle.length}/60 characters)
                </Text>
              </View>
            )}

            {/* Hidden for now - Meta Description */}
            {false && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Meta Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={metaDescription}
                  onChangeText={setMetaDescription}
                  placeholder="Enter meta description for search engines"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  maxLength={155}
                />
                <Text style={styles.fieldDescription}>
                  Description shown in search results ({metaDescription.length}/155
                  characters)
                </Text>
              </View>
            )}
          </View>

          {/* Images */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🖼️ Images</Text>

            {/* Favicon */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Favicon</Text>
              <Text style={styles.fieldDescription}>
                Small icon shown in browser tabs (recommended: 32x32px, ICO or
                PNG)
              </Text>

              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => pickAndUploadImage('favicon')}
                disabled={uploadingFavicon}
              >
                <Ionicons name="image-outline" size={24} color="#007AFF" />
                <Text style={styles.imageUploadText}>
                  {faviconSignedUrl ? 'Change Favicon' : 'Upload Favicon'}
                </Text>
                {uploadingFavicon && (
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>

              {faviconSignedUrl && (
                <View style={styles.imagePreviewContainer}>
                  <View style={styles.faviconPreview}>
                    <Image
                      source={{ uri: faviconSignedUrl }}
                      style={styles.faviconImage}
                      onLoadStart={() => setIsFaviconLoading(true)}
                      onLoadEnd={() => setIsFaviconLoading(false)}
                    />
                    {isFaviconLoading && (
                      <ActivityIndicator
                        size="small"
                        color="#007AFF"
                        style={styles.uploadingIndicator}
                      />
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeImage('favicon')}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Open Graph Image */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Open Graph Image</Text>
              <Text style={styles.fieldDescription}>
                Image shown when sharing on social media (recommended: 1200x630px)
              </Text>

              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => pickAndUploadImage('og')}
                disabled={uploadingOg}
              >
                <Ionicons name="image-outline" size={24} color="#007AFF" />
                <Text style={styles.imageUploadText}>
                  {ogImageSignedUrl ? 'Change OG Image' : 'Upload OG Image'}
                </Text>
                {uploadingOg && (
                  <ActivityIndicator
                    size="small"
                    color="#007AFF"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>

              {ogImageSignedUrl && (
                <View style={styles.imagePreviewContainer}>
                  <View style={styles.ogImagePreview}>
                    <Image
                      source={{ uri: ogImageSignedUrl }}
                      style={styles.ogImage}
                      onLoadStart={() => setOgImageLoading(true)}
                      onLoadEnd={() => setOgImageLoading(false)}
                    />
                    {isOgImageLoading && (
                      <ActivityIndicator
                        size="small"
                        color="#007AFF"
                        style={styles.uploadingIndicator}
                      />
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeImage('og')}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Hidden for now - Social Media */}
          {false && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📱 Social Media</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Social Media Title</Text>
                <TextInput
                  style={styles.input}
                  value={ogTitle}
                  onChangeText={setOgTitle}
                  placeholder="Title for social media shares"
                  placeholderTextColor="#999"
                  maxLength={60}
                />
                <Text style={styles.fieldDescription}>
                  Title shown when shared on social platforms
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Social Media Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={ogDescription}
                  onChangeText={setOgDescription}
                  placeholder="Description for social media shares"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={2}
                  maxLength={155}
                />
                <Text style={styles.fieldDescription}>
                  Description shown when shared on social platforms
                </Text>
              </View>
            </View>
          )}

          {/* Hidden for now - Advanced Settings */}
          {false && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚙️ Advanced</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Keywords</Text>
                <TextInput
                  style={styles.input}
                  value={keywords}
                  onChangeText={setKeywords}
                  placeholder="keyword1, keyword2, keyword3"
                  placeholderTextColor="#999"
                />
                <Text style={styles.fieldDescription}>
                  Comma-separated keywords for SEO (optional)
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Canonical URL</Text>
                <TextInput
                  style={styles.input}
                  value={canonicalUrl}
                  onChangeText={setCanonicalUrl}
                  placeholder="https://example.com/page"
                  placeholderTextColor="#999"
                  keyboardType="url"
                  autoCapitalize="none"
                />
                <Text style={styles.fieldDescription}>
                  Preferred URL for search engines (optional)
                </Text>
              </View>
            </View>
          )}

          {/* Hidden for now - SEO Tips */}
          {false && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 SEO Tips</Text>
              <Text style={styles.tipText}>
                • Keep meta titles under 60 characters
              </Text>
              <Text style={styles.tipText}>
                • Meta descriptions should be 120-155 characters
              </Text>
              <Text style={styles.tipText}>
                • Use descriptive, keyword-rich titles
              </Text>
              <Text style={styles.tipText}>
                • Favicon should be 32x32px for best quality
              </Text>
              <Text style={styles.tipText}>
                • OG images work best at 1200x630px
              </Text>
              <Text style={styles.tipText}>
                • Page URLs should be descriptive and easy to remember
              </Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (isSaving ||
                isLoading ||
                (hasSlugChanges && !slugAvailability.available)) &&
              styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={
              isSaving ||
              isLoading ||
              (hasSlugChanges && !slugAvailability.available)
            }
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

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
                  • <Text style={styles.bold}>Professional Appearance:</Text>{' '}
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

    </SafeAreaView>
  );
}
