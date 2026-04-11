import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../../contexts/AuthContext";
import { useSubscription } from "../../../contexts/SubscriptionContext";
import { useBusinessCheck } from "../../../hooks/useBusinessCheck";
import { Business, Page } from "../../../types/page-builder.types";
import { getPublicStorageUrl, supabase } from "../../../utils/supabase";
import ShareOptionsModal from "../../../components/common/ShareOptionsModal";

type PageWithShare = Page & {
  sharedPermission?: 'view' | 'edit';
  shareRowId?: string;
};

const { width } = Dimensions.get("window");

export default function MyPagesScreen() {
  const { session } = useAuth();
  const { hasExpiredTrial, hasProAccess } = useSubscription();
  
  // CRITICAL: Check for businesses on mount - redirect if none exist
  const { isChecking: isCheckingBusinesses } = useBusinessCheck({
    redirectOnNoBusinesses: true,
    checkOnMount: true,
  });
  
  const [pages, setPages] = useState<PageWithShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null
  );
  const [showBusinessFilter, setShowBusinessFilter] = useState(false);
  const [collapsedBusinessIds, setCollapsedBusinessIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [shareModalPage, setShareModalPage] = useState<PageWithShare | null>(null);

  // Load persisted view mode on first mount
  useEffect(() => {
    AsyncStorage.getItem('pages_view_mode').then((saved) => {
      if (saved === 'list' || saved === 'card') setViewMode(saved);
    });
  }, []);

  const handleSetViewMode = useCallback((mode: 'card' | 'list') => {
    setViewMode(mode);
    AsyncStorage.setItem('pages_view_mode', mode);
  }, []);
  // In list view, track which business folders are collapsed
  const [listCollapsedIds, setListCollapsedIds] = useState<Set<string>>(new Set());

  // Filter pages based on selected business
  const filteredPages = useMemo(() => {
    if (!selectedBusinessId) return pages;
    return pages.filter((page) => page.business_id === selectedBusinessId);
  }, [pages, selectedBusinessId]);

  // Get the selected business name for display
  const selectedBusinessName = useMemo(() => {
    if (!selectedBusinessId) return "All businesses";
    const business = businesses.find((b) => b.id === selectedBusinessId);
    return business?.name || "All businesses";
  }, [selectedBusinessId, businesses]);

  const fetchBusinesses = useCallback(async () => {
    try {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") throw error;

      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  }, [session?.user?.id]);

  const fetchPages = useCallback(async () => {
    try {
      if (!session?.user?.id) return;

      const userEmail = session.user.email ?? '';

      // Fetch own pages
      const { data: ownPages, error: ownError } = await supabase
        .from("pages")
        .select(`*, business:businesses(*)`)
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });
      if (ownError) throw ownError;

      // Fetch page_shares rows where this user is the recipient
      const { data: shareRows } = await supabase
        .from("page_shares")
        .select("page_id, permission, id")
        .or(`shared_with_user_id.eq.${session.user.id},shared_with_email.eq.${userEmail.toLowerCase()}`);

      let sharedPages: PageWithShare[] = [];
      if (shareRows && shareRows.length > 0) {
        const sharedPageIds = shareRows.map((r) => r.page_id);
        const { data: sharedData } = await supabase
          .from("pages")
          .select(`*, business:businesses(*)`)
          .in("id", sharedPageIds)
          .order("created_at", { ascending: false });

        sharedPages = (sharedData || []).map((page) => {
          const share = shareRows.find((r) => r.page_id === page.id);
          return {
            ...page,
            sharedPermission: (share?.permission ?? 'view') as 'view' | 'edit',
            shareRowId: share?.id,
          };
        });
      }

      setPages([...(ownPages || []), ...sharedPages]);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchBusinesses();
      fetchPages();
    }, [fetchBusinesses, fetchPages])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPages();
    fetchBusinesses();
  };

  const handleCreatePage = async () => {
    // Check if user is inactive (expired trial)
    if (hasExpiredTrial) {
      Alert.alert(
        "Account Inactive",
        "Your free trial has expired. Upgrade to Crown Pages Pro to create new pages.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/(app)/plans"),
          },
        ]
      );
      return;
    }

    // Check if user has Pro access for creating pages
    if (!hasProAccess) {
      Alert.alert(
        "Pro Plan Required",
        "Upgrade to Crown Pages Pro to create new pages.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => router.push("/(app)/plans"),
          },
        ]
      );
      return;
    }

    // Redirect to business setup if no business exists
    if (businesses.length === 0) {
      Alert.alert(
        "Set Up Your Business",
        "Before creating pages, you need to set up your business profile.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: () => router.push("/(app)/business-setup"),
          },
        ]
      );
      return;
    } else if (businesses.length === 1) {
      // Navigate directly to create page with the business ID
      router.push({
        pathname: "/(app)/create-page",
        params: { businessId: businesses[0].id },
      });
    } else {
      // Show business selector (shouldn't happen in single business mode)
      setShowBusinessSelector(true);
    }
  };

  const handleBusinessSelect = (business: Business) => {
    setShowBusinessSelector(false);
    router.push({
      pathname: "/(app)/create-page",
      params: { businessId: business.id },
    });
  };

  const handleBusinessFilter = (businessId: string | null) => {
    setSelectedBusinessId(businessId);
    setShowBusinessFilter(false);
  };

  const handleEditPage = (pageId: string) => {
    router.push({
      pathname: "/(app)/page-editor/[id]",
      params: { id: pageId },
    });
  };

  const handlePageAnalytics = (pageId: string) => {
    router.push({
      pathname: "/(app)/page-analytics/[id]",
      params: { id: pageId },
    });
  };

  const handleSharePage = (page: PageWithShare) => {
    setShareModalPage(page);
  };

  const handleDeletePage = (page: Page) => {
    Alert.alert(
      "Delete Page",
      `Are you sure you want to delete "${page.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("pages")
                .delete()
                .eq("id", page.id);

              if (error) throw error;

              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Page deleted successfully",
              });

              fetchPages();
            } catch (error) {
              console.error("Error deleting page:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete page",
              });
            }
          },
        },
      ]
    );
  };

  const handleDuplicatePage = async (page: Page) => {
    try {
      const newPage = {
        ...page,
        title: `${page.title} (Copy)`,
        slug: `${page.slug}-copy-${Date.now()}`,
        id: undefined,
        created_at: undefined,
        updated_at: undefined,
        view_count: 0,
        share_count: 0,
        save_count: 0,
        unique_view_count: 0,
        is_published: false,
        published_at: null,
      };

      const { error } = await supabase.from("pages").insert([newPage]);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Page duplicated successfully",
      });

      fetchPages();
    } catch (error) {
      console.error("Error duplicating page:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to duplicate page",
      });
    }
  };

  const toggleBusinessFolder = (businessId: string) => {
    setCollapsedBusinessIds((prev) => {
      const next = new Set(prev);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      return next;
    });
  };

  const toggleListFolder = (folderId: string) => {
    setListCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const getPageImageUrl = (item: PageWithShare): string | null => {
    if (item.og_image_url && getPublicStorageUrl(item.og_image_url)) {
      return getPublicStorageUrl(item.og_image_url)!;
    }
    if (item.content) {
      const content = item.content as { sections?: Array<{ type: string; data: any }> };
      if (content?.sections) {
        const heroSection = content.sections.find(s => s.type === 'hero');
        if (heroSection?.data) {
          const heroImage = heroSection.data.backgroundImage || heroSection.data.heroImage;
          if (heroImage) return getPublicStorageUrl(heroImage) ?? null;
        }
      }
    }
    return null;
  };

  const renderListRow = (item: PageWithShare) => {
    const isSharedPage = item.created_by !== session?.user?.id;
    const canEdit = !isSharedPage || item.sharedPermission === 'edit';
    const imageUrl = getPageImageUrl(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={listStyles.row}
        onPress={() => router.push({ pathname: "/(app)/page-options/[id]", params: { id: item.id } })}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={[listStyles.thumb, !imageUrl && listStyles.thumbDark]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={listStyles.thumbImg} />
          ) : (
            <Image
              source={require("../../../assets/images/logo/crown only w.png")}
              style={listStyles.thumbLogo}
              resizeMode="contain"
            />
          )}
          <View style={[listStyles.statusDot, { backgroundColor: item.is_published ? "#22C55E" : "#EF4444" }]} />
        </View>

        {/* Title + meta */}
        <View style={listStyles.rowInfo}>
          <Text style={listStyles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={listStyles.rowMeta} numberOfLines={1}>
            {item.view_count ?? 0} views
            {isSharedPage ? `  ·  ${item.sharedPermission === 'edit' ? 'Editor' : 'View-only'}` : ''}
          </Text>
        </View>

        {/* Quick actions */}
        <View style={listStyles.rowActions}>
          {canEdit && (
            <TouchableOpacity
              style={listStyles.rowActionBtn}
              onPress={(e) => { e.stopPropagation(); handleEditPage(item.id); }}
            >
              <Ionicons name="create-outline" size={17} color="#333" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={listStyles.rowActionBtn}
            onPress={(e) => {
              e.stopPropagation();
              const rootUrl = (process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com").replace(/\/$/, "");
              Linking.openURL(`${rootUrl}/${item.business?.slug || "business"}/${item.slug || ""}?preview=true`);
            }}
          >
            <Ionicons name="eye-outline" size={17} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={listStyles.rowActionBtn}
            onPress={(e) => { e.stopPropagation(); handleSharePage(item); }}
          >
            <Ionicons name="share-outline" size={17} color="#333" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Build grouped list-view data: group all pages (owned + shared) by business
  const buildListGroups = () => {
    const groups: Record<string, { id: string; name: string; isShared: boolean; pages: PageWithShare[] }> = {};
    for (const page of filteredPages) {
      const bizId = page.business_id;
      const bizName = page.business?.name || 'Unknown Business';
      const isShared = page.created_by !== session?.user?.id;
      if (!groups[bizId]) groups[bizId] = { id: bizId, name: bizName, isShared, pages: [] };
      groups[bizId].pages.push(page);
    }
    return Object.values(groups).sort((a, b) => {
      // Own businesses first, shared after
      if (a.isShared !== b.isShared) return a.isShared ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  };

  const renderPageItem = ({ item }: { item: PageWithShare }) => {
    const isSharedPage = item.created_by !== session?.user?.id;
    const canEdit = !isSharedPage || item.sharedPermission === 'edit';

    // Determine image to display with priority: OG image > Hero image > Crown logo
    let imageUrl: string | null = null;
    
    // Priority 1: OG image
    if (item.og_image_url && getPublicStorageUrl(item.og_image_url)) {
      imageUrl = getPublicStorageUrl(item.og_image_url)!;
    } 
    // Priority 2: Hero image from sections
    else if (item.content) {
      const content = item.content as { sections?: Array<{ type: string; data: any }> };
      if (content?.sections) {
        const heroSection = content.sections.find(s => s.type === 'hero');
        if (heroSection?.data) {
          const heroImage = heroSection.data.backgroundImage || heroSection.data.heroImage;
          if (heroImage) {
            const heroImageUrl = getPublicStorageUrl(heroImage);
            if (heroImageUrl) {
              imageUrl = heroImageUrl;
            }
          }
        }
      }
    }
    // Priority 3: Crown logo (default fallback)

    return (
      <TouchableOpacity
        style={styles.pageCard}
        onPress={() =>
          router.push({
            pathname: "/(app)/page-options/[id]",
            params: { id: item.id },
          })
        }
      >
        {/* Page Image/Logo */}
        <View
          style={[
            styles.pageImageContainer,
            !imageUrl && styles.logoBackground,
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.pageImage}
            />
          ) : (
            <Image
              source={require("../../../assets/images/logo/crown only w.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          )}

          {/* Published Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.is_published ? "#22C55E" : "#EF4444" },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_published ? "Live" : "Draft"}
            </Text>
          </View>

          {/* Shared badge — shown when the page is owned by a teammate */}
          {isSharedPage && (
            <View style={styles.sharedBadge}>
              <Ionicons name="people-outline" size={10} color="#fff" />
              <Text style={styles.sharedBadgeText}>Shared</Text>
            </View>
          )}
        </View>

        {/* Page Content */}
        <View style={styles.pageContent}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() =>
                router.push({
                  pathname: "/(app)/page-options/[id]",
                  params: { id: item.id },
                })
              }
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageDescription} numberOfLines={2}>
            {item.description || "No description added yet"}
          </Text>

          {/* Page Stats */}
          <View style={styles.pageStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color="#666" />
              <Text style={styles.statText}>{item.view_count ?? 0} views</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.statText}>
                {item.business?.name || "No business"}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionButton, isSharedPage ? styles.secondaryAction : styles.primaryAction]}
                onPress={() => handleEditPage(item.id)}
              >
                <Ionicons name="create-outline" size={16} color={isSharedPage ? "#333" : "#fff"} />
                <Text
                  style={isSharedPage ? styles.secondaryActionText : styles.primaryActionText}
                  adjustsFontSizeToFit={true}
                  numberOfLines={1}
                  minimumFontScale={0.8}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => {
                const rootUrl = (
                  process.env.EXPO_PUBLIC_PAGES_ROOT_URL || "https://crownpages.com"
                ).replace(/\/$/, "");
                const businessSlug = item.business?.slug || "business";
                const pageSlug = item.slug || "";
                const finalUrl = `${rootUrl}/${businessSlug}/${pageSlug}?preview=true`;
                Linking.openURL(finalUrl);
              }}
            >
              <Ionicons name="eye-outline" size={16} color="#333" />
              <Text
                style={styles.secondaryActionText}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                minimumFontScale={0.8}
              >
                View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => handlePageAnalytics(item.id)}
            >
              <Ionicons name="analytics-outline" size={16} color="#333" />
              <Text
                style={styles.secondaryActionText}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                minimumFontScale={0.8}
              >
                Stats
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() => handleSharePage(item)}
            >
              <Ionicons name="share-outline" size={16} color="#333" />
              <Text
                style={styles.secondaryActionText}
                adjustsFontSizeToFit={true}
                numberOfLines={1}
                minimumFontScale={0.8}
              >
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBusinessItem = ({ item }: { item: Business }) => (
    <TouchableOpacity
      style={styles.businessItem}
      onPress={() => handleBusinessSelect(item)}
    >
      <View style={styles.businessInfo}>
        <Text style={styles.businessName}>{item.name}</Text>
        <Text style={styles.businessEmail}>{item.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderBusinessFilterItem = ({
    item,
  }: {
    item: Business | { id: null; name: string };
  }) => (
    <TouchableOpacity
      style={[
        styles.businessFilterItem,
        selectedBusinessId === item.id && styles.selectedBusinessFilterItem,
      ]}
      onPress={() => handleBusinessFilter(item.id)}
    >
      <Text
        style={[
          styles.businessFilterName,
          selectedBusinessId === item.id && styles.selectedBusinessFilterName,
        ]}
      >
        {item.name}
      </Text>
      {selectedBusinessId === item.id && (
        <Ionicons name="checkmark" size={20} color="#000" />
      )}
    </TouchableOpacity>
  );

  if (isCheckingBusinesses || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Create filter data with "All businesses" option
  const businessFilterData = [
    { id: null, name: "All businesses" },
    ...businesses,
  ];

  // Split pages into owned vs. shared
  const myPages = filteredPages.filter((p) => p.created_by === session?.user?.id);
  const sharedPages = filteredPages.filter((p) => p.created_by !== session?.user?.id) as PageWithShare[];

  // Group shared pages by business
  const sharedByBusiness = sharedPages.reduce<Record<string, { name: string; pages: PageWithShare[] }>>((acc, page) => {
    const bizId = page.business_id;
    const bizName = page.business?.name || 'Unknown Business';
    if (!acc[bizId]) acc[bizId] = { name: bizName, pages: [] };
    acc[bizId].pages.push(page);
    return acc;
  }, {});
  const sharedBusinessGroups = Object.entries(sharedByBusiness);

  return (
    <View style={styles.container}>
      {/* Top bar: business filter + view toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => setShowBusinessFilter(true)}
        >
          <Text style={styles.filterText}>{selectedBusinessName}</Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'card' && styles.viewToggleBtnActive]}
            onPress={() => handleSetViewMode('card')}
          >
            <Ionicons name="grid-outline" size={18} color={viewMode === 'card' ? '#000' : '#888'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => handleSetViewMode('list')}
          >
            <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? '#000' : '#888'} />
          </TouchableOpacity>
        </View>
      </View>

      {filteredPages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No pages yet</Text>
          <Text style={styles.emptyDescription}>
            Create your first page to share with the world
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePage}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Page</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'card' ? (
        <>
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={["#000"]}
              />
            }
          >
            {/* My Pages section */}
            {myPages.length > 0 && (
              <>
                {sharedPages.length > 0 && (
                  <Text style={styles.sectionHeader}>My Pages</Text>
                )}
                {myPages.map((page) => (
                  <View key={page.id}>
                    {renderPageItem({ item: page })}
                  </View>
                ))}
              </>
            )}

            {/* Shared With Me section */}
            {sharedPages.length > 0 && (
              <>
                <View style={styles.sharedSectionHeader}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.sectionHeader}>Shared With Me</Text>
                </View>
                {sharedBusinessGroups.length === 1
                  ? sharedPages.map((page) => (
                      <View key={page.id}>
                        {renderPageItem({ item: page })}
                      </View>
                    ))
                  : sharedBusinessGroups.map(([bizId, group]) => {
                      const isCollapsed = collapsedBusinessIds.has(bizId);
                      return (
                        <View key={bizId}>
                          <TouchableOpacity
                            style={styles.businessFolder}
                            onPress={() => toggleBusinessFolder(bizId)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={isCollapsed ? "chevron-forward" : "chevron-down"}
                              size={16}
                              color="#555"
                            />
                            <Text style={styles.businessFolderName}>{group.name}</Text>
                            <View style={styles.businessFolderBadge}>
                              <Text style={styles.businessFolderCount}>{group.pages.length}</Text>
                            </View>
                          </TouchableOpacity>
                          {!isCollapsed && group.pages.map((page) => (
                            <View key={page.id}>
                              {renderPageItem({ item: page })}
                            </View>
                          ))}
                        </View>
                      );
                    })}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleCreatePage}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        /* ── LIST VIEW ── */
        <>
          <ScrollView
            contentContainerStyle={listStyles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={["#000"]}
              />
            }
          >
            {buildListGroups().map((group) => {
              const isCollapsed = listCollapsedIds.has(group.id);
              return (
                <View key={group.id} style={listStyles.folder}>
                  {/* Folder header */}
                  <TouchableOpacity
                    style={listStyles.folderHeader}
                    onPress={() => toggleListFolder(group.id)}
                    activeOpacity={0.7}
                  >
                    <View style={listStyles.folderIconWrap}>
                      <Ionicons
                        name={isCollapsed ? "folder-outline" : "folder-open-outline"}
                        size={20}
                        color={group.isShared ? "#6366F1" : "#000"}
                      />
                    </View>
                    <View style={listStyles.folderInfo}>
                      <Text style={listStyles.folderName} numberOfLines={1}>{group.name}</Text>
                      {group.isShared && (
                        <Text style={listStyles.folderSharedTag}>Shared</Text>
                      )}
                    </View>
                    <View style={listStyles.folderBadge}>
                      <Text style={listStyles.folderCount}>{group.pages.length}</Text>
                    </View>
                    <Ionicons
                      name={isCollapsed ? "chevron-forward" : "chevron-down"}
                      size={16}
                      color="#aaa"
                    />
                  </TouchableOpacity>

                  {/* Pages inside folder */}
                  {!isCollapsed && (
                    <View style={listStyles.folderPages}>
                      {group.pages.map((page, idx) => (
                        <View
                          key={page.id}
                          style={idx < group.pages.length - 1 ? listStyles.rowDivider : undefined}
                        >
                          {renderListRow(page)}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleCreatePage}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Business Selector Modal */}
      <Modal
        visible={showBusinessSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBusinessSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business</Text>
              <TouchableOpacity onPress={() => setShowBusinessSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Which business would you like to create a page for?
            </Text>
            <FlatList
              data={businesses}
              renderItem={renderBusinessItem}
              keyExtractor={(item) => item.id}
              style={styles.businessList}
            />
          </View>
        </View>
      </Modal>

      {/* Business Filter Modal */}
      <Modal
        visible={showBusinessFilter}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBusinessFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Business</Text>
              <TouchableOpacity onPress={() => setShowBusinessFilter(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={businessFilterData}
              renderItem={renderBusinessFilterItem}
              keyExtractor={(item) => item.id || "all"}
              style={styles.businessList}
            />
          </View>
        </View>
      </Modal>

      {shareModalPage && (
        <ShareOptionsModal
          visible={!!shareModalPage}
          pageUrl={`https://crownpages.com/${shareModalPage.business?.slug || ''}/${shareModalPage.slug}`}
          pageId={shareModalPage.id}
          businessSlug={shareModalPage.business?.slug || ''}
          pageSlug={shareModalPage.slug || ''}
          onClose={() => setShareModalPage(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#000",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    marginTop: 4,
  },
  sharedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    marginBottom: 12,
  },
  businessFolder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  businessFolderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  businessFolderBadge: {
    backgroundColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  businessFolderCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  pageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pageImageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  logoBackground: {
    backgroundColor: "#000",
  },
  pageImage: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  sharedBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#6366F1",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  sharedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  pageContent: {
    padding: 16,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  moreButton: {
    padding: 8,
  },
  pageDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  pageStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#666",
  },
  quickActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 3,
    minWidth: 0, // Allow flex shrinking
  },
  primaryAction: {
    backgroundColor: "#000",
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  secondaryAction: {
    backgroundColor: "#f5f5f5",
  },
  secondaryActionText: {
    color: "#333",
    fontSize: 11,
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "80%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  businessItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  businessEmail: {
    fontSize: 14,
    color: "#666",
  },
  businessList: {
    maxHeight: 200,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  viewToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  viewToggleBtnActive: {
    backgroundColor: "#f0f0f0",
  },
  businessFilterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedBusinessFilterItem: {
    backgroundColor: "#f0f0f0",
  },
  businessFilterName: {
    fontSize: 16,
    color: "#333",
  },
  selectedBusinessFilterName: {
    fontWeight: "600",
    color: "#000",
  },
});

const listStyles = StyleSheet.create({
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  folder: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  folderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  folderInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  folderName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  folderSharedTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6366F1",
    backgroundColor: "#EEF0FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  folderBadge: {
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 2,
  },
  folderCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
  },
  folderPages: {
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  thumbDark: {
    backgroundColor: "#111",
  },
  thumbImg: {
    width: 48,
    height: 48,
  },
  thumbLogo: {
    width: 26,
    height: 26,
  },
  statusDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fff",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  rowMeta: {
    fontSize: 12,
    color: "#888",
  },
  rowActions: {
    flexDirection: "row",
    gap: 2,
  },
  rowActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
});
