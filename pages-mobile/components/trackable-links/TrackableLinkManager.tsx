import { Ionicons } from '@expo/vector-icons';
import { setStringAsync } from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    generateTrackableUrls,
    getBusinessPageTrackableLinks,
    getPageTrackableLinks,
    getUserTrackableLinks,
    type TrackableLinkWithDetails
} from '../../utils/trackableLinksService';

interface TrackableLinkManagerProps {
  pageId?: string;
  businessPageId?: string;
  onCreateNew: () => void;
}

export function TrackableLinkManager({ 
  pageId, 
  businessPageId, 
  onCreateNew 
}: TrackableLinkManagerProps) {
  const [links, setLinks] = useState<TrackableLinkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLinks = async () => {
    try {
      let linkData: TrackableLinkWithDetails[] = [];
      
      if (pageId) {
        linkData = await getPageTrackableLinks(pageId);
      } else if (businessPageId) {
        linkData = await getBusinessPageTrackableLinks(businessPageId);
      } else {
        linkData = await getUserTrackableLinks();
      }
      
      setLinks(linkData);
    } catch (error) {
      console.error('Error loading trackable links:', error);
      Alert.alert('Error', 'Failed to load trackable links');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [pageId, businessPageId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  const copyToClipboard = async (text: string, type: string) => {
    await setStringAsync(text);
    Alert.alert('Copied!', `${type} copied to clipboard`);
  };

  const shareLink = async (urls: ReturnType<typeof generateTrackableUrls>) => {
    try {
      await Share.share({
        message: urls.shortUrl,
        title: 'Crown Page Link',
      });
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  const renderTrackableLink = (link: TrackableLinkWithDetails) => {
    const businessSlug = link.page?.business?.slug || link.business_page?.business?.slug;
    const pageSlug = link.page?.slug;
    const originalUrl = businessSlug && pageSlug 
      ? `crownpages.com/${businessSlug}/${pageSlug}`
      : businessSlug 
        ? `crownpages.com/${businessSlug}`
        : '';

    const urls = generateTrackableUrls(
      link.tracking_code,
      originalUrl,
      businessSlug,
      pageSlug
    );

    return (
      <View key={link.id} style={styles.linkCard}>
        <View style={styles.linkHeader}>
          <View style={styles.linkInfo}>
            <Text style={styles.linkName}>{link.name}</Text>
            {link.description && (
              <Text style={styles.linkDescription}>{link.description}</Text>
            )}
            <Text style={styles.linkTarget}>
              {link.page?.title || link.business_page?.title}
            </Text>
          </View>
          <View style={styles.linkStats}>
            <Text style={styles.statNumber}>{link.click_count}</Text>
            <Text style={styles.statLabel}>Clicks</Text>
          </View>
        </View>

        <View style={styles.urlSection}>
          <Text style={styles.urlLabel}>Short URL:</Text>
          <View style={styles.urlRow}>
            <Text style={styles.urlText} numberOfLines={1}>
              {urls.shortUrl}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(urls.shortUrl, 'Short URL')}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.urlLabel}>Tracked URL:</Text>
          <View style={styles.urlRow}>
            <Text style={styles.urlText} numberOfLines={1}>
              {urls.trackedUrl}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(urls.trackedUrl, 'Tracked URL')}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.linkActions}>
          <TouchableOpacity
            onPress={() => shareLink(urls)}
            style={[styles.actionButton, styles.shareButton]}
          >
            <Ionicons name="share-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            // onPress={() => onViewAnalytics(link)}
            style={[styles.actionButton, styles.analyticsButton]}
          >
            <Ionicons name="analytics-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          {link.expires_at && (
            <View style={styles.statusItem}>
              <Ionicons name="time-outline" size={12} color="#EF4444" />
              <Text style={styles.statusText}>
                Expires {new Date(link.expires_at).toLocaleDateString()}
              </Text>
            </View>
          )}
          {link.max_clicks && (
            <View style={styles.statusItem}>
              <Ionicons name="speedometer-outline" size={12} color="#F59E0B" />
              <Text style={styles.statusText}>
                {link.click_count}/{link.max_clicks} clicks
              </Text>
            </View>
          )}
          {link.password_hash && (
            <View style={styles.statusItem}>
              <Ionicons name="lock-closed-outline" size={12} color="#10B981" />
              <Text style={styles.statusText}>Password protected</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading trackable links...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {pageId || businessPageId ? 'Page Trackable Links' : 'All Trackable Links'}
        </Text>
        <TouchableOpacity onPress={onCreateNew} style={styles.createButton}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Link</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.linksList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {links.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No trackable links yet</Text>
            <Text style={styles.emptyStateDescription}>
              Create your first trackable link to start tracking engagement
            </Text>
            <TouchableOpacity onPress={onCreateNew} style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Create Link</Text>
            </TouchableOpacity>
          </View>
        ) : (
          links.map(renderTrackableLink)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '500',
  },
  linksList: {
    flex: 1,
    padding: 16,
  },
  linkCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  linkInfo: {
    flex: 1,
  },
  linkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  linkTarget: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  linkStats: {
    alignItems: 'center',
    marginLeft: 16,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  urlSection: {
    marginBottom: 16,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#374151',
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: '#10B981',
  },
  analyticsButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});
