import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Custom header title component with crown icon
const HeaderTitleWithCrown = ({ title }: { title: string }) => (
  <View style={styles.headerTitleContainer}>
    <Image
      source={require("../../../assets/images/logo/crown only.png")}
      style={styles.crownIcon}
      resizeMode="contain"
    />
    <Text style={styles.headerTitle}>{title}</Text>
  </View>
);

// Hamburger menu component
const HamburgerMenu = () => {
  const navigation = useNavigation();

  const toggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <TouchableOpacity onPress={toggleDrawer} style={styles.hamburgerButton}>
      <Ionicons name="menu" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#000",
        headerStyle: {
          backgroundColor: "#000",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => <HamburgerMenu />,
      }}
    >
      {/* Index - hidden redirect */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* ===== MAIN NAVIGATION TABS ===== */}

      {/* My Pages - Main tab */}
      <Tabs.Screen
        name="my-pages"
        options={{
          headerTitle: () => <HeaderTitleWithCrown title="My Pages" />,
          headerTitleAlign: "center",
          title: "My Pages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />

      {/* Analytics - Main tab */}
      <Tabs.Screen
        name="analytics"
        options={{
          headerTitle: () => <HeaderTitleWithCrown title="Analytics" />,
          headerTitleAlign: "center",
          title: "Analytics",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Tools - Main tab */}
      <Tabs.Screen
        name="tools"
        options={{
          headerTitle: () => <HeaderTitleWithCrown title="Tools" />,
          headerTitleAlign: "center",
          title: "Tools",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ===== HIDDEN TABS ===== */}

      {/* Test tab - hidden (development only) */}
      <Tabs.Screen
        name="test"
        options={{
          href: null,
        }}
      />

      {/* My Business - hidden (single business mode) */}
      <Tabs.Screen
        name="my-business"
        options={{
          href: null,
        }}
      />

      {/* Wallet - hidden (feature disabled) */}
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crownIcon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  hamburgerButton: {
    marginRight: 16,
    padding: 4,
  },
});
