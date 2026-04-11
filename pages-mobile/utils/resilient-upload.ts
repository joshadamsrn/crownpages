/**
 * Resilient File Upload Utility for Supabase Storage (React Native + Expo)
 * 
 * SOLUTION: Use Supabase's TUS Resumable Upload protocol
 * 
 * This is the ONLY method that works for large files in React Native without
 * loading the entire file into memory!
 * 
 * Key benefits:
 * - Uploads in 6MB chunks (memory-efficient)
 * - Resumable if interrupted
 * - Works with files of ANY size
 * - No OutOfMemoryError
 * 
 * @see https://supabase.com/docs/guides/storage/uploads/resumable-uploads
 * @module resilient-upload
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Upload } from 'tus-js-client';
import { supabase } from './supabase';

/**
 * Detailed progress information for uploads
 */
export interface UploadProgressInfo {
  /** Bytes uploaded so far */
  bytesUploaded: number;
  /** Total bytes to upload */
  bytesTotal: number;
  /** Percentage complete (0-100) */
  percentage: number;
}

/**
 * Configuration options for file upload
 */
export interface UploadOptions {
  /** The local file URI to upload */
  uri: string;
  /** The destination path in Supabase storage (without bucket name) */
  filePath: string;
  /** The MIME type of the file */
  contentType: string;
  /** The storage bucket name (default: 'uploads') */
  bucket?: string;
  /** Whether to upsert (overwrite) existing files (default: true) */
  upsert?: boolean;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Callback for upload progress (0-100) - DEPRECATED, use onProgressDetailed */
  onProgress?: (progress: number) => void;
  /** Callback for detailed upload progress with bytes information */
  onProgressDetailed?: (info: UploadProgressInfo) => void;
  /** Maximum file size in bytes (default: undefined - no frontend limit, backend enforced) */
  maxFileSize?: number;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** The storage path of the uploaded file */
  path: string;
  /** The full public URL of the uploaded file */
  publicUrl?: string;
}

/**
 * Error thrown during upload
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Format bytes to human-readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Upload a file to Supabase Storage using TUS Resumable Upload
 * 
 * This is the CORRECT solution for React Native large file uploads!
 * 
 * TUS protocol:
 * - Uploads in 6MB chunks (Supabase requirement)
 * - Streams from disk (NO memory loading!)
 * - Resumable if interrupted
 * - Works with files up to 50GB
 * 
 * @param options Upload configuration options
 * @returns Promise resolving to upload result
 * @throws UploadError if upload fails after all retries
 * 
 * @example
 * ```typescript
 * const result = await uploadToSupabase({
 *   uri: 'file:///path/to/video.mp4',
 *   filePath: 'user123/business456/page789/video.mp4',
 *   contentType: 'video/mp4',
 *   onProgress: (progress) => console.log(`Upload: ${progress}%`)
 * });
 * ```
 */
export async function uploadToSupabase(
  options: UploadOptions
): Promise<UploadResult> {
  const {
    uri,
    filePath,
    contentType,
    bucket = 'uploads',
    upsert = true,
    onProgress,
    onProgressDetailed,
    maxFileSize, // Optional frontend limit
  } = options;

  console.log('🚀 Starting TUS resumable upload:', { uri, filePath, contentType });

  // 1. Get file info
  let fileInfo: FileSystem.FileInfo;
  try {
    fileInfo = await FileSystem.getInfoAsync(uri);
  } catch (error: any) {
    throw new UploadError('Failed to get file info', 'FILE_INFO_ERROR', error);
  }

  if (!fileInfo.exists) {
    throw new UploadError('File does not exist', 'FILE_NOT_FOUND');
  }

  if (!fileInfo.size) {
    throw new UploadError('Could not determine file size', 'FILE_SIZE_UNKNOWN');
  }

  const fileSize = fileInfo.size;
  const fileSizeMB = fileSize / (1024 * 1024);
  const fileSizeGB = fileSizeMB / 1024;
  console.log(`📊 File size: ${formatBytes(fileSize)} (${fileSizeMB.toFixed(2)} MB, ${fileSizeGB.toFixed(3)} GB)`);

  // 2. Optional frontend file size check
  if (maxFileSize !== undefined && fileSize > maxFileSize) {
    const maxSizeMB = maxFileSize / (1024 * 1024);
    throw new UploadError(
      `File size (${fileSizeMB.toFixed(0)}MB) exceeds limit of ${maxSizeMB.toFixed(0)}MB. Please select a smaller file.`,
      'FILE_TOO_LARGE'
    );
  }

  // 3. Log file size info
  if (fileSizeMB > 6) {
    console.log('📊 File > 6MB: Using TUS resumable upload (recommended by Supabase)');
  }
  if (fileSizeMB > 100) {
    console.log('📊 Large file detected (>100MB). TUS will upload in 6MB chunks.');
  }

  // 4. Get Supabase session for authorization
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new UploadError('No active session. Please log in.', 'NO_SESSION');
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new UploadError('Supabase URL not configured', 'CONFIG_ERROR');
  }

  // Extract project ID from URL (e.g., https://abc123.supabase.co -> abc123)
  const projectId = supabaseUrl.replace('https://', '').split('.')[0];

  onProgress?.(5);

  // 5. Create file object for TUS (React Native format)
  // TUS client accepts { uri, name, type, size } in React Native
  const file = {
    uri,
    name: filePath.split('/').pop() || 'file',
    type: contentType,
    size: fileSize,
  };

  // 6. Upload using TUS protocol
  return new Promise((resolve, reject) => {
    const upload = new Upload(file as any, {
      // Use direct storage hostname for better performance
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      
      // Retry configuration
      retryDelays: [0, 3000, 5000, 10000, 20000],
      
      // Headers
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': upsert ? 'true' : 'false',
      },
      
      // Upload configuration
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      
      // Metadata
      metadata: {
        bucketName: bucket,
        objectName: filePath,
        contentType,
        cacheControl: '3600',
      },
      
      // CRITICAL: 6MB chunk size (Supabase requirement)
      chunkSize: 6 * 1024 * 1024,
      
      // Error handler
      onError: (error) => {
        console.error('❌ TUS upload error:', error);
        reject(new UploadError(
          `Upload failed: ${error.message || 'Unknown error'}`,
          'TUS_UPLOAD_ERROR',
          error
        ));
      },
      
      // Progress handler
      onProgress: (bytesUploaded, bytesTotal) => {
        // Cap percentage at 100% to prevent going over (TUS can sometimes report slightly more bytes)
        const rawPercentage = (bytesUploaded / bytesTotal) * 100;
        const percentage = Math.min(Math.round(rawPercentage), 100);
        
        console.log(`📤 Upload progress: ${percentage}% (${formatBytes(bytesUploaded)} / ${formatBytes(bytesTotal)})`);
        
        // Call legacy callback
        onProgress?.(percentage);
        
        // Call detailed callback with bytes information
        onProgressDetailed?.({
          bytesUploaded: Math.min(bytesUploaded, bytesTotal), // Cap bytes too
          bytesTotal,
          percentage,
        });
      },
      
      // Success handler
      onSuccess: () => {
        console.log('✅ TUS upload successful!');
        
        // Call legacy callback
        onProgress?.(100);
        
        // Call detailed callback with final progress
        onProgressDetailed?.({
          bytesUploaded: fileSize,
          bytesTotal: fileSize,
          percentage: 100,
        });
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        resolve({
          path: filePath,
          publicUrl: urlData?.publicUrl,
        });
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        console.log('🔄 Resuming previous upload...');
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      
      console.log('☁️ Starting TUS upload...');
      console.log('✅ File will be uploaded in 6MB chunks (no memory issues!)');
      upload.start();
    }).catch((error) => {
      console.error('❌ Failed to check previous uploads:', error);
      // Start upload anyway
      upload.start();
    });
  });
}

