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
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../utils/supabase';

interface TrackableLinkAnalyticsData {
  total_visits: number;
  unique_visitors: number;
  device_breakdown: { mobile: number; tablet: number; desktop: number };
  location_breakdown: Array<{ country: string; count: number }>;
  top_referrers: Array<{ referrer: string; count: number }>;
  recent_visits: Array<{
    id: string;
    created_at: string;
    visitor_id: string | null;
    country: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    referrer: string | null;
    user_agent: string | null;
  }>;
  raw_events: Array<{
    id: string;
    event_type: string;
    event_data: any;
    visitor_id: string | null;
    user_id: string | null;
    session_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    referrer: string | null;
    device_type: string | null;
    browser: string | null;
    os: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    created_at: string;
  }>;
}

const { width: screenWidth } = Dimensions.get('window');

export default function TrackableLinkAnalyticsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<TrackableLinkAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('1d'); // Default to 1 day

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchAnalytics();
      }
    }, [id, timeRange])
  );

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Calculate date range
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

      // Fetch analytics data from trackable_link_events
      const [
        visitsResponse,
        deviceResponse,
        locationResponse,
        referrersResponse,
        recentVisitsResponse,
        rawEventsResponse,
      ] = await Promise.all([
        // Total visits and unique visitors
        supabase
          .from('trackable_link_events')
          .select('visitor_id, event_type')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Device breakdown
        supabase
          .from('trackable_link_events')
          .select('device_type')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Location breakdown
        supabase
          .from('trackable_link_events')
          .select('country')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Top referrers
        supabase
          .from('trackable_link_events')
          .select('referrer')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),

        // Recent visits (most important for users!)
        supabase
          .from('trackable_link_events')
          .select('id, created_at, visitor_id, country, device_type, browser, os, referrer, user_agent')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .order('created_at', { ascending: false })
          .limit(50), // Show more recent visits

        // Raw events data for the table
        supabase
          .from('trackable_link_events')
          .select('*')
          .eq('trackable_link_id', id)
          .eq('event_type', 'view')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Process the data
      const visitsData = visitsResponse.data || [];
      const uniqueVisitors = new Set(visitsData.map((v) => v.visitor_id)).size;
      const totalVisits = visitsData.length;

      // Process device breakdown
      const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
      if (deviceResponse.data) {
        deviceResponse.data.forEach((event: any) => {
          const deviceType = event.device_type?.toLowerCase() || 'desktop';
          if (deviceType.includes('mobile')) {
            deviceBreakdown.mobile++;
          } else if (deviceType.includes('tablet')) {
            deviceBreakdown.tablet++;
          } else {
            deviceBreakdown.desktop++;
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
            const domain = event.referrer.includes('://') 
              ? new URL(event.referrer).hostname 
              : event.referrer;
            referrerMap.set(
              domain,
              (referrerMap.get(domain) || 0) + 1
            );
          }
        });
      }
      const topReferrers = Array.from(referrerMap.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setAnalytics({
        total_visits: totalVisits,
        unique_visitors: uniqueVisitors,
        device_breakdown: deviceBreakdown,
        location_breakdown: locationBreakdown,
        top_referrers: topReferrers,
        recent_visits: recentVisitsResponse.data || [],
        raw_events: rawEventsResponse.data || [],
      });
    } catch (error) {
      console.error('Error fetching trackable link analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const visitTime = new Date(dateString);
    const diffMs = now.getTime() - visitTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return visitTime.toLocaleDateString();
  };

  const RecentVisitsLog = ({ visits }: { visits: any[] }) => (
    <View style={styles.recentVisitsContainer}>
      <Text style={styles.sectionTitle}>📋 Recent Visits Log</Text>
      {visits.length > 0 ? (
        <View style={styles.visitsLogList}>
          {visits.slice(0, 15).map((visit, index) => (
            <View key={visit.id} style={styles.visitLogItem}>
              <View style={styles.visitLogHeader}>
                <View style={styles.visitLogMain}>
                  <Text style={styles.visitLogTime}>
                    {formatTimeAgo(visit.created_at)}
                  </Text>
                  <Text style={styles.visitLogLocation}>
                    {visit.country || 'Unknown location'}
                  </Text>
                </View>
                <View style={styles.visitLogStatus}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.visitLogStatusText}>Opened</Text>
                </View>
              </View>
              <View style={styles.visitLogDetails}>
                <Text style={styles.visitLogDetail}>
                  {visit.device_type || 'Unknown device'} • {visit.browser || 'Unknown browser'}
                </Text>
                {visit.referrer && (
                  <Text style={styles.visitLogReferrer}>
                    From: {visit.referrer.includes('://') ? new URL(visit.referrer).hostname : visit.referrer}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noVisitsContainer}>
          <Ionicons name="eye-off-outline" size={48} color="#ccc" />
          <Text style={styles.noVisitsText}>No visits yet</Text>
          <Text style={styles.noVisitsSubtext}>
            Share your link and visits will appear here in real-time
          </Text>
        </View>
      )}
    </View>
  );

  const SimpleChart = ({
    data,
    title,
  }: {
    data: Array<{ label: string; value: number }>;
    title: string;
  }) => {
    if (data.length === 0 || data.every(item => item.value === 0)) return null;
    
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
    if (data.length === 0) return null;

    const columns = [
      { key: 'created_at', title: 'Date/Time', width: 120 },
      { key: 'visitor_id', title: 'Visitor ID', width: 100 },
      { key: 'device_type', title: 'Device', width: 80 },
      { key: 'browser', title: 'Browser', width: 80 },
      { key: 'os', title: 'OS', width: 80 },
      { key: 'country', title: 'Country', width: 80 },
      { key: 'referrer', title: 'Referrer', width: 120 },
    ];

    const formatCellValue = (value: any, key: string) => {
      if (value === null || value === undefined) return '-';

      if (key === 'created_at') {
        return new Date(value).toLocaleString();
      }

      if (key === 'referrer' && typeof value === 'string' && value.length > 25) {
        return value.substring(0, 25) + '...';
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
        <Text style={styles.chartTitle}>Raw Visit Data</Text>
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

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Link Analytics" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Analytics data not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={`${name || 'Link'} Analytics`} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* MOST IMPORTANT: Recent Visits Log - First thing users see */}
        <RecentVisitsLog visits={analytics.recent_visits} />

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <MetricCard
            icon="eye-outline"
            title="Total Visits"
            value={analytics.total_visits}
            subtitle={`${analytics.unique_visitors} unique visitors`}
            color="#007AFF"
          />
          <MetricCard
            icon="people-outline"
            title="Unique Visitors"
            value={analytics.unique_visitors}
            color="#34C759"
          />
          <MetricCard
            icon="globe-outline"
            title="Countries"
            value={analytics.location_breakdown.length}
            color="#FF9500"
          />
          <MetricCard
            icon="analytics-outline"
            title="Total Events"
            value={analytics.raw_events.length}
            color="#AF52DE"
          />
        </View>

        {/* Breakdown Charts */}
        <View style={styles.chartsSection}>
          <SimpleChart
            title="Top Countries"
            data={analytics.location_breakdown.map(item => ({
              label: item.country,
              value: item.count
            }))}
          />

          <SimpleChart
            title="Device Types"
            data={[
              { label: 'Mobile', value: analytics.device_breakdown.mobile },
              { label: 'Desktop', value: analytics.device_breakdown.desktop },
              { label: 'Tablet', value: analytics.device_breakdown.tablet },
            ].filter(item => item.value > 0)}
          />

          <SimpleChart
            title="Top Referrers"
            data={analytics.top_referrers.map(item => ({
              label: item.referrer,
              value: item.count
            }))}
          />

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

  // Recent Visits Log Styles (MOST IMPORTANT UI)
  recentVisitsContainer: {
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
  visitsLogList: {
    gap: 12,
  },
  visitLogItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  visitLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitLogMain: {
    flex: 1,
  },
  visitLogTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  visitLogLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  visitLogStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitLogStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  visitLogDetails: {
    marginTop: 4,
  },
  visitLogDetail: {
    fontSize: 11,
    color: '#666',
  },
  visitLogReferrer: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  noVisitsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noVisitsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
  },
  noVisitsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },

  // Existing styles...
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  // Raw data table styles
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
});
