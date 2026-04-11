import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { router, Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DocumentScanner from 'react-native-document-scanner-plugin';

export default function DocumentScannerScreen() {
  const insets = useSafeAreaInsets();
  const [scanSheet, setScanSheet] = useState<{
    visible: boolean;
    count: number;
    pdfUri: string | null;
    imageUris: string[];
  }>({ visible: false, count: 0, pdfUri: null, imageUris: [] });

  const handleScan = async () => {
    try {
      const { scannedImages } = await DocumentScanner.scanDocument({ maxNumDocuments: 10 });
      if (!scannedImages || scannedImages.length === 0) return;

      const count = scannedImages.length;
      setScanSheet({ visible: true, count, pdfUri: null, imageUris: scannedImages });

      // Build PDF in background
      (async () => {
        try {
          const b64Pages = await Promise.all(
            scannedImages.map(uri =>
              FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any })
            )
          );
          const pageDivs = b64Pages
            .map(
              b64 =>
                `<div style="width:612pt;height:792pt;display:flex;align-items:center;justify-content:center;page-break-after:always;background:white;">` +
                `<img src="data:image/jpeg;base64,${b64}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;"/>` +
                `</div>`
            )
            .join('');
          const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;}</style></head><body>${pageDivs}</body></html>`;
          const result = await Print.printToFileAsync({ html, base64: false, width: 612, height: 792 });
          setScanSheet(s => ({ ...s, pdfUri: result.uri }));
        } catch (pdfErr) {
          console.warn('PDF build failed:', pdfErr);
        }
      })();
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('cancel')) return;
      console.error('Scan error:', err);
      Alert.alert('Scan failed', 'Could not complete the scan. Please try again.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Scanner</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="scan-outline" size={56} color="#007AFF" />
            </View>
            <Text style={styles.heroTitle}>Scan a Document</Text>
            <Text style={styles.heroSubtitle}>
              Use your camera to scan paper documents. Each scan can include up to 10 pages and will be combined into a single PDF.
            </Text>
          </View>

          <TouchableOpacity style={styles.scanBtn} onPress={handleScan} activeOpacity={0.85}>
            <Ionicons name="camera-outline" size={22} color="#fff" />
            <Text style={styles.scanBtnText}>Start Scan</Text>
          </TouchableOpacity>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={18} color="#F5A623" />
            <Text style={styles.tipText}>
              For best results, place the document on a flat surface with good lighting.
            </Text>
          </View>
        </ScrollView>

        {/* Scan Result Bottom Sheet */}
        <Modal
          visible={scanSheet.visible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setScanSheet(s => ({ ...s, visible: false }))}
        >
          <View style={StyleSheet.absoluteFillObject}>
            <TouchableOpacity
              style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              activeOpacity={1}
              onPress={() => setScanSheet(s => ({ ...s, visible: false }))}
            />
            <View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom + 20, 40), alignItems: 'stretch' },
              ]}
            >
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>
                {scanSheet.count} Page{scanSheet.count !== 1 ? 's' : ''} Scanned
              </Text>
              <Text style={styles.sheetSubtitle}>What would you like to do?</Text>

              {/* Save Images to Photos */}
              <TouchableOpacity
                style={styles.sheetAction}
                onPress={async () => {
                  setScanSheet(s => ({ ...s, visible: false }));
                  try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permission needed', 'Grant Photos access to save images.');
                      return;
                    }
                    for (const img of scanSheet.imageUris) {
                      await MediaLibrary.saveToLibraryAsync(img).catch(() => {});
                    }
                    Alert.alert(
                      'Saved',
                      `${scanSheet.count} image${scanSheet.count !== 1 ? 's' : ''} saved to Photos.`
                    );
                  } catch {
                    Alert.alert('Error', 'Could not save images.');
                  }
                }}
              >
                <View style={styles.sheetIcon}>
                  <Ionicons name="images-outline" size={22} color="#007AFF" />
                </View>
                <View style={styles.sheetTextWrap}>
                  <Text style={styles.sheetActionTitle}>Save Images to Photos</Text>
                  <Text style={styles.sheetActionSub}>Save each scanned page as a JPEG</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>

              {/* PDF loading indicator */}
              {!scanSheet.pdfUri && (
                <View style={[styles.sheetAction, { opacity: 0.45 }]}>
                  <View style={styles.sheetIcon}>
                    <Ionicons name="document-text-outline" size={22} color="#007AFF" />
                  </View>
                  <View style={styles.sheetTextWrap}>
                    <Text style={styles.sheetActionTitle}>Preparing PDF…</Text>
                    <Text style={styles.sheetActionSub}>Save and Share options will appear shortly</Text>
                  </View>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              )}

              {/* Save PDF to Photos */}
              {scanSheet.pdfUri && (
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={async () => {
                    setScanSheet(s => ({ ...s, visible: false }));
                    try {
                      const { status } = await MediaLibrary.requestPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert('Permission needed', 'Grant Photos access to save the PDF.');
                        return;
                      }
                      await MediaLibrary.saveToLibraryAsync(scanSheet.pdfUri!).catch(() => {});
                      Alert.alert('Saved', `${scanSheet.count}-page PDF saved to Photos.`);
                    } catch {
                      Alert.alert('Error', 'Could not save PDF.');
                    }
                  }}
                >
                  <View style={styles.sheetIcon}>
                    <Ionicons name="document-text-outline" size={22} color="#007AFF" />
                  </View>
                  <View style={styles.sheetTextWrap}>
                    <Text style={styles.sheetActionTitle}>Save PDF to Photos</Text>
                    <Text style={styles.sheetActionSub}>Combine all pages into one PDF file</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}

              {/* Share PDF */}
              {scanSheet.pdfUri && (
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={async () => {
                    setScanSheet(s => ({ ...s, visible: false }));
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(scanSheet.pdfUri!, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Scanned Document',
                        UTI: 'com.adobe.pdf',
                      });
                    } else {
                      Alert.alert('Sharing not available', 'File sharing is not supported on this device.');
                    }
                  }}
                >
                  <View style={styles.sheetIcon}>
                    <Ionicons name="share-outline" size={22} color="#007AFF" />
                  </View>
                  <View style={styles.sheetTextWrap}>
                    <Text style={styles.sheetActionTitle}>Share PDF</Text>
                    <Text style={styles.sheetActionSub}>Send via Messages, Mail, Drive, etc.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}

              {/* Dismiss */}
              <TouchableOpacity
                style={[styles.sheetAction, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8 }]}
                onPress={() => setScanSheet(s => ({ ...s, visible: false }))}
              >
                <View style={styles.sheetTextWrap}>
                  <Text style={[styles.sheetActionTitle, { color: '#999', textAlign: 'center' }]}>
                    Dismiss
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  heroIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
  },
  scanBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFE9B0',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    width: '100%',
  },
  sheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTextWrap: {
    flex: 1,
  },
  sheetActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sheetActionSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
});
