import AppHeader from '@/components/common/AppHeader';
import Loader from '@/components/common/Loader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../utils/supabase';

interface BusinessPageAnalyticsData {
    total_views: number;
    unique_visitors: number;
    total_shares: number;
    total_saves: number;
    total_clicks: number;
    daily_views: Array<{ date: string; views: number }>;
    device_breakdown: { mobile: number; tablet: number; desktop: number };
    location_breakdown: Array<{ country: string; count: number }>;
    top_referrers: Array<{ referrer: string; count: number }>;
    event_breakdown: Array<{ event_type: string; count: number }>;
    platform_breakdown: Array<{ platform: string; count: number }>;
    recent_activity: Array<{
        id: string;
        event_type: string;
        platform: string;
        created_at: string;
    }>;
    raw_events: Array<{
        id: string;
        event_type: string;
        event_data: any;
        visitor_id: string | null;
        user_id: string | null;
        session_id: string | null;
        user_agent: string | null;
        referrer: string | null;
        platform: string | null;
        device_type: string | null;
        browser: string | null;
        os: string | null;
        country: string | null;
        region: string | null;
        city: string | null;
        created_at: string;
    }>;
}

interface BusinessPage {
    id: string;
    title: string;
    business_id: string;
    view_count: number;
    unique_view_count: number;
    share_count: number;
    save_count: number;
    businesses?: {
        name: string;
    };
}

const { width: screenWidth } = Dimensions.get('window');

