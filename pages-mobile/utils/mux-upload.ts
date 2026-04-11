/**
 * Mux Direct Upload Utility
 *
 * All video uploads go through Mux — no local compression, no expo-video-thumbnails.
 * Mux handles transcoding, thumbnail generation, and CDN delivery.
 *
 * Flow:
 * 1. Call Supabase Edge Function `mux-create-upload` → get { uploadId, uploadUrl }
 * 2. PUT the raw video file to uploadUrl (Mux Direct Upload)
 * 3. Poll `mux-asset-status?uploadId=xxx` until status === 'ready'
 * 4. Return { muxUrl: 'mux:{playbackId}', thumbnail, playbackId }
 *
 * The `mux:{playbackId}` convention lets all video renderers know to use
 * Mux HLS streaming instead of a Supabase storage URL.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export interface MuxUploadResult {
  /** `mux:{playbackId}` — use this as the video URL in section data */
  muxUrl: string;
  /** Mux auto-generated thumbnail URL (always available once ready) */
  thumbnail: string;
  /** Raw Mux playback ID */
  playbackId: string;
  /** Mux upload ID (stored in mux_assets table) */
  uploadId: string;
}

export interface MuxUploadOptions {
  /** Local file URI to upload */
  uri: string;
  /** Progress callbacks */
  onUploadProgress?: (pct: number) => void;
  onProcessingUpdate?: (status: 'uploading' | 'processing') => void;
  /** Optional metadata to store with the asset */
  pageId?: string;
  sectionId?: string;
  /** Max polling attempts before giving up (default 60 = ~5 minutes) */
  maxPollAttempts?: number;
}

/**
 * Upload a video to Mux via Direct Upload.
 * Handles the full flow: create upload → PUT file → poll for ready.
 */
export async function uploadToMux(options: MuxUploadOptions): Promise<MuxUploadResult> {
  const {
    uri,
    onUploadProgress,
    onProcessingUpdate,
    pageId,
    sectionId,
    maxPollAttempts = 60,
  } = options;

  // Get the user's auth token to call our Edge Functions
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Must be logged in to upload videos');
  }

  onProcessingUpdate?.('uploading');

  // Step 1: Create a Mux Direct Upload via our Edge Function
  const createRes = await fetch(`${SUPABASE_URL}/functions/v1/mux-create-upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId, sectionId }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Mux upload: ${errText}`);
  }

  const { uploadId, uploadUrl } = await createRes.json();

  // Step 2: GET file info to build the upload request
  const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
  if (!fileInfo.exists) {
    throw new Error('Video file not found on device');
  }
  const fileSize = (fileInfo as { size?: number }).size ?? 0;

  // Step 3: PUT the raw video to Mux's Direct Upload URL
  // expo-file-system uploadAsync is best for large files (streams from disk)
  const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': 'video/*',
    },
    sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
  });

  if (uploadResult.status !== 200 && uploadResult.status !== 201) {
    throw new Error(`Mux upload failed with status ${uploadResult.status}`);
  }

  onUploadProgress?.(100);
  onProcessingUpdate?.('processing');

  // Step 4: Poll for asset to be ready
  let attempts = 0;
  while (attempts < maxPollAttempts) {
    await sleep(5000);
    attempts++;

    const statusRes = await fetch(
      `${SUPABASE_URL}/functions/v1/mux-asset-status?uploadId=${uploadId}`,
      {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      }
    );

    if (!statusRes.ok) {
      console.warn(`Mux status poll failed (attempt ${attempts})`);
      continue;
    }

    const statusData = await statusRes.json();

    if (statusData.status === 'ready' && statusData.playbackId) {
      return {
        muxUrl: `mux:${statusData.playbackId}`,
        thumbnail: statusData.thumbnail,
        playbackId: statusData.playbackId,
        uploadId,
      };
    }

    // Log progress for debugging
    console.log(`Mux asset status (attempt ${attempts}): ${statusData.status}`);
  }

  throw new Error('Mux video processing timed out. The video may still be processing — check back later.');
}

/**
 * Extract a Mux playback ID from a `mux:{playbackId}` URL string.
 * Returns null if the string is not a Mux URL.
 */
export function parseMuxUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('mux:')) return url.slice(4);
  return null;
}

/**
 * Check whether a URL is a Mux-hosted video.
 */
export function isMuxUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('mux:');
}

/**
 * Get the Mux thumbnail URL for a given playback ID or mux: URL.
 * @param playbackIdOrUrl - Either a raw playback ID or a `mux:{id}` string
 * @param time - Thumbnail time in seconds (default: 0)
 */
export function getMuxThumbnail(playbackIdOrUrl: string, time = 0): string {
  const playbackId = parseMuxUrl(playbackIdOrUrl) ?? playbackIdOrUrl;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`;
}

/**
 * Get the Mux HLS stream URL for a given playback ID or mux: URL.
 */
export function getMuxStreamUrl(playbackIdOrUrl: string): string {
  const playbackId = parseMuxUrl(playbackIdOrUrl) ?? playbackIdOrUrl;
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
