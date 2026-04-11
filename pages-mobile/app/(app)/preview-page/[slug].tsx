import { supabase } from '@/utils/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { PagePreview } from '@/components/view-page/page-preview';

// Custom header title component with crown icon
const HeaderTitleWithCrown = ({ title }: { title: string }) => (
  <View style={styles.headerTitleContainer}>
    <Image
      source={require('../../../assets/images/logo/crown only.png')}
      style={styles.crownIcon}
      resizeMode="contain"
    />
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  container: { flex: 1, backgroundColor: '#000' }, // Black background extends into status bar area
  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: { flex: 1 },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  initialLoading: {
    position: 'absolute',
    top: 1,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 12, color: '#666' },
  previewErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewErrorText: {
    marginTop: 12,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});

// Add a single loading view component
const LoadingView = () => (
  <View style={styles.webViewLoading}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.loadingText}>Loading preview...</Text>
  </View>
);

export default function PreviewPage() {
  const { slug, business_id, mode = 'native' } = useLocalSearchParams(); // mode: 'native' or 'web'
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageData, setPageData] = useState<any>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const previewPageLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: pageResponse, error } = await supabase
        .from('pages')
        .select('id, title, slug, content, business:businesses(slug, name)')
        .eq('slug', slug)
        .eq('business_id', business_id)
        .single();

      if (error) {
        console.error('Error loading page:', error);
        Alert.alert('Error', 'Failed to load page data');
        setIsLoading(false);
        return;
      }

      setPageId(pageResponse?.id || null);
      setPageData(pageResponse);

      // Also generate web preview URL for fallback
      const rootUrl = (
        process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com'
      ).replace(/\/$/, '');
      const business = pageResponse?.business as unknown as { slug?: string };
      const businessSlug = business?.slug;
      const finalUrl = `${rootUrl}/${businessSlug}/${slug}`;
      const previewUrlWithFlag = `${finalUrl}?preview=true`;
      setPreviewUrl(previewUrlWithFlag);
    } catch (error) {
      console.error('Error in previewPageLoad:', error);
      Alert.alert('Error', 'Failed to load page');
    } finally {
      setIsLoading(false);
    }
  }, [slug, business_id]);

  // Refresh whenever the screen comes into focus, but do NOT wipe existing data first.
  // This way the content is visible immediately on return visits while the silent
  // background refresh runs; the loading spinner only blocks on the very first load.
  useFocusEffect(
    useCallback(() => {
      if (slug) {
        previewPageLoad();
      }
    }, [slug, previewPageLoad])
  );

  const handleBackPress = () => {
    if (pageId) {
      // Navigate back to the specific page options screen
      router.push({
        pathname: '/(app)/page-options/[id]',
        params: { id: pageId },
      });
    } else {
      // Fallback to generic back
      router.back();
    }
  };

  // Show full-screen loading only on first load (no data yet).
  // On background refreshes (data already present) we render the existing content.
  if (isLoading && !pageData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <HeaderTitleWithCrown title="Preview page" />
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.contentWrapper}>
          <LoadingView />
        </View>
      </SafeAreaView>
    );
  }

  // Native preview mode (default) - uses mobile components
  if (mode === 'native' || !mode) {
    const sections = pageData?.content?.sections || [];
    const pageTitle = pageData?.title || 'Preview';

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <PagePreview
          sections={sections}
          pageTitle={pageTitle}
          showHeader={true}
          onBack={handleBackPress}
        />
      </SafeAreaView>
    );
  }

  // Web preview mode - uses WebView
  if (!previewUrl) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <HeaderTitleWithCrown title="Preview page" />
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.previewErrorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#999" />
            <Text style={styles.previewErrorText}>
              No preview URL available
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <HeaderTitleWithCrown title="Preview page" />
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.contentWrapper}>
        <WebView
          source={{ uri: previewUrl }}
          style={styles.webView}
          startInLoadingState={true}
          renderLoading={LoadingView}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView Error:', nativeEvent);
            Alert.alert(
              'Preview Error',
              `Failed to load preview: ${
                nativeEvent.description || 'Unknown error'
              }`
            );
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🌐 WebView HTTP Error:', nativeEvent);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
