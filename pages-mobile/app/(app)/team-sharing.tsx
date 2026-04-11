import AppHeader from '@/components/common/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { Page } from '../../types/page-builder.types';

type BusinessMember = {
  id: string;
  invited_email: string | null;
  user_id: string | null;
  role: string;
  users?: { email?: string | null } | null;
};

type PageShare = {
  id: string;
  page_id: string;
  shared_with_email: string;
  permission: string;
};

export default function TeamSharingScreen() {
  const { businessId: routeBusinessId } = useLocalSearchParams<{ businessId?: string }>();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageShares, setPageShares] = useState<PageShare[]>([]);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set());
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Add person modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalPageId, setAddModalPageId] = useState<string | null>(null);
  const [pendingShares, setPendingShares] = useState<Record<string, 'view' | 'edit'>>({});
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackPermission, setFallbackPermission] = useState<'view' | 'edit'>('view');
  const [isAdding, setIsAdding] = useState(false);

  const loadAll = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      // Scope to a single business to match Business Settings / page-level sharing behavior.
      let activeBusinessId = routeBusinessId || null;
      if (!activeBusinessId) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: true })
          .limit(1);
        activeBusinessId = businesses?.[0]?.id || null;
      }
      if (!activeBusinessId) { setIsLoading(false); return; }
      setBusinessId(activeBusinessId);

      const [membersRes, pagesRes] = await Promise.all([
        supabase
          .from('business_members')
          .select('*')
          .eq('business_id', activeBusinessId)
          .order('created_at', { ascending: true }),
        supabase
          .from('pages')
          .select('id, title, slug, is_published, business_id')
          .eq('created_by', session.user.id)
          .eq('business_id', activeBusinessId)
          .order('created_at', { ascending: false }),
      ]);

      const pageIds = (pagesRes.data || []).map((p) => p.id);
      let sharesData: PageShare[] = [];
      if (pageIds.length > 0) {
        const { data: sd } = await supabase
          .from('page_shares')
          .select('id, page_id, shared_with_email, permission')
          .in('page_id', pageIds);
        sharesData = (sd || []) as PageShare[];
      }

      const rawMembers = (membersRes.data || []) as BusinessMember[];
      const selfEmail = session.user.email?.trim().toLowerCase();
      const seenEmails = new Set<string>();
      const normalizedMembers = rawMembers
        .map((m) => ({ ...m, invited_email: (m.invited_email || '').trim().toLowerCase() || null }))
        .filter((m) => {
          const email = m.invited_email || '';
          if (!email) return false;
          if (selfEmail && email === selfEmail) return false;
          if (seenEmails.has(email)) return false;
          seenEmails.add(email);
          return true;
        });

      setMembers(normalizedMembers);
      setPages((pagesRes.data || []) as unknown as Page[]);
      setPageShares(sharesData);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, routeBusinessId]);

  // useFocusEffect only — covers both initial mount and re-focus, no double-fetch
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const getMemberEmail = (m: BusinessMember) =>
    (m.invited_email || 'Unknown').trim().toLowerCase();

  const isPageSharedWith = (pageId: string, email: string) =>
    pageShares.some((s) => s.page_id === pageId && s.shared_with_email.toLowerCase() === email.toLowerCase());

  const sharesForPage = (pageId: string) =>
    pageShares.filter((s) => s.page_id === pageId);

  // Share all owned pages with a member at a given permission
  const handleShareAll = (member: BusinessMember) => {
    const email = getMemberEmail(member);
    const doShare = async (permission: 'view' | 'edit') => {
      const inserts = pages
        .filter((p) => !isPageSharedWith(p.id, email))
        .map((p) => ({
          page_id: p.id,
          shared_by: session!.user.id,
          shared_with_email: email.toLowerCase(),
          permission,
        }));
      if (inserts.length === 0) {
        Alert.alert('Already shared', `${email} already has access to all your pages.`);
        return;
      }
      const { error } = await supabase.from('page_shares').upsert(inserts, { onConflict: 'page_id,shared_with_email' });
      if (error) {
        Alert.alert('Error', 'Failed to share pages. Please try again.');
      } else {
        Alert.alert('Done', `Shared ${inserts.length} page${inserts.length !== 1 ? 's' : ''} with ${email}.`);
        loadAll();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Share all pages with ${email}`,
          options: ['Cancel', 'Share as View-only', 'Share as Editor'],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) doShare('view');
          if (idx === 2) doShare('edit');
        }
      );
    } else {
      Alert.alert(
        `Share all pages with ${email}`,
        'Choose permission level',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View-only', onPress: () => doShare('view') },
          { text: 'Editor', onPress: () => doShare('edit') },
        ]
      );
    }
  };

  // Remove a member — delete business_members row and all their page_shares
  const handleRemoveMember = (member: BusinessMember) => {
    const email = getMemberEmail(member);
    Alert.alert(
      'Remove Team Member',
      `Remove ${email} from your team? This will revoke their access to all shared pages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('page_shares').delete().eq('shared_with_email', email.toLowerCase());
            await supabase.from('business_members').delete().eq('id', member.id);
            loadAll();
          },
        },
      ]
    );
  };

  // Remove a specific page share
  const handleRemoveShare = async (shareId: string) => {
    const { error } = await supabase.from('page_shares').delete().eq('id', shareId);
    if (!error) loadAll();
  };

  // Toggle permission for an existing share
  const handleTogglePermission = async (share: PageShare) => {
    const newPermission = share.permission === 'view' ? 'edit' : 'view';
    await supabase.from('page_shares').update({ permission: newPermission }).eq('id', share.id);
    loadAll();
  };

  // Add person(s) to a page — team-first, multi-select
  const handleAddPerson = async () => {
    if (!addModalPageId || !session?.user?.id) return;
    const inserts: { page_id: string; shared_by: string; shared_with_email: string; permission: string }[] = [];
    Object.entries(pendingShares).forEach(([email, permission]) => {
      inserts.push({ page_id: addModalPageId, shared_by: session!.user.id, shared_with_email: email.toLowerCase(), permission });
    });
    if (showEmailFallback && fallbackEmail.trim()) {
      inserts.push({ page_id: addModalPageId, shared_by: session!.user.id, shared_with_email: fallbackEmail.trim().toLowerCase(), permission: fallbackPermission });
    }
    if (inserts.length === 0) return;
    setIsAdding(true);
    const { error } = await supabase.from('page_shares').upsert(inserts, { onConflict: 'page_id,shared_with_email' });
    setIsAdding(false);
    if (error) {
      Alert.alert('Error', 'Failed to share page. Please try again.');
    } else {
      closeAddModal();
      loadAll();
    }
  };

  const openAddModal = (pageId: string) => {
    setAddModalPageId(pageId);
    setPendingShares({});
    setFallbackEmail('');
    setFallbackPermission('view');
    setShowEmailFallback(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddModalPageId(null);
    setPendingShares({});
    setFallbackEmail('');
    setFallbackPermission('view');
    setShowEmailFallback(false);
  };

  const setPendingPermission = (email: string, perm: 'none' | 'view' | 'edit') => {
    setPendingShares((prev) => {
      if (perm === 'none') {
        const next = { ...prev };
        delete next[email];
        return next;
      }
      return { ...prev, [email]: perm };
    });
  };

  const togglePageExpanded = (pageId: string) => {
    setExpandedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Team Sharing" showBackButton onBackPress={() => router.push('/(app)/business-settings' as any)} />
        <View style={styles.contentWrapper}>
          <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Team Sharing" showBackButton onBackPress={() => router.push('/(app)/business-settings' as any)} />
      <View style={styles.contentWrapper}>
        <ScrollView contentContainerStyle={styles.content}>

        {/* Team Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color="#000" />
            <Text style={styles.sectionTitle}>Team Members</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Share all your pages with a member, or manage access per page below.
          </Text>

          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-add-outline" size={36} color="#ccc" />
              <Text style={styles.emptyText}>No team members yet</Text>
              <Text style={styles.emptySubtext}>Add members in Business Settings first</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(app)/business-settings' as any)}
              >
                <Text style={styles.emptyButtonText}>Go to Business Settings</Text>
              </TouchableOpacity>
            </View>
          ) : (
            members.map((member) => {
              const email = getMemberEmail(member);
              const sharedCount = pages.filter((p) => isPageSharedWith(p.id, email)).length;
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person-outline" size={20} color="#666" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberEmail} numberOfLines={1}>{email}</Text>
                    <Text style={styles.memberMeta}>
                      {sharedCount} of {pages.length} pages shared
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.shareAllButton}
                    onPress={() => handleShareAll(member)}
                  >
                    <Ionicons name="share-outline" size={14} color="#007AFF" />
                    <Text style={styles.shareAllText}>Share All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Ionicons name="remove-circle-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Pages & Their Access */}
        {pages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color="#000" />
              <Text style={styles.sectionTitle}>Page Access</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Manage who has access to each individual page.
            </Text>

            {pages.map((page) => {
              const shares = sharesForPage(page.id);
              const isExpanded = expandedPageIds.has(page.id);
              return (
                <View key={page.id} style={styles.pageCard}>
                  <TouchableOpacity
                    style={styles.pageCardHeader}
                    onPress={() => togglePageExpanded(page.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pageCardInfo}>
                      <View style={[styles.pageStatusDot, { backgroundColor: page.is_published ? '#22C55E' : '#EF4444' }]} />
                      <Text style={styles.pageCardTitle} numberOfLines={1}>{page.title}</Text>
                    </View>
                    <View style={styles.pageCardRight}>
                      {shares.length > 0 && (
                        <View style={styles.shareBadge}>
                          <Text style={styles.shareBadgeText}>{shares.length}</Text>
                        </View>
                      )}
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#999"
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.pageCardBody}>
                      {shares.length === 0 ? (
                        <Text style={styles.noSharesText}>Not shared with anyone yet</Text>
                      ) : (
                        shares.map((share) => (
                          <View key={share.id} style={styles.shareRow}>
                            <Ionicons name="person-circle-outline" size={22} color="#999" />
                            <Text style={styles.shareEmail} numberOfLines={1}>{share.shared_with_email}</Text>
                            <TouchableOpacity
                              style={[
                                styles.permBadge,
                                share.permission === 'edit' ? styles.permEdit : styles.permView,
                              ]}
                              onPress={() => handleTogglePermission(share)}
                            >
                              <Text style={[
                                styles.permText,
                                share.permission === 'edit' ? styles.permEditText : styles.permViewText,
                              ]}>
                                {share.permission === 'edit' ? 'Editor' : 'View'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleRemoveShare(share.id)}>
                              <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}

                      <View style={styles.pageCardActions}>
                        <TouchableOpacity
                          style={styles.addPersonButton}
                          onPress={() => openAddModal(page.id)}
                        >
                          <Ionicons name="person-add-outline" size={14} color="#007AFF" />
                          <Text style={styles.addPersonText}>Add person</Text>
                        </TouchableOpacity>

                        {members.length > 0 && (
                          <TouchableOpacity
                            style={styles.shareAllPageButton}
                            onPress={async () => {
                              const unshared = members.filter(
                                (m) => !isPageSharedWith(page.id, getMemberEmail(m))
                              );
                              if (unshared.length === 0) {
                                Alert.alert('Already shared', 'All team members already have access to this page.');
                                return;
                              }
                              const doShare = async (permission: 'view' | 'edit') => {
                                const inserts = unshared.map((m) => ({
                                  page_id: page.id,
                                  shared_by: session!.user.id,
                                  shared_with_email: getMemberEmail(m).toLowerCase(),
                                  permission,
                                }));
                                await supabase.from('page_shares').upsert(inserts, { onConflict: 'page_id,shared_with_email' });
                                loadAll();
                              };
                              if (Platform.OS === 'ios') {
                                ActionSheetIOS.showActionSheetWithOptions(
                                  { title: 'Share with all team members', options: ['Cancel', 'View-only', 'Editor'], cancelButtonIndex: 0 },
                                  (idx) => { if (idx === 1) doShare('view'); if (idx === 2) doShare('edit'); }
                                );
                              } else {
                                Alert.alert('Share with all team members', 'Choose permission', [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'View-only', onPress: () => doShare('view') },
                                  { text: 'Editor', onPress: () => doShare('edit') },
                                ]);
                              }
                            }}
                          >
                            <Ionicons name="people-outline" size={14} color="#555" />
                            <Text style={styles.shareAllPageText}>Share with all members</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        </ScrollView>
      </View>

      {/* Add Person Modal — team-first */}
      <Modal visible={showAddModal} transparent animationType="slide" statusBarTranslucent onRequestClose={closeAddModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={StyleSheet.flatten([StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }])}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeAddModal} />

            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' }} />
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#000' }}>Share with Team</Text>
                <Text style={{ fontSize: 13, color: '#888', marginTop: 3 }}>
                  Select who should have access and their permission level.
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>

                {members.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
                    <Ionicons name="people-outline" size={32} color="#ddd" />
                    <Text style={{ fontSize: 14, color: '#aaa', textAlign: 'center' }}>No team members yet.</Text>
                    <Text style={{ fontSize: 12, color: '#bbb', textAlign: 'center' }}>Add people in Business Settings first.</Text>
                  </View>
                ) : (
                  members.map((m) => {
                    const email = getMemberEmail(m);
                    const alreadyShared = addModalPageId ? pageShares.some(s => s.page_id === addModalPageId && s.shared_with_email.toLowerCase() === email.toLowerCase()) : false;
                    const isSelected = email in pendingShares;
                    const perm = pendingShares[email];

                    if (alreadyShared) return (
                      <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10, opacity: 0.4 }}>
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="checkmark" size={18} color="#22C55E" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, color: '#555' }} numberOfLines={1}>{email}</Text>
                        <Text style={{ fontSize: 12, color: '#999' }}>Already shared</Text>
                      </View>
                    );

                    return (
                      <View
                        key={m.id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 }}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="person-outline" size={17} color="#666" />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: '#111' }} numberOfLines={1}>{email}</Text>

                        <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0' }}>
                          <TouchableOpacity
                            style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: !isSelected ? '#f5f5f5' : '#fff' }}
                            onPress={() => setPendingPermission(email, 'none')}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '600', color: !isSelected ? '#222' : '#777' }}>No</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: perm === 'view' ? '#000' : '#fff' }}
                            onPress={() => setPendingPermission(email, 'view')}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '600', color: perm === 'view' ? '#fff' : '#555' }}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: perm === 'edit' ? '#E65100' : '#fff' }}
                            onPress={() => setPendingPermission(email, 'edit')}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '600', color: perm === 'edit' ? '#fff' : '#555' }}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}

                {Object.values(pendingShares).some(p => p === 'edit') && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, marginTop: 12 }}>
                    <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 }}>
                      Editor access lets someone modify this page's content. Only grant this to trusted team members.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}
                  onPress={() => setShowEmailFallback(v => !v)}
                >
                  <Ionicons name={showEmailFallback ? 'chevron-down' : 'chevron-forward'} size={14} color="#888" />
                  <Text style={{ fontSize: 13, color: '#888' }}>Share with someone not on your team</Text>
                </TouchableOpacity>

                {showEmailFallback && (
                  <View style={{ marginTop: 10, gap: 10, paddingBottom: 6 }}>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#000' }}
                      value={fallbackEmail}
                      onChangeText={setFallbackEmail}
                      placeholder="email@example.com"
                      placeholderTextColor="#bbb"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e0e0e0', alignSelf: 'flex-start' }}>
                      {(['view', 'edit'] as const).map((perm) => (
                        <TouchableOpacity
                          key={perm}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: fallbackPermission === perm ? (perm === 'edit' ? '#E65100' : '#000') : '#fff' }}
                          onPress={() => setFallbackPermission(perm)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: fallbackPermission === perm ? '#fff' : '#555' }}>
                            {perm === 'view' ? 'View' : 'Edit'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' }}
                  onPress={closeAddModal}
                >
                  <Text style={{ fontSize: 15, color: '#555', fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: '#000', alignItems: 'center', opacity: (Object.keys(pendingShares).length === 0 && !(showEmailFallback && fallbackEmail.trim())) || isAdding ? 0.4 : 1 }}
                  onPress={handleAddPerson}
                  disabled={(Object.keys(pendingShares).length === 0 && !(showEmailFallback && fallbackEmail.trim())) || isAdding}
                >
                  {isAdding
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontSize: 15, color: '#fff', fontWeight: '600' }}>
                        {Object.keys(pendingShares).length > 0 ? `Share with ${Object.keys(pendingShares).length} member${Object.keys(pendingShares).length > 1 ? 's' : ''}` : 'Share'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  contentWrapper: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 60 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  sectionSubtitle: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 15, color: '#999', fontWeight: '500', marginTop: 4 },
  emptySubtext: { fontSize: 13, color: '#bbb', textAlign: 'center' },
  emptyButton: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#007AFF',
  },
  emptyButtonText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  memberInfo: { flex: 1 },
  memberEmail: { fontSize: 14, fontWeight: '500', color: '#222' },
  memberMeta: { fontSize: 12, color: '#999', marginTop: 1 },
  shareAllButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#F0F8FF',
  },
  shareAllText: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  removeButton: { padding: 4 },
  pageCard: {
    borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 10,
    marginBottom: 10, overflow: 'hidden',
  },
  pageCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fafafa',
  },
  pageCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pageStatusDot: { width: 8, height: 8, borderRadius: 4 },
  pageCardTitle: { fontSize: 14, fontWeight: '600', color: '#222', flex: 1 },
  pageCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareBadge: {
    backgroundColor: '#6366F1', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  shareBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  pageCardBody: { padding: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  noSharesText: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginBottom: 10 },
  shareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  shareEmail: { flex: 1, fontSize: 13, color: '#333' },
  permBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  permView: { backgroundColor: '#EEF5FF' },
  permEdit: { backgroundColor: '#FFF3E0' },
  permText: { fontSize: 11, fontWeight: '600' },
  permViewText: { color: '#007AFF' },
  permEditText: { color: '#E65100' },
  pageCardActions: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  addPersonButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#F0F8FF',
  },
  addPersonText: { fontSize: 12, color: '#007AFF', fontWeight: '500' },
  shareAllPageButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  shareAllPageText: { fontSize: 12, color: '#555', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  emailInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#000', marginBottom: 14,
  },
  permLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  permToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  permToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9',
  },
  permToggleActive: { backgroundColor: '#000', borderColor: '#000' },
  permToggleBtnText: { fontSize: 14, fontWeight: '500', color: '#555' },
  permToggleActiveText: { color: '#fff' },
  memberPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5',
  },
  memberPickEmail: { flex: 1, fontSize: 14, color: '#333' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: '#555', fontWeight: '500' },
  confirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#000', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