export default function BusinessPageAnalyticsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useAuth();
    const [businessPage, setBusinessPage] = useState<BusinessPage | null>(null);
    const [analytics, setAnalytics] = useState<BusinessPageAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('30d');

    // when the screen gains focus—i.e. any time you come back to it—re-run:
    useFocusEffect(
        useCallback(() => {
            if (id) {
                fetchBusinessPageAndAnalytics();
            }
        }, [id, timeRange])
    );

    const fetchBusinessPageAndAnalytics = async () => {
        try {
            setIsLoading(true);

            // Fetch business page details
            const { data: businessPageData, error: businessPageError } = await supabase
                .from('business_pages')
                .select('*, businesses(name)')
                .eq('id', id)
                .single();

            if (businessPageError) throw businessPageError;
            setBusinessPage(businessPageData);

            // Calculate date range for filtering analytics
            const endDate = new Date();
            const startDate = new Date();
            switch (timeRange) {
                case '1d':
                    startDate.setDate(endDate.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
            }

            // Fetch analytics data using custom queries
            const [
                viewsResponse,
                clicksResponse,
                dailyViewsResponse,
                deviceResponse,
                locationResponse,
                referrersResponse,
                eventBreakdownResponse,
                platformBreakdownResponse,
                recentActivityResponse,
                rawEventsResponse,
            ] = await Promise.all([
                // Total views and unique visitors
                supabase
                    .from('business_page_analytics')
                    .select('visitor_id')
                    .eq('business_page_id', id)
                    .eq('event_type', 'page_view'),

                // Total clicks (link_click, phone_click, email_click, address_click, social_click, website_click)
                supabase
                    .from('business_page_analytics')
                    .select('id')
                    .eq('business_page_id', id)
                    .in('event_type', [
                        'link_click',
                        'phone_click',
                        'email_click',
                        'address_click',
                        'social_click',
                        'website_click',
                    ])
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Daily views
                supabase
                    .from('business_page_analytics')
                    .select('created_at')
                    .eq('business_page_id', id)
                    .eq('event_type', 'page_view')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Device breakdown
                supabase
                    .from('business_page_analytics')
                    .select('device_type')
                    .eq('business_page_id', id)
                    .eq('event_type', 'page_view')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Location breakdown
                supabase
                    .from('business_page_analytics')
                    .select('country')
                    .eq('business_page_id', id)
                    .eq('event_type', 'page_view')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Top referrers
                supabase
                    .from('business_page_analytics')
                    .select('referrer')
                    .eq('business_page_id', id)
                    .eq('event_type', 'page_view')
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Event breakdown
                supabase
                    .from('business_page_analytics')
                    .select('event_type')
                    .eq('business_page_id', id)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Platform breakdown
                supabase
                    .from('business_page_analytics')
                    .select('platform')
                    .eq('business_page_id', id)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString()),

                // Recent activity
                supabase
                    .from('business_page_analytics')
                    .select('id, event_type, platform, created_at')
                    .eq('business_page_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10),

                // Raw events data for the table
                supabase
                    .from('business_page_analytics')
                    .select('*')
                    .eq('business_page_id', id)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(100),
            ]);

            // Process the data
            const viewsData = viewsResponse.data || [];
            const uniqueVisitors = new Set(viewsData.map((v) => v.visitor_id)).size;

            // Update business page data with the correct counts
            await supabase
                .from('business_pages')
                .update({
                    view_count: viewsData.length,
                    unique_view_count: uniqueVisitors,
                })
                .eq('id', id);

            // Process daily views
            const dailyViewsMap = new Map<string, number>();
            if (dailyViewsResponse.data) {
                dailyViewsResponse.data.forEach((event: any) => {
                    const date = new Date(event.created_at).toISOString().split('T')[0];
                    dailyViewsMap.set(date, (dailyViewsMap.get(date) || 0) + 1);
                });
            }

            const dailyViews = Array.from(dailyViewsMap.entries())
                .map(([date, views]) => ({
                    date,
                    views,
                }))
                .sort((a, b) => a.date.localeCompare(b.date));

            // Process device breakdown
            const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
            if (deviceResponse.data) {
                deviceResponse.data.forEach((event: any) => {
                    const deviceType = event.device_type || 'desktop';
                    if (deviceType in deviceBreakdown) {
                        (deviceBreakdown as any)[deviceType]++;
                    }
                });
            }

            // Process location breakdown
            const locationMap = new Map<string, number>();
            if (locationResponse.data) {
                locationResponse.data.forEach((event: any) => {
                    if (event.country) {
                        locationMap.set(
                            event.country,
                            (locationMap.get(event.country) || 0) + 1
                        );
                    }
                });
            }
            const locationBreakdown = Array.from(locationMap.entries())
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Process referrers
            const referrerMap = new Map<string, number>();
            if (referrersResponse.data) {
                referrersResponse.data.forEach((event: any) => {
                    if (event.referrer) {
                        referrerMap.set(
                            event.referrer,
                            (referrerMap.get(event.referrer) || 0) + 1
                        );
                    }
                });
            }
            const topReferrers = Array.from(referrerMap.entries())
                .map(([referrer, count]) => ({ referrer, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // Process event breakdown
            const eventMap = new Map<string, number>();
            if (eventBreakdownResponse.data) {
                eventBreakdownResponse.data.forEach((event: any) => {
                    eventMap.set(
                        event.event_type,
                        (eventMap.get(event.event_type) || 0) + 1
                    );
                });
            }
            const eventBreakdown = Array.from(eventMap.entries())
                .map(([event_type, count]) => ({ event_type, count }))
                .sort((a, b) => b.count - a.count);

            // Process platform breakdown
            const platformMap = new Map<string, number>();
            if (platformBreakdownResponse.data) {
                platformBreakdownResponse.data.forEach((event: any) => {
                    if (event.platform) {
                        platformMap.set(
                            event.platform,
                            (platformMap.get(event.platform) || 0) + 1
                        );
                    }
                });
            }
            const platformBreakdown = Array.from(platformMap.entries())
                .map(([platform, count]) => ({ platform, count }))
                .sort((a, b) => b.count - a.count);

            setAnalytics({
                total_views: viewsData.length,
                unique_visitors: uniqueVisitors,
                total_shares: 0,
                total_saves: 0,
                total_clicks: clicksResponse.data?.length || 0,
                daily_views: dailyViews,
                device_breakdown: deviceBreakdown,
                location_breakdown: locationBreakdown,
                top_referrers: topReferrers,
                event_breakdown: eventBreakdown,
                platform_breakdown: platformBreakdown,
                recent_activity: recentActivityResponse.data || [],
                raw_events: rawEventsResponse.data || [],
            });
        } catch (error) {
            console.error('Error fetching business page analytics:', error);
            Alert.alert('Error', 'Failed to load business page analytics data');
        } finally {
            setIsLoading(false);
        }
    };

    const MetricCard = ({
        icon,
        title,
        value,
        subtitle,
        color = '#000',
    }: {
        icon: string;
        title: string;
        value: string | number;
        subtitle?: string;
        color?: string;
    }) => (
        <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <View style={styles.metricContent}>
                <Text style={styles.metricValue}>{value}</Text>
                <Text style={styles.metricTitle}>{title}</Text>
                {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
            </View>
        </View>
    );

    const SimpleChart = ({
        data,
        title,
    }: {
        data: Array<{ label: string; value: number }>;
        title: string;
    }) => {
        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{title}</Text>
                {data.slice(0, 10).map((item, index) => (
                    <View key={index} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                            <Text style={styles.listItemLabel}>{item.label}</Text>
                            <Text style={styles.listItemValue}>{item.value}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const RawDataTable = ({ data }: { data: any[] }) => {
        const columns = [
            { key: 'created_at', title: 'Date/Time', width: 120 },
            { key: 'event_type', title: 'Event Type', width: 100 },
            { key: 'platform', title: 'Platform', width: 80 },
            { key: 'visitor_id', title: 'Visitor ID', width: 100 },
            { key: 'session_id', title: 'Session ID', width: 100 },
            { key: 'user_agent', title: 'User Agent', width: 150 },
            { key: 'event_data', title: 'Event Data', width: 120 },
        ];

        const formatCellValue = (value: any, key: string) => {
            if (value === null || value === undefined) return '-';

            if (key === 'created_at') {
                return new Date(value).toLocaleString();
            }

            if (key === 'event_data' && typeof value === 'object') {
                return JSON.stringify(value);
            }

            if (key === 'user_agent' && typeof value === 'string' && value.length > 30) {
                return value.substring(0, 30) + '...';
            }

            return String(value);
        };

        const renderHeader = () => (
            <View style={styles.tableRow}>
                {columns.map((column) => (
                    <View
                        key={column.key}
                        style={[styles.tableHeaderCell, { width: column.width }]}
                    >
                        <Text style={styles.tableHeaderText}>{column.title}</Text>
                    </View>
                ))}
            </View>
        );

        const showFullCellData = (value: any, columnTitle: string) => {
            const fullValue = value === null || value === undefined ? 'No data' :
                typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

            Alert.alert(
                columnTitle,
                fullValue,
                [{ text: 'Close', style: 'cancel' }],
                { cancelable: true }
            );
        };

        const renderRow = ({ item, index }: { item: any; index: number }) => (
            <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                {columns.map((column) => (
                    <TouchableOpacity
                        key={column.key}
                        style={[styles.tableCell, { width: column.width }]}
                        onPress={() => showFullCellData(item[column.key], column.title)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.tableCellText} numberOfLines={2}>
                            {formatCellValue(item[column.key], column.key)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );

        return (
            <View style={styles.tableContainer}>
                <Text style={styles.chartTitle}>Raw Business Page Analytics Data</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        {renderHeader()}
                        <FlatList
                            data={data}
                            renderItem={renderRow}
                            keyExtractor={(item) => item.id}
                            style={styles.tableBody}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </ScrollView>
            </View>
        );
    };

    if (isLoading) {
        return <Loader />;
    }

    if (!businessPage || !analytics) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <AppHeader title="Business Page Analytics" />
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>Business page analytics data not available</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader title="Business Page Analytics" />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Business Name Header */}
                <View style={styles.businessInfoHeader}>
                    <Text style={styles.businessNameText}>
                        {businessPage?.businesses?.name || 'Business Page'}
                    </Text>
                </View>
                {/* Time Range Selector */}
                <View style={styles.pageHeader}>
                    <View style={styles.timeRangeSelector}>
                        {['1d', '7d', '30d', '90d'].map((range) => (
                            <TouchableOpacity
                                key={range}
                                style={[
                                    styles.timeRangeButton,
                                    timeRange === range && styles.timeRangeButtonActive,
                                ]}
                                onPress={() => setTimeRange(range as any)}
                            >
                                <Text
                                    style={[
                                        styles.timeRangeText,
                                        timeRange === range && styles.timeRangeTextActive,
                                    ]}
                                >
                                    {range === '1d'
                                        ? '1 Day'
                                        : range === '7d'
                                            ? '7 Days'
                                            : range === '30d'
                                                ? '30 Days'
                                                : '90 Days'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Analytics Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Views</Text>
                        <Text style={styles.summaryValue}>{analytics.total_views}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Unique Visitors</Text>
                        <Text style={styles.summaryValue}>{analytics.unique_visitors}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Clicks</Text>
                        <Text style={styles.summaryValue}>{analytics.total_clicks}</Text>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.recentActivity}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {analytics.recent_activity.length > 0 ? (
                        analytics.recent_activity.slice(0, 10).map((activity, index) => (
                            <View key={activity.id} style={styles.activityItem}>
                                <View style={styles.activityIcon}>
                                    <Ionicons
                                        name={
                                            activity.event_type === 'page_view'
                                                ? 'eye-outline'
                                                : activity.event_type === 'link_click'
                                                    ? 'link-outline'
                                                    : activity.event_type === 'phone_click'
                                                        ? 'call-outline'
                                                        : activity.event_type === 'email_click'
                                                            ? 'mail-outline'
                                                            : activity.event_type === 'address_click'
                                                                ? 'location-outline'
                                                                : activity.event_type === 'social_click'
                                                                    ? 'logo-facebook'
                                                                    : activity.event_type === 'website_click'
                                                                        ? 'globe-outline'
                                                                        : 'analytics-outline'
                                        }
                                        size={16}
                                        color="#666"
                                    />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityEvent}>
                                        {activity.event_type
                                            .replace('_', ' ')
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </Text>
                                    <Text style={styles.activityPlatform}>
                                        via {activity.platform?.replace('_', ' ') || 'Unknown'}
                                    </Text>
                                </View>
                                <Text style={styles.activityTime}>
                                    {new Date(activity.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noDataContainer}>
                            <Ionicons name="analytics-outline" size={48} color="#ccc" />
                            <Text style={styles.noDataText}>No recent activity</Text>
                            <Text style={styles.noDataSubtext}>
                                Activity will appear here as users interact with your business page
                            </Text>
                        </View>
                    )}
                </View>

                {/* Charts Section */}
                <View style={styles.chartsSection}>
                    {/* Event Breakdown */}
                    <SimpleChart
                        title="Event Types"
                        data={[
                            'page_view',
                            'link_click',
                            'phone_click',
                            'email_click',
                            'address_click',
                            'social_click',
                            'website_click',
                        ].map((eventType) => {
                            const found = analytics.event_breakdown.find(
                                (item) => item.event_type === eventType
                            );
                            return {
                                label: eventType
                                    .replace('_', ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase()),
                                value: found?.count || 0,
                            };
                        })}
                    />

                    {/* Raw Business Page Analytics Data Table */}
                    <RawDataTable data={analytics.raw_events} />
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
    content: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    pageHeader: {
        backgroundColor: '#fff',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    timeRangeSelector: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 4,
    },
    timeRangeButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    timeRangeButtonActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    timeRangeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    timeRangeTextActive: {
        color: '#000',
        fontWeight: '600',
    },
    metricsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    metricCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        width: (screenWidth - 44) / 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    metricIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    metricContent: {
        flex: 1,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    metricTitle: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    metricSubtitle: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    chartsSection: {
        padding: 16,
        gap: 20,
    },
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    listItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    listItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listItemLabel: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    listItemValue: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    tableContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    tableRowEven: {
        backgroundColor: '#f8f9fa',
    },
    tableHeaderCell: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: '#000',
        borderRightWidth: 1,
        borderRightColor: '#333',
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    tableCell: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRightWidth: 1,
        borderRightColor: '#f1f3f4',
        minHeight: 40,
        justifyContent: 'center',
    },
    tableCellText: {
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
    },
    tableBody: {
        maxHeight: 300,
    },
    recentActivity: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 16,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityEvent: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    activityPlatform: {
        fontSize: 12,
        color: '#666',
    },
    activityTime: {
        fontSize: 12,
        color: '#999',
    },
    noDataContainer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    noDataText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
        marginTop: 12,
    },
    noDataSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 4,
    },
    summaryContainer: {
        backgroundColor: '#fff',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    summaryLabel: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 18,
        color: '#000',
        fontWeight: '700',
    },
    businessInfoHeader: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f4',
    },
    businessNameText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
}); 