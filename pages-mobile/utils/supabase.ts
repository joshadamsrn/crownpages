import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })

/**
 * Generate a signed URL for private storage objects
 * @param path - The file path in storage (without bucket name)
 * @param expiry - Expiry time in seconds (default: 1 hour)
 * @returns Signed URL or null if error
 */
export const generateSignedUrl = async (path: string, expiry?: number) => {
  try {
    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUrl(path, expiry || 60 * 60);

    if (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

/**
 * Generate a public URL for public storage objects
 * @param path - The file path in storage (without bucket name)
 * @returns Public URL or null if error
 */
export const generatePublicUrl = (path: string) => {
  const { data } = supabase.storage
    .from("uploads")
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

/**
 * Construct a public storage URL directly (no async call needed)
 * This is faster for public content since it doesn't require an API call
 * @param path - The file path in storage (without bucket name)
 * @param bucketName - The storage bucket name (default: 'uploads')
 * @returns Complete public URL or null if invalid
 */
export const getPublicStorageUrl = (path: string | null, bucketName: string = 'uploads'): string | null => {
  if (!path) return null;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('EXPO_PUBLIC_SUPABASE_URL not found');
    return null;
  }

  // Handle cases where path might already be a full URL
  if (path.startsWith('http')) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Construct the public URL
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
}