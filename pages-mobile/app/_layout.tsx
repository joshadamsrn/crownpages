import 'expo-dev-client';
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import Toast from 'react-native-toast-message';
import { AuthProvider } from "../contexts/AuthContext";
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { ViewPageProvider } from '../contexts/ViewPageContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// RevenueCat API Keys from environment variables
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUE_CAT_IOS;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID;

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize RevenueCat with better error handling
        await initializeRevenueCat();

        // You can add any other initialization logic here
        // For example: loading fonts, checking auth state, etc.

        // Simulate a brief loading time to ensure smooth transition
        // Reduce initialization delay to prevent not-found screen flash
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Separate function to initialize RevenueCat with proper error handling
  const initializeRevenueCat = async () => {
    try {
      // Check if RevenueCat is already configured to avoid unnecessary reconfigurations
      // which reset the user state back to anonymous
      try {
        await Purchases.getCustomerInfo();
        console.log('RevenueCat already configured, skipping reconfiguration');
        return;
      } catch (e) {
        // RevenueCat not configured yet, proceed with configuration
        console.log('RevenueCat not configured, proceeding with initialization...');
      }

      // Use ERROR level to avoid customLogHandler issues in Hermes engine
      // DEBUG and VERBOSE levels can cause "customLogHandler is not a function" errors
      // This keeps the logs clean while still showing critical errors
      Purchases.setLogLevel(LOG_LEVEL.ERROR);

      // Check if we have the required API keys
      if (Platform.OS === 'ios') {
        if (!REVENUECAT_IOS_API_KEY) {
          console.warn('EXPO_PUBLIC_REVENUE_CAT_IOS environment variable not set. Subscriptions will not work.');
          return;
        }
        console.log('Configuring RevenueCat for iOS...');
        await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
        console.log('RevenueCat configured successfully for iOS');
      } else if (Platform.OS === 'android') {
        if (!REVENUECAT_ANDROID_API_KEY) {
          console.warn('EXPO_PUBLIC_REVENUE_CAT_ANDROID environment variable not set. Subscriptions will not work.');
          return;
        }
        console.log('Configuring RevenueCat for Android...');
        await Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
        console.log('RevenueCat configured successfully for Android');
      } else {
        console.warn('Unsupported platform for RevenueCat:', Platform.OS);
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      // Don't throw the error - let the app continue without RevenueCat
    }
  };

  const onLayoutRootView = useCallback(() => {
    if (appIsReady) {
      // Hide the splash screen once the app is ready
      SplashScreen.hide();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ViewPageProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </View>
          <Toast />
        </ViewPageProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