/**
 * Helper function to delete a file from Supabase Storage
 * 
 * @param path The file path in storage (without bucket name)
 * @param bucket The storage bucket name (default: 'uploads')
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function deleteFromSupabase(
  path: string,
  bucket: string = 'uploads'
): Promise<boolean> {
  try {
    console.log('🗑️ Deleting file from storage:', path);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('❌ Delete error:', error);
      return false;
    }

    console.log('✅ File deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Delete failed:', error);
    return false;
  }
}

/**
 * Helper function to normalize storage paths
 * Removes leading slashes and bucket name prefix if present
 */
export function normalizeStoragePath(path: string): string {
  if (!path) return '';
  
  // Remove leading slash
  let normalized = path.startsWith('/') ? path.slice(1) : path;
  
  // Remove bucket name prefix if present
  if (normalized.startsWith('uploads/')) {
    normalized = normalized.slice('uploads/'.length);
  }
  
  return normalized;
}

/**
 * Helper function to check if file size is within limit
 * 
 * @param uri File URI to check
 * @param maxSizeMB Maximum size in MB
 * @returns Object with isValid boolean and file size info
 */
export async function checkFileSize(
  uri: string,
  maxSizeMB?: number
): Promise<{
  isValid: boolean;
  sizeBytes: number;
  sizeMB: number;
  sizeGB: number;
  message?: string;
}> {
  let fileInfo: FileSystem.FileInfo;
  try {
    fileInfo = await FileSystem.getInfoAsync(uri);
  } catch (error) {
    return {
      isValid: false,
      sizeBytes: 0,
      sizeMB: 0,
      sizeGB: 0,
      message: 'File does not exist or cannot be accessed',
    };
  }

  if (!fileInfo.exists) {
    return {
      isValid: false,
      sizeBytes: 0,
      sizeMB: 0,
      sizeGB: 0,
      message: 'File does not exist',
    };
  }

  const sizeBytes = fileInfo.size || 0;
  const sizeMB = sizeBytes / (1024 * 1024);
  const sizeGB = sizeMB / 1024;

  if (maxSizeMB && sizeMB > maxSizeMB) {
    return {
      isValid: false,
      sizeBytes,
      sizeMB,
      sizeGB,
      message: `File size (${sizeMB.toFixed(0)}MB) exceeds limit of ${maxSizeMB}MB`,
    };
  }

  return {
    isValid: true,
    sizeBytes,
    sizeMB,
    sizeGB,
  };
}

/**
 * Get recommended max file size
 * 
 * With TUS resumable uploads, memory is NO LONGER a concern!
 * These limits are based on Supabase's default configuration.
 * 
 * @param conservative If true, returns 500MB. If false, returns 2GB (Supabase default).
 * @returns Recommended max file size in bytes
 */
export function getRecommendedMaxFileSize(conservative: boolean = false): number {
  if (conservative) {
    // Conservative: 500MB
    return 500 * 1024 * 1024;
  } else {
    // Supabase default limit: 2GB
    return 2 * 1024 * 1024 * 1024;
  }
}
