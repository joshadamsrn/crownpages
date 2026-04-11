// app/(app)/page-options/[id].tsx
import AppHeader from '@/components/common/AppHeader';
import Loader from '@/components/common/Loader';
import PublishPageToggle from '@/components/common/pubilsh-page';
import { Ionicons } from '@expo/vector-icons';
import { setStringAsync } from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { Page } from '../../../types/page-builder.types';
import { supabase } from '../../../utils/supabase';
import { createTrackableLink, generateTrackableUrls } from '../../../utils/trackableLinksService';
import ShareOptionsModal from '../../../components/common/ShareOptionsModal';

export default function PageOptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsViews, setAnalyticsViews] = useState<number | null>(null);
  const [totalViews, setTotalViews] = useState<number>(0);
  const [summary, setSummary] = useState<{ total_views?: number } | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrTrackerUrl, setQrTrackerUrl] = useState<string>('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const qrRef = useRef<View>(null);
  const [scanSheet, setScanSheet] = useState<{
    visible: boolean;
    count: number;
    pdfUri: string | null;
    imageUris: string[];
  }>({ visible: false, count: 0, pdfUri: null, imageUris: [] });

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setPage(null); // Clear old page data to prevent flash
      setQrTrackerUrl(''); // Clear stale QR tracker URL so new page gets its own link
      fetchPage();
    }
  }, [id]); // Add id as dependency so it refetches when route parameter changes

  useEffect(() => {
    if (!id) return;
    (async () => {
      // You could call your stored proc, or just head‑count the raw events:
      const { count, error } = await supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .eq('event_type', 'page_view');

      if (error) {
        console.error('Error loading view count:', error);
      } else {
        setAnalyticsViews(count || 0);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.rpc('get_analytics_summary', {
        p_page_id: id,
        p_start_date: null,
        p_end_date: null,
      });
      if (!error && data?.length) {
        setSummary(data[0]);
      }
    })();
  }, [id]);

  // Generate page URL when page data is available
  useEffect(() => {
    if (page?.business?.slug && page?.slug) {
      const pagesRootUrl =
        process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com';
      const baseUrl = pagesRootUrl.replace(/\/$/, '');
      const url = `${baseUrl}/${page.business.slug}/${page.slug}`;
      setPageUrl(url);
    }
  }, [page]);

  const fetchPage = async () => {
    try {
      if (!id) return;

      // Correct query syntax for Supabase foreign key relationship
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

      // Ensure the page has a valid content structure
      if (!data.content) {
        data.content = { sections: [] };
      } else if (!data.content.sections) {
        data.content.sections = [];
      }

      setPage(data);
    } catch (error) {
      console.error('Error fetching page:', error);
      Alert.alert('Error', 'Failed to load page details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!pageUrl) return;

    try {
      await setStringAsync(pageUrl);
      Alert.alert('Copied!', 'Page URL copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy URL');
    }
  };

  const handleViewPage = async () => {
    if (!page) return;

    const rootUrl = (
      process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com"
    ).replace(/\/$/, "");
    const businessSlug = page.business?.slug || "business";
    const pageSlug = page.slug || "";
    const finalUrl = `${rootUrl}/${businessSlug}/${pageSlug}?preview=true`;
    Linking.openURL(finalUrl);
  };


  const handleDownloadQR = async () => {
    if (!qrRef.current || !pageUrl) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library permissions to save the QR code.');
        return;
      }
      const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'QR code saved to your photo library.');
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    }
  };

  const handleOpenQrModal = async () => {
    setQrModalVisible(true);
    // Create a QR tracker link once per page load; reuse it on subsequent opens
    if (!qrTrackerUrl && page?.id && page?.business?.slug && page?.slug) {
      try {
        const link = await createTrackableLink({
          name: 'QR Code',
          description: 'Auto-generated for QR code scans',
          pageId: page.id,
          utmSource: 'qr_code',
          utmMedium: 'qr',
        });
        if (link) {
          const urls = generateTrackableUrls(
            link.tracking_code,
            pageUrl,
            page.business.slug,
            page.slug,
          );
          setQrTrackerUrl(urls.shortUrl);
        }
      } catch (err) {
        console.error('Failed to create QR tracker link:', err);
        // Fall back to plain pageUrl — QR still works, just untracked
      }
    }
  };

  const handleScanDocument = async () => {
    try {
      // Allow up to 10 pages per scan session
      const { scannedImages } = await DocumentScanner.scanDocument({ maxNumDocuments: 10 });
      if (!scannedImages || scannedImages.length === 0) return;

      const count = scannedImages.length;

      // Show sheet immediately — don't wait for PDF build
      setScanSheet({ visible: true, count, pdfUri: null, imageUris: scannedImages });

      // Build PDF in background; each page sized exactly to its image
      (async () => {
        try {
          // US Letter: 612×792pt — image fills as large as possible, centered
          const b64Pages = await Promise.all(
            scannedImages.map(uri => FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any }))
          );
          const pageDivs = b64Pages.map((b64, i) =>
            `<div style="width:612pt;height:792pt;display:flex;align-items:center;justify-content:center;page-break-after:always;background:white;">` +
            `<img src="data:image/jpeg;base64,${b64}" style="max-width:100%;max-height:100%;object-fit:contain;display:block;"/>` +
            `</div>`
          ).join('');
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

  const handleShare = () => {
    if (!page) return;
    if (!page.is_published) {
      Alert.alert(
        'Page Not Published',
        'This page is currently a draft. The shared link will not work for others until you publish the page.\n\nDo you still want to share the link?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Anyway', style: 'default', onPress: () => setShareModalVisible(true) },
        ]
      );
      return;
    }
    setShareModalVisible(true);
  };

  const handleDuplicate = async () => {
    if (!page || !session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('pages')
        .insert({
          title: `${page.title} (Copy)`,
          description: page.description,
          content: page.content,
          status: 'draft',
          created_by: session.user.id,
          business_id: page.business_id,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Page duplicated successfully', [
        {
          text: 'Edit Copy',
          onPress: () => router.push(`/(app)/page-editor/${data.id}`),
        },
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Error duplicating page:', error);
      Alert.alert('Error', 'Failed to duplicate page');
    }
  };

  const updatePage = async () => {
    if (!page?.id) return;

    try {
      const { error, data } = await supabase
        .from('pages')
        .update({ is_published: !page.is_published })
        .eq('id', page.id)
        .select()
        .single();

      if (error) throw error;

      setPage(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to update page visibility');
      console.error('Failed to update publish status:', err);
    }
  };

  const handleDelete = () => {
    if (!page) return;

    Alert.alert(
      'Delete Page',
      `Are you sure you want to delete "${page.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pages')
                .delete()
                .eq('id', page.id);

              if (error) throw error;

              router.back();
            } catch (error) {
              console.error('Error deleting page:', error);
              Alert.alert('Error', 'Failed to delete page');
            }
          },
        },
      ]
    );
  };

  const ActionButton = ({
    icon,
    title,
    description,
    onPress,
    color = '#000',
    destructive = false,
    disabled = false,
  }: {
    icon: string;
    title: string;
    description: string;
    onPress: () => void;
    color?: string;
    destructive?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: destructive
              ? '#fee'
              : disabled
                ? '#f1f3f4'
                : '#f8f9fa',
          },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={24}
          color={destructive ? '#dc3545' : disabled ? '#999' : color}
        />
      </View>
      <View style={styles.actionContent}>
        <Text
          style={[
            styles.actionTitle,
            {
              color: destructive ? '#dc3545' : disabled ? '#999' : '#000',
            },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.actionDescription,
            disabled && styles.actionDescriptionDisabled,
          ]}
        >
          {description}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={disabled ? '#ccc' : '#999'}
      />
    </TouchableOpacity>
  );

  const ShareButton = ({
    icon,
    image,
    title,
    onPress,
    color = '#007AFF',
    backgroundColor = '#F0F8FF',
    disabled = false,
  }: {
    icon?: string;
    image?: any;
    title: string;
    onPress: () => void;
    color?: string;
    backgroundColor?: string;
    disabled?: boolean;
  }) => {
    const isDisabled = disabled;
    // When disabled, ALL buttons use the same light grey scheme
    const buttonColor = isDisabled ? '#999' : color;
    const buttonBgColor = isDisabled ? '#f5f5f5' : backgroundColor;
    
    return (
      <TouchableOpacity 
        style={[styles.shareButton, { backgroundColor: buttonBgColor }, isDisabled && styles.disabledButton]} 
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
      >
        {image ? (
          <Image source={image} style={[styles.crownLogo, { tintColor: buttonColor, opacity: isDisabled ? 0.5 : 1 }]} />
        ) : (
          <Ionicons name={icon as any} size={22} color={buttonColor} style={{ opacity: isDisabled ? 0.5 : 1 }} />
        )}
        <Text style={[styles.shareButtonText, { color: buttonColor, opacity: isDisabled ? 0.5 : 1 }]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!page) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Page Options" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Page not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Page Options" />
      <View style={styles.contentWrapper}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Page Info Card */}
          <View style={styles.pageInfoCard}>
            <Text style={styles.pageTitle}>{page.title}</Text>
            <Text style={styles.pageDescription} numberOfLines={2}>
              {page.description || 'No description'}
            </Text>

            <View style={styles.statusBadge}>
              <PublishPageToggle
                isPublished={page.is_published ? page.is_published : false}
                onToggle={() => {
                  updatePage();
                }}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: page.is_published ? '#28a745' : '#ffc107' },
                ]}
              >
                {page.is_published ? 'Published' : 'Draft'}
              </Text>
            </View>
          </View>

          {/* Enhanced Share Section */}
          {pageUrl && (
            <View style={styles.shareSection}>
              <Text style={styles.sectionTitle}>Share Your Page</Text>

              {/* URL Display */}
              <View style={styles.urlContainer}>
                <View style={styles.urlBox}>
                  <Ionicons name="link-outline" size={20} color="#666" style={styles.urlIcon} />
                  <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
                    {pageUrl}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyUrl}>
                  <Ionicons name="copy-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Share Action Buttons */}
              <View style={styles.shareButtonsContainer}>
                <ShareButton
                  icon="share-social-outline"
                  title="Share"
                  onPress={handleShare}
                  color="#007AFF"
                  backgroundColor="#F0F8FF"
                  disabled={!page.is_published}
                />
                <ShareButton
                  icon="eye-outline"
                  title="View Page"
                  onPress={handleViewPage}
                  color="#28a745"
                  backgroundColor="#F0FFF0"
                  disabled={false}
                />
                <ShareButton
                  icon="qr-code-outline"
                  title="QR Code"
                  onPress={handleOpenQrModal}
                  color="#6B4EFF"
                  backgroundColor="#F3F0FF"
                  disabled={false}
                />
              </View>

              {!page.is_published && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#FFA500" />
                  <Text style={styles.warningText}>
                    Page is unpublished. Others won't be able to view it until you publish.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* QR Code Modal */}
          <Modal
            visible={qrModalVisible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setQrModalVisible(false)}
          >
            {/* absoluteFillObject guarantees the overlay covers the full physical screen
                on both iOS and Android (including behind status bar / nav bar) */}
            <View style={StyleSheet.absoluteFillObject}>
              {/* Dim overlay — tap to dismiss */}
              <TouchableOpacity
                style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                activeOpacity={1}
                onPress={() => setQrModalVisible(false)}
              />

              {/* Sheet pinned to the physical screen bottom via absolute positioning.
                  paddingBottom uses the real safe-area inset so content clears the
                  home indicator / nav bar on every device. */}
              <View style={[styles.qrModalSheet, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
                <View style={styles.qrModalHandle} />

                <Text style={styles.qrModalTitle}>QR Code</Text>
                <Text style={styles.qrModalSubtitle}>
                  Scan to open this page. Save it or share it directly.
                </Text>

                <View style={styles.qrContainer}>
                  <View ref={qrRef} style={styles.qrWrapper} collapsable={false}>
                    {(qrTrackerUrl || pageUrl) ? (
                      <QRCode value={qrTrackerUrl || pageUrl} size={220} backgroundColor="white" color="black" />
                    ) : null}
                  </View>
                </View>

                <View style={styles.qrActions}>
                  <TouchableOpacity style={styles.qrButton} onPress={handleDownloadQR}>
                    <Ionicons name="download-outline" size={20} color="#007AFF" />
                    <Text style={styles.qrButtonText}>Save to Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qrButton}
                    onPress={async () => {
                      try {
                        const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
                        await Share.share({ url: uri, title: `${page?.title} QR Code` });
                      } catch (e) {
                        console.error('Share QR error:', e);
                      }
                    }}
                  >
                    <Ionicons name="share-outline" size={20} color="#007AFF" />
                    <Text style={styles.qrButtonText}>Share QR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

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
              <View style={[styles.qrModalSheet, { paddingBottom: Math.max(insets.bottom + 20, 40), alignItems: 'stretch' }]}>
                <View style={[styles.qrModalHandle, { alignSelf: 'center' }]} />
                <Text style={[styles.qrModalTitle, { textAlign: 'center', marginBottom: 4 }]}>
                  {scanSheet.count} Page{scanSheet.count !== 1 ? 's' : ''} Scanned
                </Text>
                <Text style={[styles.qrModalSubtitle, { marginBottom: 20 }]}>
                  What would you like to do?
                </Text>

                {/* Save Images */}
                <TouchableOpacity
                  style={styles.scanSheetAction}
                  onPress={async () => {
                    setScanSheet(s => ({ ...s, visible: false }));
                    try {
                      const { status } = await MediaLibrary.requestPermissionsAsync();
                      if (status !== 'granted') { Alert.alert('Permission needed', 'Grant Photos access to save images.'); return; }
                      for (const img of scanSheet.imageUris) await MediaLibrary.saveToLibraryAsync(img).catch(() => {});
                      Alert.alert('Saved', `${scanSheet.count} image${scanSheet.count !== 1 ? 's' : ''} saved to Photos.`);
                    } catch { Alert.alert('Error', 'Could not save images.'); }
                  }}
                >
                  <View style={styles.scanSheetIcon}>
                    <Ionicons name="images-outline" size={22} color="#007AFF" />
                  </View>
                  <View style={styles.scanSheetTextWrap}>
                    <Text style={styles.scanSheetActionTitle}>Save Images to Photos</Text>
                    <Text style={styles.scanSheetActionSub}>Save each scanned page as a JPEG</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>

                {/* PDF building indicator */}
                {!scanSheet.pdfUri && (
                  <View style={[styles.scanSheetAction, { opacity: 0.45 }]}>
                    <View style={styles.scanSheetIcon}>
                      <Ionicons name="document-text-outline" size={22} color="#007AFF" />
                    </View>
                    <View style={styles.scanSheetTextWrap}>
                      <Text style={styles.scanSheetActionTitle}>Preparing PDF…</Text>
                      <Text style={styles.scanSheetActionSub}>Save and Share options will appear shortly</Text>
                    </View>
                    <ActivityIndicator size="small" color="#007AFF" />
                  </View>
                )}

                {/* Save PDF */}
                {scanSheet.pdfUri && (
                  <TouchableOpacity
                    style={styles.scanSheetAction}
                    onPress={async () => {
                      setScanSheet(s => ({ ...s, visible: false }));
                      try {
                        const { status } = await MediaLibrary.requestPermissionsAsync();
                        if (status !== 'granted') { Alert.alert('Permission needed', 'Grant Photos access to save the PDF.'); return; }
                        await MediaLibrary.saveToLibraryAsync(scanSheet.pdfUri!).catch(() => {});
                        Alert.alert('Saved', `${scanSheet.count}-page PDF saved to Photos.`);
                      } catch { Alert.alert('Error', 'Could not save PDF.'); }
                    }}
                  >
                    <View style={styles.scanSheetIcon}>
                      <Ionicons name="document-text-outline" size={22} color="#007AFF" />
                    </View>
                    <View style={styles.scanSheetTextWrap}>
                      <Text style={styles.scanSheetActionTitle}>Save PDF to Photos</Text>
                      <Text style={styles.scanSheetActionSub}>Combine all pages into one PDF file</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}

                {/* Share PDF */}
                {scanSheet.pdfUri && (
                  <TouchableOpacity
                    style={styles.scanSheetAction}
                    onPress={async () => {
                      setScanSheet(s => ({ ...s, visible: false }));
                      const canShare = await Sharing.isAvailableAsync();
                      if (canShare) {
                        await Sharing.shareAsync(scanSheet.pdfUri!, { mimeType: 'application/pdf', dialogTitle: 'Share Scanned Document', UTI: 'com.adobe.pdf' });
                      } else {
                        Alert.alert('Sharing not available', 'File sharing is not supported on this device.');
                      }
                    }}
                  >
                    <View style={styles.scanSheetIcon}>
                      <Ionicons name="share-outline" size={22} color="#007AFF" />
                    </View>
                    <View style={styles.scanSheetTextWrap}>
                      <Text style={styles.scanSheetActionTitle}>Share PDF</Text>
                      <Text style={styles.scanSheetActionSub}>Send via Messages, Mail, Drive, etc.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}

                {/* Cancel */}
                <TouchableOpacity
                  style={[styles.scanSheetAction, { borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 8 }]}
                  onPress={() => setScanSheet(s => ({ ...s, visible: false }))}
                >
                  <View style={styles.scanSheetTextWrap}>
                    <Text style={[styles.scanSheetActionTitle, { color: '#999', textAlign: 'center' }]}>Dismiss</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>

            <ActionButton
              icon="eye-outline"
              title="Preview Page"
              description="See how your page looks to visitors"
              onPress={() => {
                const rootUrl = (
                  process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com"
                ).replace(/\/$/, "");
                const businessSlug = page.business?.slug || "business";
                const pageSlug = page.slug || "";
                const finalUrl = `${rootUrl}/${businessSlug}/${pageSlug}?preview=true`;
                Linking.openURL(finalUrl);
              }}
            />

            {page.created_by === session?.user?.id && (
              <ActionButton
                icon="create-outline"
                title="Edit Page"
                description="Modify content, layout, and settings"
                onPress={() => router.push(`/(app)/page-editor/${page.id}`)}
              />
            )}

            {page.created_by === session?.user?.id && (
              <ActionButton
                icon="people-outline"
                title="Sharing & Access"
                description="Control who can view or edit this page"
                onPress={() => router.push(`/(app)/page-sharing/${page.id}` as any)}
                color="#007AFF"
              />
            )}

            <ActionButton
              icon="analytics-outline"
              title="View Analytics"
              description="See page performance and visitor insights"
              onPress={() =>
                router.push({
                  pathname: '/(app)/page-analytics/[id]',
                  params: { id: page.id },
                })
              }
            />

            {page.created_by === session?.user?.id && (
              <>
                <ActionButton
                  icon="link-outline"
                  title="Trackable Links"
                  description="Create and manage trackable sharing links"
                  onPress={() => router.push(`/(app)/trackable-links/${page.id}` as any)}
                />

                <ActionButton
                  icon="settings-outline"
                  title="Page Settings"
                  description="Manage privacy, SEO, and other settings"
                  onPress={() => router.push(`/(app)/page-settings/${page.id}`)}
                />
              </>
            )}
          </View>

          {/* Tools Section */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Tools</Text>

            <ActionButton
              icon="images-outline"
              title="Images to PDF"
              description="Convert multiple images into a scrollable PDF document"
              onPress={() => router.push(`/(app)/images-to-pdf/${page.id}` as any)}
              color="#666"
            />

            <ActionButton
              icon="scan-outline"
              title="Scan Document"
              description="Scan a paper document, save to photos, and upload as PDF"
              onPress={handleScanDocument}
              color="#666"
            />
          </View>

          {/* Danger Zone — owner only */}
          {page?.created_by === session?.user?.id && (
            <View style={styles.dangerSection}>
              <Text style={styles.sectionTitle}>Danger Zone</Text>

              <ActionButton
                icon="trash-outline"
                title="Delete Page"
                description="Permanently delete this page"
                onPress={handleDelete}
                destructive={true}
              />
            </View>
          )}

          {/* Leave Page — shared pages only */}
          {page?.created_by !== session?.user?.id && (
            <View style={styles.dangerSection}>
              <Text style={styles.sectionTitle}>Shared Page</Text>

              <ActionButton
                icon="exit-outline"
                title="Leave Page"
                description="Remove this page from your Shared With Me list"
                onPress={() => {
                  Alert.alert(
                    `Leave "${page.title}"?`,
                    "You'll lose access and will need to ask the owner to re-share it.",
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Leave',
                        style: 'destructive',
                        onPress: async () => {
                          const userEmail = session?.user?.email ?? '';
                          const userId = session?.user?.id ?? '';
                          const { error } = await supabase
                            .from('page_shares')
                            .delete()
                            .eq('page_id', page.id)
                            .or(`shared_with_user_id.eq.${userId},shared_with_email.eq.${userEmail.toLowerCase()}`);
                          if (error) {
                            Alert.alert('Error', 'Could not leave the page. Please try again.');
                          } else {
                            router.back();
                          }
                        },
                      },
                    ]
                  );
                }}
                destructive={true}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {page && (
        <ShareOptionsModal
          visible={shareModalVisible}
          pageUrl={pageUrl}
          pageId={page.id}
          businessSlug={page.business?.slug || ''}
          pageSlug={page.slug || ''}
          onClose={() => setShareModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background extends into status bar area
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crownIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff', // Makes the crown white to match header text
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  pageInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  pageStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    // alignSelf: 'flex-',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  shareSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
    gap: 16,
  },
  urlBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  urlIcon: {
    marginRight: 10,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 10,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  crownLogo: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 10,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#B8860B',
    lineHeight: 18,
  },
  actionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
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
    padding: 20,
    paddingBottom: 12,
  },
  qrModalSheet: {
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
  scanSheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  scanSheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanSheetTextWrap: {
    flex: 1,
  },
  scanSheetActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scanSheetActionSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  qrModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  qrButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionDescriptionDisabled: {
    color: '#999',
  },
});
