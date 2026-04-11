import { Ionicons } from '@expo/vector-icons';
import { setStringAsync } from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../../contexts/AuthContext';
import { Database } from '../../../database.types';
import { parseCrownPagesUrl } from '../../../utils/linkHandler';
import { supabase } from '../../../utils/supabase';

type WalletFolder = Database['public']['Tables']['wallet_folders']['Row'];
type Page = Database['public']['Tables']['pages']['Row'] & {
    business: Database['public']['Tables']['businesses']['Row'];
};

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

export default function PageViewerScreen() {
    const { session } = useAuth();
    const params = useLocalSearchParams();
    const [pageData, setPageData] = useState<Page | null>(null);
    const [contentError, setContentError] = useState<string | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [walletFolders, setWalletFolders] = useState<WalletFolder[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastInterceptTsRef = useRef<number>(0);
    const hasRetriedRef = useRef<boolean>(false);
    const pageDataFetchedRef = useRef<boolean>(false);

    // Check if this is an ID-based route
    const isIdRoute = useMemo(() => {
        const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);
        return urlParts.length >= 2 && urlParts[0] === 'id';
    }, [params.url]);

    const pageId = useMemo(() => {
        if (isIdRoute) {
            const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);
            return urlParts[1]; // The page ID is the second part
        }
        return null;
    }, [params.url, isIdRoute]);

    // Memoize the URL construction to prevent re-renders
    const viewUrl = useMemo(() => {
        const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);

        if (!urlParts.length) {
            console.error('No URL parts provided');
            return null;
        }

        // Determine if we should use preview mode
        const shouldUsePreview = params.preview === 'true' || 
            (pageData && session?.user?.id === pageData.created_by); // Auto-preview for own pages

        // For ID-based routes, we need to fetch the page data first to construct the URL
        if (isIdRoute && pageData) {
            const rootUrl = (
                process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com'
            ).replace(/\/$/, '');
            
            const business = pageData.business as any;
            const businessSlug = business?.slug;
            const pageSlug = pageData.slug;
            
            if (businessSlug && pageSlug) {
                let finalUrl = `${rootUrl}/${businessSlug}/${pageSlug}`;
                // Add preview parameter to avoid inflating analytics
                if (shouldUsePreview) {
                    finalUrl += '?preview=true';
                }
                return finalUrl;
            }
            return null;
        }

        // For regular slug-based routes
        const rootUrl = (
            process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com'
        ).replace(/\/$/, '');

        const fullPath = urlParts.join('/');
        let finalUrl = `${rootUrl}/${fullPath}`;

        // Add preview parameter if specified or for own pages
        if (shouldUsePreview) {
            finalUrl += '?preview=true';
        }

        return finalUrl;
    }, [params.url, params.preview, isIdRoute, pageData, session?.user?.id]);

    // Check if this is a legal page (terms, privacy, etc.) that shouldn't have wallet functionality
    const isLegalPage = useMemo(() => {
        const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);
        const fullPath = urlParts.join('/');

        const legalPaths = [
            'terms-of-service',
            'privacy-policy',
            'support',
            'contact',
            'about'
        ];

        return legalPaths.some(path => fullPath === path || fullPath.startsWith(path + '/'));
    }, [params.url]);

    // Memoized URL for browser sharing (without preview parameter)
    const browserUrl = useMemo(() => {
        const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);

        if (!urlParts.length) {
            return null;
        }

        const rootUrl = (
            process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com'
        ).replace(/\/$/, '');

        const fullPath = urlParts.join('/');
        return `${rootUrl}/${fullPath}`;
    }, [params.url]);

    // Memoize the URL parsing to prevent re-renders
    const parsedUrl = useMemo(() => {
        if (!viewUrl) return null;
        return parseCrownPagesUrl(viewUrl);
    }, [viewUrl]);

    // Check if user is viewing their own page
    const isOwnPage = useMemo(() => {
        return pageData && session?.user?.id === pageData.created_by;
    }, [pageData, session?.user?.id]);

    // Simple loading state management
    useEffect(() => {
        // Reset states when route params change
        setContentError(null);
        setInitialLoadComplete(false);
        hasRetriedRef.current = false;
        setReloadKey(0);
        
        // Clear any existing timeout
        if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
        }
    }, [params.url, params.preview]);

    // Separate effect for fetching page data (only once per page ID/URL change)
    useEffect(() => {
        const fetchPageData = async () => {
            // Reset fetch flag when page changes
            pageDataFetchedRef.current = false;
            setPageData(null);
            setIsSaved(false);
            
            const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);
            if (!urlParts.length) return;

            // Prevent multiple fetches for the same page
            if (pageDataFetchedRef.current) return;
            pageDataFetchedRef.current = true;

            try {
                if (isIdRoute && pageId) {
                    console.log('Fetching page data by ID:', pageId);
                    
                    let query = supabase
                        .from('pages')
                        .select('*, business:businesses(*)')
                        .eq('id', pageId)
                        .eq('is_active', true);
                    
                    if (params.preview !== 'true') {
                        query = query.eq('is_published', true);
                    }
                    
                    const { data: page, error } = await query.maybeSingle();

                    if (error) {
                        console.error('Error fetching page by ID:', error);
                        setContentError('Failed to load page data');
                        return;
                    } 
                    
                    if (!page) {
                        console.warn('Page not found with ID:', pageId);
                        setContentError('Page not found');
                        return;
                    }

                    const business = page.business as any;
                    console.log('Found page by ID:', page.title, 'business:', business?.slug);
                    setPageData(page);

                    // Check if saved
                    if (session?.user?.id) {
                        const { data: savedData } = await supabase
                            .from('wallet_items')
                            .select('id')
                            .eq('user_id', session.user.id)
                            .eq('page_id', page.id)
                            .maybeSingle();

                        setIsSaved(!!savedData);
                        console.log('Page save status:', !!savedData);
                    }
                } else {
                    // Handle regular slug-based routes
                    const urlParts = Array.isArray(params.url) ? params.url : [params.url].filter(Boolean);
                    if (urlParts.length >= 2) {
                        const businessSlug = urlParts[0];
                        const pageSlug = urlParts[1];
                        console.log('Fetching page data for:', businessSlug, '/', pageSlug);
                        
                        // First get the business ID
                        const { data: business, error: businessError } = await supabase
                            .from('businesses')
                            .select('id')
                            .eq('slug', businessSlug)
                            .single();
                        
                        if (businessError || !business) {
                            console.error('Business not found:', businessSlug, businessError);
                            return;
                        }
                        
                        // Then get the page for that specific business
                        let query = supabase
                            .from('pages')
                            .select('*, business:businesses(*)')
                            .eq('slug', pageSlug)
                            .eq('business_id', business.id)
                            .eq('is_active', true);
                        
                        // For slug routes, only filter by published if not in preview mode
                        if (params.preview !== 'true') {
                            query = query.eq('is_published', true);
                        }

                        const { data: page, error } = await query.maybeSingle();

                        if (error) {
                            console.error('Error fetching page:', error);
                        } else if (page) {
                            const businessData = page.business as any;
                            console.log('Found page:', page.title, 'business:', businessData?.slug);
                            setPageData(page);

                            // Check if saved
                            if (session?.user?.id) {
                                const { data: savedData } = await supabase
                                    .from('wallet_items')
                                    .select('id')
                                    .eq('user_id', session.user.id)
                                    .eq('page_id', page.id)
                                    .maybeSingle();

                                setIsSaved(!!savedData);
                                console.log('Page save status:', !!savedData);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching page data:', error);
                setContentError('Failed to load page data');
            }
        };

        fetchPageData();
    }, [isIdRoute, pageId, params.preview, session?.user?.id]);

    // Fetch wallet folders when user session is available
    useEffect(() => {
        const fetchWalletFolders = async () => {
            if (!session?.user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('wallet_folders')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('is_default', { ascending: false })
                    .order('name');

                if (!error) {
                    setWalletFolders(data || []);
                }
            } catch (error) {
                console.error('Error fetching wallet folders:', error);
            }
        };

        fetchWalletFolders();
    }, [session?.user?.id]);

    const handleBackPress = () => {
        // This will take the user back to where they came from
        router.back();
    };

    const handleWalletPress = () => {
        if (!session?.user?.id) {
            Alert.alert('Error', 'Please log in to save pages');
            return;
        }

        // If pageData is not available but we have a valid Crown Pages URL, try to save via URL
        if (!pageData && parsedUrl?.isValid && parsedUrl.pageSlug) {
            Alert.alert(
                'Save Page',
                'Would you like to save this Crown Pages link to your wallet?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Save', onPress: () => savePageViaUrl() },
                ]
            );
            return;
        }

        if (!pageData) {
            Alert.alert('Error', 'Page information not available');
            return;
        }

        if (isSaved) {
            // Show confirm removal dialog
            Alert.alert(
                'Remove from Wallet',
                'Remove this page from your Crown Pages wallet?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: removeFromWallet },
                ]
            );
        } else {
            // Show save dialog
            setShowSaveModal(true);
        }
    };

    const savePageViaUrl = async () => {
        if (!parsedUrl?.isValid || !session?.user?.id) return;

        try {
            const { saveToWallet } = require('../../../utils/linkHandler');
            const success = await saveToWallet(viewUrl || '', session.user.id, { showSuccess: true });
            
            if (success) {
                // Refresh page data after successful save
                setTimeout(() => {
                    setContentError(null);
                }, 1000);
            }
        } catch (error) {
            console.error('Error saving page via URL:', error);
            Alert.alert('Error', 'Failed to save page to wallet.');
        }
    };

    const handleOpenInBrowser = async () => {
        if (!browserUrl) {
            Alert.alert('Error', 'Page URL not available');
            return;
        }

        try {
            // Try to open in specific external browsers with correct deep link syntax

            // For Chrome (works on both iOS and Android)
            try {
                const chromeUrl = `googlechrome://${browserUrl}`;
                const canOpenChrome = await Linking.canOpenURL(chromeUrl);
                if (canOpenChrome) {
                    // Deep linking disabled
                    console.log('Browser link disabled:', chromeUrl);
                    return;
                }
            } catch (error) {
                console.log('Chrome failed, trying other browsers');
            }

            // For Firefox
            try {
                const firefoxUrl = `firefox://open-url?url=${encodeURIComponent(browserUrl)}`;
                const canOpenFirefox = await Linking.canOpenURL(firefoxUrl);
                if (canOpenFirefox) {
                    // Deep linking disabled
                    console.log('Browser link disabled:', firefoxUrl);
                    return;
                }
            } catch (error) {
                console.log('Firefox failed, trying other browsers');
            }

            // For Microsoft Edge
            try {
                const edgeUrl = `microsoft-edge:${browserUrl}`;
                const canOpenEdge = await Linking.canOpenURL(edgeUrl);
                if (canOpenEdge) {
                    // Deep linking disabled
                    console.log('Browser link disabled:', edgeUrl);
                    return;
                }
            } catch (error) {
                console.log('Edge failed, trying other browsers');
            }

            // Last resort: Try with modified URL to bypass universal links
            // Add multiple parameters that should break universal link matching
            const modifiedUrl = `${browserUrl}${browserUrl.includes('?') ? '&' : '?'}from=app&external=true&t=${Date.now()}`;

            try {
                // Deep linking disabled
                console.log('Browser link disabled:', modifiedUrl);
            } catch (linkingError) {
                // If all else fails, give user options
                Alert.alert(
                    'Open in Browser',
                    'Choose how to open this page in your browser:',
                    [
                        {
                            text: 'Copy URL',
                            onPress: async () => {
                                try {
                                    await setStringAsync(browserUrl);
                                    Alert.alert('Copied!', 'URL copied to clipboard. You can now paste it in your browser.');
                                } catch (clipboardError) {
                                    Alert.alert('Error', 'Could not copy URL to clipboard');
                                }
                            }
                        },
                        {
                            text: 'Try Default Browser',
                            onPress: async () => {
                                try {
                                    // Deep linking disabled
                                    console.log('Browser link disabled:', browserUrl);
                                } catch (defaultError) {
                                    Alert.alert('Error', 'Could not open URL. Please copy the URL and paste it in your browser manually.');
                                }
                            }
                        },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            }

        } catch (error) {
            console.error('Error opening page in browser:', error);
            // Fallback to clipboard option
            Alert.alert(
                'Browser Error',
                'Could not open in browser. Would you like to copy the URL to open it manually?',
                [
                    {
                        text: 'Copy URL',
                        onPress: async () => {
                            try {
                                await setStringAsync(browserUrl);
                                Alert.alert('Copied!', 'URL copied to clipboard');
                            } catch (clipboardError) {
                                Alert.alert('Error', 'Could not copy URL');
                            }
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const removeFromWallet = async () => {
        if (!pageData || !session?.user?.id) return;

        try {
            const { error } = await supabase
                .from('wallet_items')
                .delete()
                .eq('user_id', session.user.id)
                .eq('page_id', pageData.id);

            if (error) throw error;

            setIsSaved(false);
            Alert.alert('Removed', 'Page removed from your wallet');
        } catch (error) {
            console.error('Error removing from wallet:', error);
            Alert.alert('Error', 'Failed to remove page from wallet');
        }
    };

    const saveToWallet = async () => {
        if (!pageData || !session?.user?.id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('wallet_items')
                .insert({
                    user_id: session.user.id,
                    page_id: pageData.id,
                    folder_id: selectedFolder,
                    saved_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Update page save count
            await supabase
                .from('pages')
                .update({ save_count: (pageData.save_count || 0) + 1 })
                .eq('id', pageData.id);

            setIsSaved(true);
            setShowSaveModal(false);
            setSelectedFolder(null);
            Alert.alert('Saved!', 'Page saved to your wallet');
        } catch (error) {
            console.error('Error saving to wallet:', error);
            Alert.alert('Error', 'Failed to save page to wallet');
        } finally {
            setIsSaving(false);
        }
    };

    const createNewFolder = async () => {
        if (!newFolderName.trim() || !session?.user?.id) return;

        try {
            const { data, error } = await supabase
                .from('wallet_folders')
                .insert({
                    user_id: session.user.id,
                    name: newFolderName.trim(),
                })
                .select()
                .single();

            if (error) throw error;

            setWalletFolders(prev => [...prev, data]);
            setSelectedFolder(data.id);
            setNewFolderName('');
            setShowCreateFolder(false);
        } catch (error) {
            console.error('Error creating folder:', error);
            Alert.alert('Error', 'Failed to create folder');
        }
    };

    const renderFolderItem = ({ item }: { item: WalletFolder }) => (
        <TouchableOpacity
            style={[
                styles.folderItem,
                selectedFolder === item.id && styles.selectedFolderItem,
            ]}
            onPress={() => setSelectedFolder(item.id)}
        >
            <View style={styles.folderInfo}>
                <Ionicons name="folder-outline" size={20} color="#007AFF" />
                <Text style={styles.folderName}>{item.name}</Text>
                {item.is_default && (
                    <Text style={styles.defaultTag}>Default</Text>
                )}
            </View>
            {selectedFolder === item.id && (
                <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            )}
        </TouchableOpacity>
    );

    const LoadingView = () => (
        <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading page...</Text>
        </View>
    );

    const renderContent = () => {
        // For ID-based routes, show loading until we have pageData
        if (isIdRoute && !pageData) {
            return <LoadingView />;
        }
        
        if (contentError) {
            return (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#999" />
                    <Text style={styles.errorText}>{contentError}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            if (loadTimeoutRef.current) {
                                clearTimeout(loadTimeoutRef.current);
                            }
                            hasRetriedRef.current = false;
                            setContentError(null);
                            setReloadKey(prev => prev + 1);
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (!viewUrl) {
            return (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#999" />
                    <Text style={styles.errorText}>Invalid page URL</Text>
                </View>
            );
        }

        return (
            <WebView
                key={reloadKey}
                source={{ uri: viewUrl }}
                style={styles.webView}
                startInLoadingState={true}
                renderLoading={LoadingView}
                onLoadStart={() => {
                    // Clear any existing timeout
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                    }
                    
                    // Set 10s timeout with single retry
                    loadTimeoutRef.current = setTimeout(() => {
                        if (!hasRetriedRef.current) {
                            hasRetriedRef.current = true;
                            setReloadKey(prev => prev + 1);
                        } else {
                            setContentError('Page took too long to load. Please try again.');
                        }
                    }, 10000);
                }}
                onLoadEnd={() => {
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                    }
                    setInitialLoadComplete(true);
                }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('❌ WebView Error:', nativeEvent);
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                    }
                    setContentError(`Failed to load page: ${nativeEvent.description || 'Unknown error'}`);
                }}
                onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('🌐 WebView HTTP Error:', nativeEvent);
                    if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                    }
                    if (nativeEvent.statusCode === 404) {
                        setContentError('Page not found');
                    } else {
                        setContentError(`HTTP Error: ${nativeEvent.statusCode}`);
                    }
                }}
                onShouldStartLoadWithRequest={(request) => {
                    const requestUrl = new URL(request.url);
                    const viewUrlObj = new URL(viewUrl);

                    const normalizeHost = (h: string) => h.replace(/^www\./i, '').toLowerCase();
                    const isSameHost = normalizeHost(requestUrl.hostname) === normalizeHost(viewUrlObj.hostname);

                    // Always allow navigations that stay on the same (normalized) host
                    if (isSameHost) {
                        return true;
                    }

                    // All external links disabled in mobile app
                    console.log('External link disabled:', request.url);
                    return false;
                }}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                scalesPageToFit={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsFullscreenVideo={true}
                injectedJavaScript={`
                    // Prevent image clicks from navigating if they're not actual links
                    document.addEventListener('click', function(e) {
                        const target = e.target;
                        
                        // If it's an image inside a link, let the link handle it
                        if (target.tagName === 'IMG') {
                            const linkParent = target.closest('a');
                            if (!linkParent) {
                                // It's a standalone image, prevent navigation
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }
                        }
                        
                        // For links, check if they're Crown Pages links
                        if (target.tagName === 'A' || target.closest('a')) {
                            const link = target.tagName === 'A' ? target : target.closest('a');
                            const href = link.href;
                            
                            if (href && href.includes('crownpages.com')) {
                                // Let the onShouldStartLoadWithRequest handle Crown Pages links
                                return true;
                            }
                        }
                    });
                    
                    // Ensure images load properly
                    document.addEventListener('DOMContentLoaded', function() {
                        const images = document.querySelectorAll('img');
                        images.forEach(img => {
                            if (img.loading) {
                                img.loading = 'lazy';
                            }
                        });
                    });
                    
                    true;
                `}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Header - Always visible */}
            <View style={styles.header}>
                <View style={styles.backButtonContainer}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.actionButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <HeaderTitleWithCrown title={
                    pageData?.title || 
                    (isIdRoute && !pageData ? "Loading..." : "Crown Page")
                } />
                <View style={styles.headerActions}>
                    {!isLegalPage && !isOwnPage && (
                        <TouchableOpacity
                            onPress={handleWalletPress}
                            disabled={!pageData && !viewUrl}
                            style={styles.actionButton}
                        >
                            <Ionicons
                                name={isSaved ? "wallet" : "wallet-outline"}
                                size={24}
                                color={(pageData || viewUrl) ? (isSaved ? "#FFD700" : "#fff") : "#666"}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            <View style={styles.contentWrapper}>
                {renderContent()}
            </View>

            {/* Save to Wallet Modal */}
            {!isLegalPage && !isOwnPage && (
                <Modal
                    visible={showSaveModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowSaveModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Save to Wallet</Text>
                                <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>

                            {pageData && (
                                <View style={styles.pagePreview}>
                                    <Text style={styles.pageTitle}>{pageData.title}</Text>
                                    <Text style={styles.businessName}>{(pageData.business as any)?.name}</Text>
                                </View>
                            )}

                            <Text style={styles.sectionTitle}>Choose a folder:</Text>

                            {/* No folder option */}
                            <TouchableOpacity
                                style={[
                                    styles.folderItem,
                                    selectedFolder === null && styles.selectedFolderItem,
                                ]}
                                onPress={() => setSelectedFolder(null)}
                            >
                                <View style={styles.folderInfo}>
                                    <Ionicons name="bookmark-outline" size={20} color="#007AFF" />
                                    <Text style={styles.folderName}>No folder</Text>
                                </View>
                                {selectedFolder === null && (
                                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                                )}
                            </TouchableOpacity>

                            {/* Existing folders */}
                            <FlatList
                                data={walletFolders}
                                renderItem={renderFolderItem}
                                keyExtractor={(item) => item.id}
                                style={styles.folderList}
                            />

                            {/* Create new folder */}
                            {showCreateFolder ? (
                                <View style={styles.createFolderContainer}>
                                    <TextInput
                                        style={styles.newFolderInput}
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        placeholder="Folder name"
                                        autoFocus
                                    />
                                    <View style={styles.createFolderButtons}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setShowCreateFolder(false);
                                                setNewFolderName('');
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.createButton,
                                                !newFolderName.trim() && styles.createButtonDisabled,
                                            ]}
                                            onPress={createNewFolder}
                                            disabled={!newFolderName.trim()}
                                        >
                                            <Text style={styles.createButtonText}>Create</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.newFolderButton}
                                    onPress={() => setShowCreateFolder(true)}
                                >
                                    <Ionicons name="add" size={20} color="#007AFF" />
                                    <Text style={styles.newFolderButtonText}>Create new folder</Text>
                                </TouchableOpacity>
                            )}

                            {/* Save button */}
                            <TouchableOpacity
                                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                onPress={saveToWallet}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="wallet-outline" size={20} color="#fff" />
                                        <Text style={styles.saveButtonText}>Save to Wallet</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
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
        padding: 16,
        backgroundColor: '#000',
        minHeight: 60,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 8, // Reduced padding since we have fixed containers
        marginHorizontal: 8,  // Add margin for better spacing
    },
    crownIcon: {
        width: 24,
        height: 24,
        tintColor: '#fff',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 80, // Ensure enough space for two buttons
        justifyContent: 'flex-end',
    },
    actionButton: {
        padding: 4,
        minWidth: 32,
        minHeight: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonContainer: {
        width: 80, // Match the width of headerActions for symmetry
        alignItems: 'flex-start',
    },
    contentWrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webView: {
        flex: 1,
    },
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
    loadingText: {
        marginTop: 12,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        marginTop: 12,
        color: '#999',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
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
        maxHeight: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    pagePreview: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    businessName: {
        fontSize: 14,
        color: '#007AFF',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
        color: '#333',
    },
    folderList: {
        maxHeight: 200,
    },
    folderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    selectedFolderItem: {
        backgroundColor: '#e5f2ff',
        borderColor: '#007AFF',
        borderWidth: 1,
    },
    folderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    folderName: {
        fontSize: 16,
        fontWeight: '500',
    },
    defaultTag: {
        fontSize: 12,
        color: '#007AFF',
        backgroundColor: '#e5f2ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    newFolderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        marginTop: 8,
        marginBottom: 20,
    },
    newFolderButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '500',
    },
    createFolderContainer: {
        marginTop: 8,
        marginBottom: 20,
    },
    newFolderInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    createFolderButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
    },
    createButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#ccc',
    },
    createButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
}); 