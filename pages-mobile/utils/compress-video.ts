import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'react-native-compressor';

const MIN_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB  — not worth compressing smaller files
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB — too large to compress on-device safely

/**
 * Compresses a video before upload.
 * - Skips compression for files under 5 MB (not worth the overhead).
 * - Skips compression for files over 500 MB (would tax the phone — uploads raw instead).
 *   TODO: files over 500 MB should go through server-side transcoding (Mux / Cloudflare Stream).
 * - Returns the compressed file URI on success.
 * - Returns the original URI unchanged if compression is skipped or fails (safe fallback).
 * - Progress callback is optional for UI feedback.
 * - Cleans up the compressed temp file after the caller is done by returning a cleanup fn.
 *   (Caller should call cleanupCompressed() after upload completes.)
 */
export async function compressVideo(
  uri: string,
  onProgress?: (progress: number) => void
): Promise<{ uri: string; cleanupCompressed: () => Promise<void> }> {
  const noop = async () => {};

  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    const fileSize = info.exists ? (info as { size?: number }).size ?? 0 : 0;

    if (fileSize > 0 && fileSize < MIN_SIZE_BYTES) {
      console.log(`🗜️ Skipping compression — file is ${(fileSize / 1024 / 1024).toFixed(1)} MB (under 5 MB threshold)`);
      return { uri, cleanupCompressed: noop };
    }

    if (fileSize > MAX_SIZE_BYTES) {
      console.log(`🗜️ Skipping compression — file is ${(fileSize / 1024 / 1024).toFixed(0)} MB (over 500 MB, uploading raw to avoid taxing device)`);
      return { uri, cleanupCompressed: noop };
    }

    console.log('🗜️ Starting video compression...');
    const compressed = await Video.compress(
      uri,
      {
        compressionMethod: 'auto',
        maxSize: 1280,
        bitrate: 2500000,
      },
      (progress) => {
        const pct = Math.round(progress * 100);
        console.log(`🗜️ Compression progress: ${pct}%`);
        onProgress?.(pct);
      }
    );
    console.log('✅ Video compression complete:', compressed);

    const cleanupCompressed = async () => {
      if (compressed !== uri) {
        try {
          await FileSystem.deleteAsync(compressed, { idempotent: true });
        } catch {
          // Non-critical — temp file will be cleaned up by OS eventually
        }
      }
    };

    return { uri: compressed, cleanupCompressed };
  } catch (error) {
    console.warn('⚠️ Video compression failed — using original:', error);
    return { uri, cleanupCompressed: noop };
  }
}
