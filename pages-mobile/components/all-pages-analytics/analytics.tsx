import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Define types - use string for all IDs to ensure consistency
interface Page {
  id: string;
  title: string;
  view_count: number;
  share_count: number;
  save_count: number;
  unique_view_count: number;
}

interface StatRowProps {
  label: string;
  value: number;
}

const Analytics = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPages = async () => {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("pages")
        .select(
          "id, title, view_count, share_count, save_count, unique_view_count"
        )
        .eq("created_by", user?.user?.id);

      if (error) {
        console.log("Error fetching pages", error.message);
      } else {
        // Ensure all IDs are strings for consistent typing
        const pagesData = (data || []).map((page) => ({
          ...page,
          id: String(page.id), // Convert all IDs to strings
        }));

        setPages(pagesData);

        // By default, select all pages
        if (pagesData.length > 0) {
          setSelectedPageIds(pagesData.map((page) => page.id));
        }
      }
      setLoading(false);
    };

    fetchPages();
  }, []);

  // Now togglePageSelection expects a string
  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  const selectAll = () => {
    const allIds = pages.map((page) => page.id);
    setSelectedPageIds(allIds);
  };

  const clearAll = () => {
    setSelectedPageIds([]);
  };

  const aggregatedStats = useMemo(() => {
    const activePages = pages.filter((page) =>
      selectedPageIds.includes(page.id)
    );

    return {
      views: activePages.reduce((sum, p) => sum + (p.view_count || 0), 0),
      shares: activePages.reduce((sum, p) => sum + (p.share_count || 0), 0),
      saves: activePages.reduce((sum, p) => sum + (p.save_count || 0), 0),
      uniques: activePages.reduce(
        (sum, p) => sum + (p.unique_view_count || 0),
        0
      ),
    };
  }, [pages, selectedPageIds]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Analytics Dashboard</Text>

      {/* Selection Buttons */}
      <View style={styles.selectionButtons}>
        <TouchableOpacity onPress={selectAll} style={styles.selectButton}>
          <Text style={styles.selectButtonText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Pages List with Checkboxes */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Pages</Text>
        <FlatList
          data={pages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => togglePageSelection(item.id)}
              style={styles.pageItem}
            >
              <Ionicons
                name={
                  selectedPageIds.includes(item.id)
                    ? "checkbox"
                    : "square-outline"
                }
                size={24}
                color={selectedPageIds.includes(item.id) ? "#000" : "#666"}
              />
              <Text style={styles.pageTitle}>{item.title}</Text>
            </TouchableOpacity>
          )}
          style={styles.pagesList}
        />
      </View>

      {/* Aggregated Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Aggregated Stats</Text>

        <StatRow label="Total Views" value={aggregatedStats.views} />
        <StatRow label="Unique Views" value={aggregatedStats.uniques} />
        <StatRow label="Total Shares" value={aggregatedStats.shares} />
        <StatRow label="Total Saves" value={aggregatedStats.saves} />
      </View>
    </View>
  );
};

// Reusable Stat Row Component
const StatRow: React.FC<StatRowProps> = ({ label, value }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  selectionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  selectButton: {
    padding: 8,
  },
  selectButtonText: {
    color: "#000",
    fontWeight: "600",
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  listContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  pagesList: {
    maxHeight: 300,
  },
  pageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pageTitle: {
    marginLeft: 12,
    fontSize: 16,
  },
  statsContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default Analytics;
