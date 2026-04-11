import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { setStringAsync } from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabase';
import {
  createTrackableLink,
  deleteTrackableLink,
  generateTrackableUrls,
  getPageTrackableLinks,
  getUserTrackableLinks,
  type CreateTrackableLinkParams,
  type TrackableLinkWithDetails
} from '../../../utils/trackableLinksService';

export default function TrackableLinksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [links, setLinks] = useState<TrackableLinkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);


  // Create link form state
  const [linkName, setLinkName] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [collectEmail, setCollectEmail] = useState(false);
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLinks();
    }, [id])
  );

  const loadLinks = async () => {
    try {
      let linkData: TrackableLinkWithDetails[] = [];
      
      if (id) {
        linkData = await getPageTrackableLinks(id);
      } else {
        linkData = await getUserTrackableLinks();
      }
      
      // Update visit counts from trackable_link_events for each link
      const updatedLinks = await Promise.all(
        linkData.map(async (link) => {
          try {
            const { data: events } = await supabase
              .from('trackable_link_events')
              .select('visitor_id, created_at')
              .eq('trackable_link_id', link.id)
              .eq('event_type', 'view')
              .order('created_at', { ascending: false });

            const totalVisits = events?.length || 0;
            const uniqueVisits = events ? new Set(events.map(e => e.visitor_id)).size : 0;
            const lastVisit = events?.[0]?.created_at || null;

            return {
              ...link,
              click_count: totalVisits,
              unique_click_count: uniqueVisits,
              last_clicked_at: lastVisit,
            };
          } catch (error) {
            console.error('Error fetching visit count for link:', link.id, error);
            return link;
          }
        })
      );
      
      setLinks(updatedLinks);
    } catch (error) {
      console.error('Error loading trackable links:', error);
      Alert.alert('Error', 'Failed to load trackable links');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLinks();
  };

  const resetCreateForm = () => {
    setLinkName('');
    setLinkDescription('');
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setShowPreview(false);
    setCollectEmail(false);
  };

  const handleCreateLink = async () => {
    if (!linkName.trim()) {
      Alert.alert('Error', 'Please enter a name for your trackable link');
      return;
    }

    if (!id) {
      Alert.alert('Error', 'Page ID is required');
      return;
    }

    setCreating(true);
    try {
      const params: CreateTrackableLinkParams = {
        name: linkName.trim(),
        description: linkDescription.trim() || undefined,
        pageId: id,
        utmSource: utmSource.trim() || undefined,
        utmMedium: utmMedium.trim() || undefined,
        utmCampaign: utmCampaign.trim() || undefined,
        showPreview,
        collectEmail,
      };

      const result = await createTrackableLink(params);
      
      if (result) {
        Alert.alert('Success', 'Trackable link created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        loadLinks();
      } else {
        Alert.alert('Error', 'Failed to create trackable link');
      }
    } catch (error) {
      console.error('Error creating trackable link:', error);
      Alert.alert('Error', 'Failed to create trackable link');
    } finally {
      setCreating(false);
    }
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

  const handleDeleteLink = (link: TrackableLinkWithDetails) => {
    Alert.alert(
      'Delete Trackable Link',
      `Are you sure you want to delete "${link.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteTrackableLink(link.id);
              if (success) {
                Alert.alert('Success', 'Trackable link deleted successfully');
                loadLinks();
              } else {
                Alert.alert('Error', 'Failed to delete trackable link');
              }
            } catch (error) {
              console.error('Error deleting link:', error);
              Alert.alert('Error', 'Failed to delete trackable link');
            }
          },
        },
      ]
    );
  };

  const viewAnalytics = async (link: TrackableLinkWithDetails) => {
    // Navigate to a dedicated analytics screen similar to page analytics
    router.push({
      pathname: '/(app)/trackable-links/analytics/[id]',
      params: { id: link.id, name: link.name }
    });
  };

  const renderTrackableLink = (link: TrackableLinkWithDetails) => {
    const businessSlug = link.page?.business?.slug;
    const pageSlug = link.page?.slug;
    const urls = generateTrackableUrls(
      link.tracking_code,
      undefined,
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
          </View>
          <View style={styles.linkStats}>
            <Text style={styles.statNumber}>{link.unique_click_count || 0}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
        </View>

        <View style={styles.urlSection}>
          <Text style={styles.urlLabel}>Share Link:</Text>
          <View style={styles.primaryUrlRow}>
            <Text style={styles.primaryUrlText} numberOfLines={1}>
              {urls.shortUrl}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(urls.shortUrl, 'Link')}
              style={styles.primaryCopyButton}
            >
              <Ionicons name="copy-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.secondaryUrlRow} 
            onPress={() => copyToClipboard(urls.trackedUrl, 'Tracked URL')}
          >
            <Text style={styles.secondaryUrlLabel}>Tracked URL:</Text>
            <Text style={styles.secondaryUrlText} numberOfLines={1}>
              {urls.trackedUrl}
            </Text>
          </TouchableOpacity>
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
            onPress={() => viewAnalytics(link)}
            style={[styles.actionButton, styles.analyticsButton]}
          >
            <Ionicons name="analytics-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteLink(link)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Visit Status and Latest Activity */}
        <View style={styles.visitStatusSection}>
          {link.last_clicked_at ? (
            <View style={styles.openedStatus}>
              <View style={styles.openedStatusHeader}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.openedText}>Opened</Text>
              </View>
              <TouchableOpacity 
                style={styles.lastVisitDetails}
                onPress={() => viewAnalytics(link)}
              >
                <Text style={styles.lastVisitText}>
                  Last visit: {new Date(link.last_clicked_at).toLocaleDateString()} at {new Date(link.last_clicked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#666" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notOpenedStatus}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.notOpenedText}>Not opened yet</Text>
            </View>
          )}
        </View>

        {/* Additional Status */}
        {(link.expires_at || link.password_hash) && (
          <View style={styles.statusRow}>
            {link.expires_at && (
              <View style={styles.statusItem}>
                <Ionicons name="time-outline" size={12} color="#EF4444" />
                <Text style={styles.statusText}>
                  Expires {new Date(link.expires_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            {link.password_hash && (
              <View style={styles.statusItem}>
                <Ionicons name="lock-closed-outline" size={12} color="#666" />
                <Text style={styles.statusText}>Protected</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trackable Links</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text>Loading trackable links...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trackable Links</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.linksList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {links.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="link-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No trackable links yet</Text>
              <Text style={styles.emptyStateDescription}>
                Create your first trackable link to start tracking engagement
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCreateModal(true)} 
                style={styles.emptyStateButton}
              >
                <Text style={styles.emptyStateButtonText}>Create Link</Text>
              </TouchableOpacity>
            </View>
          ) : (
            links.map(renderTrackableLink)
          )}
        </ScrollView>
      </View>

      {/* Create Link Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Trackable Link</Text>
            <TouchableOpacity 
              onPress={handleCreateLink} 
              disabled={creating || !linkName.trim()}
            >
              <Text style={[
                styles.modalSave, 
                (!linkName.trim() || creating) && styles.modalSaveDisabled
              ]}>
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Link Name *</Text>
              <TextInput
                style={styles.formInput}
                value={linkName}
                onChangeText={setLinkName}
                placeholder="e.g., Email Campaign, Social Media"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={linkDescription}
                onChangeText={setLinkDescription}
                placeholder="Optional description for organization"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>UTM Parameters (Optional)</Text>
              <Text style={styles.formSectionDescription}>
                Add UTM parameters to track campaign performance
              </Text>

              <Text style={styles.formLabel}>UTM Source</Text>
              <TextInput
                style={styles.formInput}
                value={utmSource}
                onChangeText={setUtmSource}
                placeholder="e.g., newsletter, social"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.formLabel}>UTM Medium</Text>
              <TextInput
                style={styles.formInput}
                value={utmMedium}
                onChangeText={setUtmMedium}
                placeholder="e.g., email, social"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.formLabel}>UTM Campaign</Text>
              <TextInput
                style={styles.formInput}
                value={utmCampaign}
                onChangeText={setUtmCampaign}
                placeholder="e.g., summer-sale"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Advanced Options - Hidden for now */}
            {false && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Advanced Options</Text>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Show Preview</Text>
                    <Text style={styles.switchDescription}>
                      Show a preview page before redirecting
                    </Text>
                  </View>
                  <Switch
                    value={showPreview}
                    onValueChange={setShowPreview}
                    trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    thumbColor="white"
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Collect Email</Text>
                    <Text style={styles.switchDescription}>
                      Require email before accessing the page
                    </Text>
                  </View>
                  <Switch
                    value={collectEmail}
                    onValueChange={setCollectEmail}
                    trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                    thumbColor="white"
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Removed Analytics Modal - now navigates to dedicated screen */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linksList: {
    flex: 1,
    padding: 16,
  },
  linkCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkStats: {
    alignItems: 'center',
    marginLeft: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  urlSection: {
    marginBottom: 16,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  primaryUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryUrlText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#fff',
    fontWeight: '500',
  },
  primaryCopyButton: {
    padding: 6,
    marginLeft: 12,
    backgroundColor: '#1D4ED8',
    borderRadius: 6,
  },
  secondaryUrlRow: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  secondaryUrlLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  secondaryUrlText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#555',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: '#10B981',
  },
  analyticsButton: {
    backgroundColor: '#8B5CF6',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    flex: 0,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  visitStatusSection: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  openedStatus: {
    flexDirection: 'column',
  },
  openedStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  openedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  lastVisitDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  lastVisitText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
  },
  notOpenedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notOpenedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalSaveDisabled: {
    color: '#9CA3AF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  formSectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

});
