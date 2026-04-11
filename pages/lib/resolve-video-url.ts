'use client';

/**
 * Resolves a video URL to a concrete playable source.
 *
 * Handles three URL formats:
 * - `mux:{playbackId}` — Mux-hosted video (HLS stream)
 * - `https://...` or `http://...` — already a full URL (legacy Supabase public URLs)
 * - `path/to/file.mp4` — relative Supabase storage path
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export type ResolvedVideo =
  | { type: 'mux'; playbackId: string; thumbnail: string }
  | { type: 'direct'; src: string }
  | { type: 'supabase'; src: string };

export function resolveVideoUrl(url: string | null | undefined): ResolvedVideo | null {
  if (!url) return null;

  if (url.startsWith('mux:')) {
    const playbackId = url.slice(4);
    return {
      type: 'mux',
      playbackId,
      thumbnail: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
    };
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'direct', src: url };
  }

  return {
    type: 'supabase',
    src: `${SUPABASE_URL}/storage/v1/object/public/uploads/${url}`,
  };
}

/**
 * Returns true if the URL is a Mux-hosted video.
 */
export function isMuxUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith('mux:');
}
