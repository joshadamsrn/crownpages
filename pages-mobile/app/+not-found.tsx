import { Link, Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { openCrownPageInViewer, parseCrownPagesUrl } from '../utils/linkHandler';

export default function NotFoundScreen() {
  const pathname = usePathname();
  const [isProcessingCrownPage, setIsProcessingCrownPage] = useState(false);

  useEffect(() => {
    // Check if this looks like a Crown Pages URL path
    if (pathname && pathname !== '/+not-found') {
      console.log('Not-found screen checking path:', pathname);
      
      // Construct a potential Crown Pages URL from the path
      const rootUrl = (process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com').replace(/\/$/, '');
      const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
      const potentialUrl = `${rootUrl}${cleanPath}`;
      
      console.log('Checking if this is a Crown Pages URL:', potentialUrl);
      const parsedLink = parseCrownPagesUrl(potentialUrl);
      
      if (parsedLink.isValid) {
        console.log('Found valid Crown Pages link in not-found, redirecting:', potentialUrl);
        setIsProcessingCrownPage(true);
        
        // Small delay to avoid navigation conflicts
        setTimeout(() => {
          openCrownPageInViewer(potentialUrl);
        }, 100);
        return;
      }
    }
  }, [pathname]);

  // Show loading state while processing Crown Pages URL
  if (isProcessingCrownPage) {
    return (
      <>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Opening Crown Page...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/(app)/(tabs)/my-pages" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
}); 