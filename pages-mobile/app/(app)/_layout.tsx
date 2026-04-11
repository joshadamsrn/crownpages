import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import InactiveAccountModal from "../../components/common/InactiveAccountModal";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { SubscriptionService } from "../../utils/subscriptionService";
import { supabase } from "../../utils/supabase";

// Custom Drawer Content Component
function CustomDrawerContent(props: any) {
  const { session, signOut } = useAuth();
  const {
    hasProAccess,
    isLoading: subscriptionLoading,
    subscriptionInfo,
    isIndividualSubscription,
    isLicenseSubscription,
    hasExpiredTrial,
  } = useSubscription();

  const getPlanStatusText = () => {
    if (subscriptionLoading) return "Loading...";

    if (!hasProAccess) {
      if (hasExpiredTrial) {
        return "Inactive";
      }
      return "Free Trial";
    }

    if (isIndividualSubscription) {
      const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(
        subscriptionInfo!
      );
      return displayStatus.showWarning
        ? "Pro Plan (Expires Soon)"
        : "Pro Plan (Individual)";
    }

    if (isLicenseSubscription) {
      return "Pro Plan (Team License)";
    }

    return "Pro Plan";
  };

  const getPlanStatusColor = () => {
    if (subscriptionLoading) return "#666";

    if (!hasProAccess) {
      if (hasExpiredTrial) {
        return "#ff4444"; // Red for inactive
      }
      return "#666"; // Gray for free trial
    }

    if (isIndividualSubscription) {
      const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(
        subscriptionInfo!
      );
      return displayStatus.colorScheme === "green" ? "#34C759" : "#ff9500";
    }

    if (isLicenseSubscription) {
      const displayStatus = SubscriptionService.getSubscriptionDisplayStatus(
        subscriptionInfo!
      );
      return displayStatus.colorScheme === "green" ? "#007AFF" : "#ff9500";
    }

    return "#34C759"; // Green for active pro
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} style={styles.drawerContent}>
        {/* Header Section with Crown Logo */}
        <View style={styles.drawerHeader}>
          <Image
            source={require("../../assets/images/logo/crown only.png")}
            style={styles.drawerLogo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Crown Pages</Text>
        </View>

        {/* User Account Section */}
        <TouchableOpacity
          style={styles.accountSection}
          onPress={() => props.navigation.navigate("my-account")}
        >
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>
              {session?.user?.email || "User"}
            </Text>
            <Text style={styles.userLabel}>My Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Plan Status Section */}
        <TouchableOpacity
          style={styles.planSection}
          onPress={() => props.navigation.navigate("plans")}
        >
          <View style={styles.planInfo}>
            <View style={styles.planIcon}>
              <Ionicons
                name="card-outline"
                size={20}
                color={getPlanStatusColor()}
              />
            </View>
            <View style={styles.planDetails}>
              <Text style={styles.planStatus}>{getPlanStatusText()}</Text>
              <Text style={styles.planLabel}>Manage Plan</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Business Settings */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => props.navigation.navigate("business-settings")}
        >
          <Ionicons name="business-outline" size={20} color="#000" />
          <Text style={styles.menuItemText}>Business Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#ff4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

export default function AppLayout() {
  const { session, isLoading, showInactiveModal, setShowInactiveModal } =
    useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          drawerActiveTintColor: "#000",
          drawerInactiveTintColor: "#666",
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: "500",
          },
          drawerStyle: {
            backgroundColor: "#fff",
            width: 280,
          },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            title: "Home",
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="create-page"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="business-page-editor/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="page-options/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="page-viewer/[...url]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="page-editor/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="preview-page/[slug]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="page-settings/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="page-sharing/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />

        <Drawer.Screen
          name="page-analytics/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="business-page-analytics/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="my-account"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu, accessed via account section
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="plans"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            title: "Plans & Billing",
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="redeem-license"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="business-setup"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="business-settings"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu, accessed via menu item
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="team-sharing"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="trackable-links/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="trackable-links/analytics/[id]"
          options={{
            drawerItemStyle: { display: "none" }, // Hide from drawer menu
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="lead-detail/[pageId]/[visitorId]"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false,
          }}
        />
        <Drawer.Screen
          name="all-leads"
          options={{
            drawerItemStyle: { display: "none" },
            headerShown: false,
          }}
        />
      </Drawer>

      {/* Inactive Account Modal */}
      <InactiveAccountModal
        visible={showInactiveModal}
        onClose={() => setShowInactiveModal(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: "#fff",
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  drawerLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
    tintColor: "#000",
  },
  appName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  accountSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e9ecef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  userLabel: {
    fontSize: 12,
    color: "#666",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  logoutSection: {
    marginTop: "auto",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#ff4444",
    fontWeight: "500",
  },
  planSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e9ecef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  planDetails: {
    flex: 1,
  },
  planStatus: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  planLabel: {
    fontSize: 12,
    color: "#666",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
});
