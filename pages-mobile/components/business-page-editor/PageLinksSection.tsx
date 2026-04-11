import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../utils/supabase';

type PageLink = {
    id: string;
    page_id: string;
    page_title: string;
    page_slug: string;
    custom_title: string;
    is_enabled: boolean;
    sort_order: number;
};

type BusinessPage = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
};

interface PageLinksSectionProps {
    businessId: string;
    pageLinks: PageLink[];
    onPageLinksChange: (pageLinks: PageLink[]) => void;
}

export default function PageLinksSection({
    businessId,
    pageLinks,
    onPageLinksChange,
}: PageLinksSectionProps) {
    const [availablePages, setAvailablePages] = useState<BusinessPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAvailablePages();
    }, [businessId]);

    const fetchAvailablePages = async () => {
        try {
            const { data, error } = await supabase
                .from('pages')
                .select('id, title, slug, description')
                .eq('business_id', businessId)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setAvailablePages(data || []);
        } catch (error) {
            console.error('Error fetching available pages:', error);
            Alert.alert('Error', 'Failed to load available pages');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePageLink = (pageId: string, enabled: boolean) => {
        const existingLink = pageLinks.find(link => link.page_id === pageId);

        if (enabled && !existingLink) {
            const page = availablePages.find(p => p.id === pageId);
            if (page) {
                const newLink: PageLink = {
                    id: `temp_${Date.now()}`,
                    page_id: pageId,
                    page_title: page.title,
                    page_slug: page.slug,
                    custom_title: page.title,
                    is_enabled: true,
                    sort_order: pageLinks.length,
                };
                onPageLinksChange([...pageLinks, newLink]);
            }
        } else if (!enabled && existingLink) {
            onPageLinksChange(pageLinks.filter(link => link.page_id !== pageId));
        }
    };

    const updatePageLink = (pageId: string, updates: Partial<PageLink>) => {
        onPageLinksChange(
            pageLinks.map(link =>
                link.page_id === pageId ? { ...link, ...updates } : link
            )
        );
    };

    const movePageLink = (pageId: string, direction: 'up' | 'down') => {
        const currentIndex = pageLinks.findIndex(link => link.page_id === pageId);
        if (currentIndex === -1) return;

        const newPageLinks = [...pageLinks];
        if (direction === 'up' && currentIndex > 0) {
            [newPageLinks[currentIndex], newPageLinks[currentIndex - 1]] = [
                newPageLinks[currentIndex - 1],
                newPageLinks[currentIndex],
            ];
        } else if (direction === 'down' && currentIndex < pageLinks.length - 1) {
            [newPageLinks[currentIndex], newPageLinks[currentIndex + 1]] = [
                newPageLinks[currentIndex + 1],
                newPageLinks[currentIndex],
            ];
        }

        // Update sort orders
        newPageLinks.forEach((link, index) => {
            link.sort_order = index;
        });

        onPageLinksChange(newPageLinks);
    };

    const renderPageItem = ({ item }: { item: BusinessPage }) => {
        const isEnabled = pageLinks.some(link => link.page_id === item.id);
        const pageLink = pageLinks.find(link => link.page_id === item.id);

        return (
            <View style={styles.pageItem}>
                <View style={styles.pageItemHeader}>
                    <View style={styles.pageInfo}>
                        <Text style={styles.pageTitle}>{item.title}</Text>
                        <Text style={styles.pageSlug}>/{item.slug}</Text>
                    </View>
                    <Switch
                        value={isEnabled}
                        onValueChange={(value) => togglePageLink(item.id, value)}
                    />
                </View>

                {isEnabled && pageLink && (
                    <View style={styles.customTitleContainer}>
                        <Text style={styles.customTitleLabel}>Custom Title (Optional)</Text>
                        <TextInput
                            style={styles.customTitleInput}
                            value={pageLink.custom_title}
                            onChangeText={(text) => updatePageLink(item.id, { custom_title: text })}
                            placeholder="Use custom title instead of page title"
                            placeholderTextColor="#999"
                        />
                        <View style={styles.pageLinkActions}>
                            {pageLinks.findIndex(link => link.page_id === item.id) > 0 && (
                                <TouchableOpacity
                                    onPress={() => movePageLink(item.id, 'up')}
                                    style={styles.actionButton}
                                >
                                    <Ionicons name="arrow-up" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            )}
                            {pageLinks.findIndex(link => link.page_id === item.id) < pageLinks.length - 1 && (
                                <TouchableOpacity
                                    onPress={() => movePageLink(item.id, 'down')}
                                    style={styles.actionButton}
                                >
                                    <Ionicons name="arrow-down" size={20} color="#007AFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading available pages...</Text>
            </View>
        );
    }

    if (availablePages.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No Published Pages</Text>
                <Text style={styles.emptyDescription}>
                    You need to create and publish pages for this business before they can appear on your business page.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionDescription}>
                Select which pages to display and customize their titles
            </Text>

            <FlatList
                data={availablePages}
                renderItem={renderPageItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginTop: 12,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    pageItem: {
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    pageItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pageInfo: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    pageSlug: {
        fontSize: 12,
        color: '#666',
    },
    customTitleContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    customTitleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    customTitleInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    pageLinkActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
}); 