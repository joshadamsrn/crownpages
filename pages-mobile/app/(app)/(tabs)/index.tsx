import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Business check now happens at the app layout level
  // This just redirects to my-pages
  return <Redirect href="/(app)/(tabs)/my-pages" />;
} 