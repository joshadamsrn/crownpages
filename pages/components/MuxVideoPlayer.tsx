'use client';

import MuxPlayer from '@mux/mux-player-react';
import React, { useId } from 'react';

interface MuxVideoPlayerProps {
  /** Mux playback ID (NOT the `mux:` prefixed URL — just the ID itself) */
  playbackId: string;
  /** Optional poster/thumbnail URL (Mux auto-generates one if omitted) */
  poster?: string;
  className?: string;
  /** Whether to autoplay (default false) */
  autoPlay?: boolean;
  /** CSS aspect-ratio style (default '16/9') */
  aspectRatio?: string;
}

/**
 * Reusable Mux video player for the web renderer.
 * Uses @mux/mux-player-react which handles HLS, adaptive bitrate, and thumbnails.
 *
 * A blurred poster image sits behind the player as a CSS background. For landscape
 * videos it is fully hidden behind the video frame (no visual change). For vertical
 * (portrait) videos viewed in the 16:9 container it fills the side pillarbox bars,
 * matching the TikTok-style blurred background look.
 */
export function MuxVideoPlayer({
  playbackId,
  poster,
  className,
  autoPlay = false,
  aspectRatio = '16/9',
}: MuxVideoPlayerProps) {
  // useId generates ":r0:"-style strings; strip colons to get a valid CSS ID
  const rawId = useId();
  const wrapperId = `mux-${rawId.replace(/:/g, '')}`;

  const thumbnailUrl = poster ?? `https://image.mux.com/${playbackId}/thumbnail.jpg`;

  return (
    <div
      id={wrapperId}
      className={`mux-player-wrapper${className ? ` ${className}` : ''}`}
      style={{ position: 'relative', width: '100%', aspectRatio, overflow: 'hidden' }}
    >
      {/* Blurred poster fills pillarbox/letterbox areas for vertical videos.
          Invisible for landscape videos since the video frame covers it entirely.
          scale(1.1) hides the hard blur edge; overflow:hidden on the wrapper clips it. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${thumbnailUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(18px)',
          transform: 'scale(1.1)',
          opacity: 0.7,
          zIndex: 0,
        }}
      />
      <MuxPlayer
        playbackId={playbackId}
        streamType="on-demand"
        thumbnailTime={0}
        poster={thumbnailUrl}
        autoPlay={autoPlay}
        fullscreenElement={wrapperId}
        style={{
          aspectRatio,
          width: '100%',
          display: 'block',
          position: 'relative',
          zIndex: 1,
        } as any}
      />
    </div>
  );
}
