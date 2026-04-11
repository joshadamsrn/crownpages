// app/(app)/images-to-pdf/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 64) / 3; // 3 columns with padding

interface SelectedImage {
  uri: string;
  id: string;
}

export default function ImagesToPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('CrownPagesPDF');
  const [isSharingInProgress, setIsSharingInProgress] = useState(false);

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => ({
          uri: asset.uri,
          id: `img_${Date.now()}_${Math.random()}`,
        }));
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const removeImage = (imageId: string) => {
    setSelectedImages(selectedImages.filter((img) => img.id !== imageId));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === selectedImages.length - 1)
    ) {
      return;
    }

    const newImages = [...selectedImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[targetIndex]] = [
      newImages[targetIndex],
      newImages[index],
    ];
    setSelectedImages(newImages);
  };

  const generatePdf = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image');
      return;
    }

    setIsGenerating(true);

    try {
      // Convert images to base64
      const imagePromises = selectedImages.map(async (img) => {
        const base64 = await FileSystem.readAsStringAsync(img.uri, {
          encoding: 'base64' as any,
        });
        return `data:image/jpeg;base64,${base64}`;
      });

      const base64Images = await Promise.all(imagePromises);

      // Create HTML for PDF with images
      // Use standard US Letter size: 8.5" x 11" = 816px x 1056px at 96 DPI
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page {
                size: letter;
                margin: 0;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
              }
              .page {
                page-break-after: always;
                width: 816px;
                height: 1056px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
              }
              .page:last-child {
                page-break-after: auto;
              }
              .image-container {
                width: 816px;
                height: 1056px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                max-width: 816px;
                max-height: 1056px;
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            ${base64Images
              .map(
                (base64) => `
              <div class="page">
                <div class="image-container">
                  <img src="${base64}" />
                </div>
              </div>
            `
              )
              .join('')}
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      console.log('PDF generated at:', uri);

      // Store the generated PDF URI and show save options
      setGeneratedPdfUri(uri);
      setShowSaveOptions(true);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', error.message || 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    if (!generatedPdfUri || isSharingInProgress) return;

    setIsSharingInProgress(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        // Copy the file with the custom name for sharing
        const fileName = pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`;
        const newUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        // Delete old file if it exists to avoid conflicts
        try {
          const fileInfo = await FileSystem.getInfoAsync(newUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(newUri);
          }
        } catch (e) {
          // File doesn't exist, continue
        }
        
        // Copy the generated PDF to the new location with custom name
        await FileSystem.copyAsync({
          from: generatedPdfUri,
          to: newUri,
        });
        
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share PDF',
          UTI: 'com.adobe.pdf',
        });
        
        // Don't close modal or clear images - let user keep working
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      console.error('Error sharing PDF:', error);
      
      // Check if user cancelled
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        // User cancelled, just return
        return;
      }
      
      Alert.alert('Error', error.message || 'Failed to share PDF');
    } finally {
      setIsSharingInProgress(false);
    }
  };

  const handleSaveToFiles = async () => {
    if (!generatedPdfUri || isSharingInProgress) return;

    setIsSharingInProgress(true);
    try {
      // Use the custom filename, ensure it ends with .pdf
      const fileName = pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`;

      if (Platform.OS === 'android') {
        // On Android, use Storage Access Framework to let user pick save location
        // This opens the native file picker to choose where to save
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (!permissions.granted) {
          Alert.alert('Permission Denied', 'You need to grant permission to save files');
          setIsSharingInProgress(false);
          return;
        }

        // Read the PDF file
        const pdfContent = await FileSystem.readAsStringAsync(generatedPdfUri, {
          encoding: 'base64' as any,
        });

        // Create the file in the selected directory
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          'application/pdf'
        );

        // Write the PDF content
        await FileSystem.writeAsStringAsync(fileUri, pdfContent, {
          encoding: 'base64' as any,
        });

        Alert.alert('Success', 'PDF saved successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setShowSaveOptions(false);
            },
          },
        ]);
      } else {
        // On iOS, copy file with custom name first, then use share sheet
        const newUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        // Delete old file if it exists to avoid conflicts
        try {
          const fileInfo = await FileSystem.getInfoAsync(newUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(newUri);
          }
        } catch (e) {
          // File doesn't exist, continue
        }
        
        // Copy the generated PDF to the new location with custom name
        await FileSystem.copyAsync({
          from: generatedPdfUri,
          to: newUri,
        });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save to Files',
            UTI: 'com.adobe.pdf',
          });
          
          setShowSaveOptions(false);
        } else {
          Alert.alert('Error', 'File saving is not available on this device');
        }
      }
    } catch (error: any) {
      console.error('Error saving PDF:', error);
      
      // Check if user cancelled
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        // User cancelled, just close the modal
        setIsSharingInProgress(false);
        return;
      }
      
      Alert.alert('Error', error.message || 'Failed to save PDF');
    } finally {
      setIsSharingInProgress(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="images-outline" size={24} color="#fff" />
            <Text style={styles.headerTitle}>Images to PDF</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.contentWrapper}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
              <Text style={styles.infoTitle}>How it works</Text>
            </View>
            <Text style={styles.infoText}>
              Select multiple images from your device. They'll be converted into a single PDF
              document that can be scrolled through like pages. Perfect for creating viewable
              documents from multiple images.
            </Text>
          </View>

          {/* Selected Images */}
          {selectedImages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Selected Images ({selectedImages.length})
              </Text>
              <View style={styles.imagesGrid}>
                {selectedImages.map((img, index) => (
                  <View key={img.id} style={styles.imageContainer}>
                    <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                    <View style={styles.imageOverlay}>
                      <TouchableOpacity
                        style={styles.overlayButton}
                        onPress={() => removeImage(img.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.reorderButtons}>
                        {index > 0 && (
                          <TouchableOpacity
                            style={styles.overlayButton}
                            onPress={() => moveImage(index, 'up')}
                          >
                            <Ionicons name="arrow-up" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                        {index < selectedImages.length - 1 && (
                          <TouchableOpacity
                            style={styles.overlayButton}
                            onPress={() => moveImage(index, 'down')}
                          >
                            <Ionicons name="arrow-down" size={18} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.imageNumber}>{index + 1}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {selectedImages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No images selected</Text>
              <Text style={styles.emptyDescription}>
                Tap the button below to select images from your device
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={pickImages}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {selectedImages.length > 0 ? 'Add More Images' : 'Select Images'}
              </Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.generateButton]}
                  onPress={generatePdf}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Text style={styles.primaryButtonText}>Generating PDF...</Text>
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Generate PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setSelectedImages([])}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                  <Text style={styles.secondaryButtonText}>Clear All</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        {/* Save Options Modal */}
        <Modal
          visible={showSaveOptions}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSaveOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                 <Ionicons name="checkmark-circle" size={48} color="#28a745" />
                 <Text style={styles.modalTitle}>PDF Generated!</Text>
                 <Text style={styles.modalSubtitle}>
                   Your PDF is ready. Save it or share it with others.
                 </Text>
               </View>

               {/* File Name Input */}
               <View style={styles.fileNameSection}>
                 <Text style={styles.fileNameLabel}>File Name</Text>
                 <View style={styles.fileNameInputContainer}>
                   <TextInput
                     style={styles.fileNameInput}
                     value={pdfFileName}
                     onChangeText={setPdfFileName}
                     placeholder="Enter file name"
                     placeholderTextColor="#999"
                   />
                   <Text style={styles.fileExtension}>.pdf</Text>
                 </View>
               </View>

               <TouchableOpacity 
                 style={[styles.modalButton, isSharingInProgress && styles.modalButtonDisabled]} 
                 onPress={handleSaveToFiles}
                 disabled={isSharingInProgress}
               >
                 <View style={styles.modalButtonIcon}>
                   <Ionicons name="save-outline" size={24} color={isSharingInProgress ? "#999" : "#007AFF"} />
                 </View>
                 <View style={styles.modalButtonContent}>
                   <Text style={styles.modalButtonTitle}>Save to Device</Text>
                   <Text style={styles.modalButtonDescription}>
                     Choose a folder to save your PDF
                   </Text>
                 </View>
                 <Ionicons name="chevron-forward" size={20} color="#999" />
               </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, isSharingInProgress && styles.modalButtonDisabled]} 
                onPress={handleSharePdf}
                disabled={isSharingInProgress}
              >
                <View style={styles.modalButtonIcon}>
                  <Ionicons name="share-outline" size={24} color={isSharingInProgress ? "#999" : "#007AFF"} />
                </View>
                <View style={styles.modalButtonContent}>
                  <Text style={styles.modalButtonTitle}>Share</Text>
                  <Text style={styles.modalButtonDescription}>
                    Send via Messages, Email, WhatsApp, etc.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

               <TouchableOpacity
                 style={styles.modalCancelButton}
                 onPress={() => {
                   setShowSaveOptions(false);
                 }}
               >
                 <Text style={styles.modalCancelText}>Close</Text>
               </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 32,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 8,
  },
  overlayButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-end',
  },
  imageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButton: {
    backgroundColor: '#28a745',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  secondaryButtonText: {
    color: '#dc3545',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fileNameSection: {
    marginBottom: 20,
  },
  fileNameLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileNameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  fileNameInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  fileExtension: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalButtonContent: {
    flex: 1,
  },
  modalButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  modalButtonDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalCancelButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

